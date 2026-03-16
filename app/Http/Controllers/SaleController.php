<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\CashSession;
use App\Models\Client;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use App\Models\PaymentMethod;
use App\Services\StockMovementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Http\Resources\SaleResource;

class SaleController extends Controller
{
    public function __construct(private StockMovementService $stockMovements) {}

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Sale::query();

        // Solo cargar relaciones si no hay búsqueda, para la tabla
        $with = ['branch'];
        if (!$request->search) {
            $with[] = 'client';
            $with[] = 'seller';
        }
        $query->with($with);

        // Filtrar por sucursal del usuario si no es administrador
        $user = Auth::user();
        if (!$user->isAdmin() && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        // Búsqueda eficiente usando join
        if ($request->search) {
            $search = $request->search;
            $query->leftJoin('clients', 'sales.client_id', '=', 'clients.id')
                ->leftJoin('users as sellers', 'sales.seller_id', '=', 'sellers.id')
                ->where(function ($q) use ($search) {
                    $q->where('sales.code', 'like', "%{$search}%")
                        ->orWhere('clients.name', 'like', "%{$search}%")
                        ->orWhere('sellers.name', 'like', "%{$search}%");
                })
                ->select('sales.*');
            // Asegura que la relación client esté disponible en los resultados filtrados
            $query->with(['client']);
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }
        if ($request->date_from) {
            $query->whereDate('date', '>=', $request->date_from);
        }
        if ($request->date_to) {
            $query->whereDate('date', '<=', $request->date_to);
        }

        $sales = $query->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('sales/index', [
            'sales' => $sales,
            'filters' => $request->only(['search', 'status', 'date_from', 'date_to']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request)
    {
        $user = Auth::user();
        
        // Solo mostrar sucursales disponibles según el rol
        $branches = $user->isAdmin() 
            ? Branch::where('status', true)->get()
            : Branch::where('id', $user->branch_id)->get();
            
        $clients = Client::orderBy('name')->get();
        $sellers = User::whereIn('role', ['administrador', 'encargado', 'vendedor'])->orderBy('name')->get();

        return Inertia::render('sales/create', [
            'branches' => $branches,
            'clients'  => $clients,
            'sellers'  => $sellers,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $isPending = $request->input('status') === 'pending';

        // Validar sesión de caja si está habilitado (solo para ventas completadas)
        if (!$isPending) {
            $settings    = BusinessSetting::getSettings();
            $openSession = CashSession::getOpenForUser(Auth::id(), (int) $request->branch_id);
            if (!$openSession && $settings->require_cash_session) {
                return back()->withErrors(['session' => 'Debes abrir la caja antes de registrar una venta.']);
            }
        }

        // Obtener códigos de métodos de pago activos para validación
        $activePaymentMethods = PaymentMethod::where('is_active', true)->pluck('code')->toArray();

        $validated = $request->validate([
            'branch_id'      => 'required|exists:branches,id',
            'client_id'      => 'required|exists:clients,id',
            'seller_id'      => 'required|exists:users,id',
            'net'            => 'required|numeric|min:0',
            'total'          => 'required|numeric|min:0',
            'amount_paid'    => $isPending ? 'nullable|numeric|min:0' : 'required|numeric|min:0',
            'change_amount'  => $isPending ? 'nullable|numeric' : 'required|numeric',
            'payment_method' => $isPending ? 'nullable|string' : 'required|string|in:' . implode(',', $activePaymentMethods),
            'date'           => 'required|date',
            'status'         => 'required|string|in:completed,pending,cancelled',
            'discount_type'  => 'required|string|in:none,percentage,fixed',
            'discount_value' => 'required|numeric|min:0',
            'notes'          => 'nullable|string|max:500',
            'products'            => 'required|array|min:1',
            'products.*.id'       => 'required|exists:products,id',
            'products.*.quantity' => 'required|integer|min:1',
            'products.*.price'    => 'required|numeric|min:0',
            'products.*.subtotal' => 'required|numeric|min:0',
        ], [
            'payment_method.in' => 'El método de pago seleccionado no es válido. Por favor, selecciona un método de pago válido.',
        ]);

        // Verificar stock disponible y calcular impuesto por producto
        $totalTax = 0;
        foreach ($request->products as $index => $prod) {
            $product = Product::find($prod['id']);
            if (!$product || $product->stock < $prod['quantity']) {
                return back()->withErrors([
                    "products.{$index}.quantity" => "Stock insuficiente para {$product->name}. Disponible: {$product->stock}",
                ])->withInput();
            }

            // Calcular impuesto por producto
            $productTax = $product->tax ?? 0;
            $productTaxAmount = $prod['subtotal'] * ($productTax / 100);
            $totalTax += $productTaxAmount;
        }

        // Calcular descuento server-side
        $gross = $validated['net'] + $totalTax;
        $discountAmount = match ($validated['discount_type']) {
            'percentage' => round($gross * ($validated['discount_value'] / 100), 2),
            'fixed'      => min($validated['discount_value'], $gross),
            default      => 0,
        };

        // Generar código único para la venta (solo números del timestamp)
        $validated['code']            = now()->format('YmdHis') . rand(100, 999);
        $validated['tax']             = $totalTax;
        $validated['discount_amount'] = $discountAmount;
        $validated['total']           = max(0, $gross - $discountAmount);

        // For pending sales, replace null payment fields with safe defaults
        if ($isPending) {
            $validated['payment_method'] = $validated['payment_method'] ?? '';
            $validated['amount_paid']    = $validated['amount_paid']    ?? 0;
            $validated['change_amount']  = $validated['change_amount']  ?? 0;
        }

        // Attach open cash session if available
        if (!$isPending) {
            $openSession = $openSession ?? CashSession::getOpenForUser(Auth::id(), (int) $validated['branch_id']);
            $validated['session_id'] = $openSession?->id;
        }

        $products = $validated['products'];
        unset($validated['products']);

        $saleId   = null;
        $saleCode = null;
        try {
        DB::transaction(function () use ($validated, $products, $isPending, &$saleId, &$saleCode) {
            $sale     = Sale::create($validated);
            $saleId   = $sale->id;
            $saleCode = $sale->code;

            foreach ($products as $prod) {
                $sale->saleProducts()->create([
                    'product_id' => $prod['id'],
                    'quantity'   => $prod['quantity'],
                    'price'      => $prod['price'],
                    'subtotal'   => $prod['subtotal'],
                ]);

                // Solo descontar stock en ventas completadas
                if (!$isPending) {
                    // lockForUpdate() acquires a row-level DB lock, preventing
                    // concurrent transactions from reading or modifying this
                    // product's stock until this transaction commits or rolls back.
                    $product = Product::lockForUpdate()->find($prod['id']);
                    if ($product) {
                        // Re-check stock inside the lock — the pre-check above
                        // can be stale if another transaction ran concurrently.
                        if ($product->stock < $prod['quantity']) {
                            throw new \RuntimeException(
                                "Stock insuficiente para {$product->name}. Disponible: {$product->stock}"
                            );
                        }

                        $previousStock  = $product->stock;
                        $product->stock -= $prod['quantity'];
                        $product->save();

                        $this->stockMovements->record(
                            product: $product,
                            type: 'out',
                            quantity: $prod['quantity'],
                            previousStock: $previousStock,
                            newStock: $product->stock,
                            branchId: $sale->branch_id,
                            userId: Auth::id(),
                            reference: $sale->code,
                            notes: "Venta #{$sale->code}",
                        );
                    }
                }
            }
        });
        } catch (\RuntimeException $e) {
            return back()->withErrors(['stock' => $e->getMessage()])->withInput();
        }

        // Si la venta viene del POS, redirigir al POS
        if ($request->input('source') === 'pos') {
            if ($isPending) {
                return redirect()->route('pos.index')
                    ->with('success', 'Cotización guardada exitosamente.');
            }
            return redirect()->route('pos.index')
                ->with('last_sale_id', $saleId)
                ->with('last_sale_code', $saleCode)
                ->with('success', 'Venta registrada exitosamente.');
        }

        return redirect()->route('sales.index')->with('success', 'Venta creada exitosamente.');
    }

    /**
     * Return pending sales for the current user's branch (JSON).
     */
    public function pendingForBranch(Request $request)
    {
        $user = Auth::user();

        $query = Sale::with(['client:id,name', 'saleProducts.product:id,name,tax,stock,image'])
            ->where('status', 'pending');

        if (!$user->isAdmin() && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        $sales = $query->orderBy('created_at', 'desc')->get()
            ->map(fn($sale) => [ // @phpstan-ignore return.type, argument.type
                'id'            => $sale->id,
                'code'          => $sale->code,
                'client_id'     => $sale->client_id,
                'client_name'   => $sale->client?->name ?? 'Consumidor Final',
                'discount_type'  => $sale->discount_type,
                'discount_value' => $sale->discount_value,
                'product_count' => $sale->saleProducts->count(),
                'net'           => $sale->net,
                'total'         => $sale->total,
                'notes'         => $sale->notes,
                'created_at'    => $sale->created_at,
                'products'      => $sale->saleProducts->map(fn($sp) => [
                    'product_id'   => $sp->product_id,
                    'product_name' => $sp->product?->name,
                    'quantity'     => $sp->quantity,
                    'price'        => $sp->price,
                    'subtotal'     => $sp->subtotal,
                    'tax'          => $sp->product?->tax ?? 0,
                    'stock'        => $sp->product?->stock,
                    'image_url'    => $sp->product?->image_url ?? null,
                ]),
            ]);

        return response()->json($sales);
    }

    /**
     * Complete a pending sale (charge it).
     */
    public function completePending(Request $request, Sale $sale)
    {
        if ($sale->status !== 'pending') {
            abort(422, 'Esta venta ya fue procesada.');
        }

        $user = Auth::user();
        if (!$user->isAdmin() && $sale->branch_id !== $user->branch_id) {
            abort(403, 'No tienes acceso a esta cotización.');
        }

        $activePaymentMethods = PaymentMethod::where('is_active', true)->pluck('code')->toArray();

        $validated = $request->validate([
            'payment_method'      => 'required|string|in:' . implode(',', $activePaymentMethods),
            'amount_paid'         => 'required|numeric|min:0',
            'change_amount'       => 'required|numeric',
            'net'                 => 'required|numeric|min:0',
            'total'               => 'required|numeric|min:0',
            'discount_type'       => 'nullable|string|in:none,percentage,fixed',
            'discount_value'      => 'nullable|numeric|min:0',
            'products'            => 'required|array|min:1',
            'products.*.id'       => 'required|exists:products,id',
            'products.*.quantity' => 'required|integer|min:1',
            'products.*.price'    => 'required|numeric|min:0',
            'products.*.subtotal' => 'required|numeric|min:0',
        ], [
            'payment_method.in' => 'El método de pago seleccionado no es válido.',
        ]);

        $products = $validated['products'];

        // Validar sesión de caja si está habilitado
        $settings    = BusinessSetting::getSettings();
        $openSession = CashSession::getOpenForUser(Auth::id(), $sale->branch_id);
        if (!$openSession && $settings->require_cash_session) {
            return back()->withErrors(['session' => 'Debes abrir la caja antes de registrar una venta.']);
        }

        // Verificar stock con los productos actuales del carrito
        foreach ($products as $prod) {
            $product = Product::find($prod['id']);
            if (!$product || $product->stock < $prod['quantity']) {
                return back()->withErrors([
                    'stock' => "Stock insuficiente para {$product->name}. Disponible: {$product->stock}",
                ]);
            }
        }

        try {
        DB::transaction(function () use ($sale, $validated, $products, $openSession) {
            $sale->update([
                'payment_method' => $validated['payment_method'],
                'amount_paid'    => $validated['amount_paid'],
                'change_amount'  => $validated['change_amount'],
                'net'            => $validated['net'],
                'total'          => $validated['total'],
                'discount_type'  => $validated['discount_type'] ?? 'none',
                'discount_value' => $validated['discount_value'] ?? 0,
                'status'         => 'completed',
                'date'           => now()->setTimezone('America/Bogota')->format('Y-m-d H:i'),
                'session_id'     => $openSession?->id,
            ]);

            // Replace products with current cart
            $sale->saleProducts()->delete();
            foreach ($products as $prod) {
                $sale->saleProducts()->create([
                    'product_id' => $prod['id'],
                    'quantity'   => $prod['quantity'],
                    'price'      => $prod['price'],
                    'subtotal'   => $prod['subtotal'],
                ]);

                $product = Product::lockForUpdate()->find($prod['id']);
                if ($product) {
                    if ($product->stock < $prod['quantity']) {
                        throw new \RuntimeException(
                            "Stock insuficiente para {$product->name}. Disponible: {$product->stock}"
                        );
                    }

                    $previousStock  = $product->stock;
                    $product->stock -= $prod['quantity'];
                    $product->save();

                    $this->stockMovements->record(
                        product: $product,
                        type: 'out',
                        quantity: $prod['quantity'],
                        previousStock: $previousStock,
                        newStock: $product->stock,
                        branchId: $sale->branch_id,
                        userId: Auth::id(),
                        reference: $sale->code,
                        notes: "Venta #{$sale->code}",
                    );
                }
            }
        });
        } catch (\RuntimeException $e) {
            return back()->withErrors(['stock' => $e->getMessage()]);
        }

        return redirect()->route('pos.index')
            ->with('last_sale_id', $sale->id)
            ->with('last_sale_code', $sale->code)
            ->with('success', 'Venta completada exitosamente.');
    }

    /**
     * Update products of an existing pending sale (quote).
     */
    public function updatePending(Request $request, Sale $sale)
    {
        if ($sale->status !== 'pending') {
            abort(422, 'Solo se pueden editar cotizaciones pendientes.');
        }

        $user = Auth::user();
        if (!$user->isAdmin() && $sale->branch_id !== $user->branch_id) {
            abort(403, 'No tienes acceso a esta cotización.');
        }

        $validated = $request->validate([
            'net'            => 'required|numeric|min:0',
            'total'          => 'required|numeric|min:0',
            'discount_type'  => 'nullable|string|in:none,percentage,fixed',
            'discount_value' => 'nullable|numeric|min:0',
            'products'       => 'required|array|min:1',
            'products.*.id'       => 'required|exists:products,id',
            'products.*.quantity' => 'required|integer|min:1',
            'products.*.price'    => 'required|numeric|min:0',
            'products.*.subtotal' => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($sale, $validated) {
            $sale->update([
                'net'            => $validated['net'],
                'total'          => $validated['total'],
                'discount_type'  => $validated['discount_type'] ?? 'none',
                'discount_value' => $validated['discount_value'] ?? 0,
            ]);

            // Replace products
            $sale->saleProducts()->delete();
            foreach ($validated['products'] as $prod) {
                $sale->saleProducts()->create([
                    'product_id' => $prod['id'],
                    'quantity'   => $prod['quantity'],
                    'price'      => $prod['price'],
                    'subtotal'   => $prod['subtotal'],
                ]);
            }
        });

        return redirect()->route('pos.index')->with('success', 'Cotización actualizada.');
    }

    /**
     * Delete a pending sale (quote).
     */
    public function destroyPending(Sale $sale)
    {
        if ($sale->status !== 'pending') {
            abort(422, 'Solo se pueden eliminar cotizaciones pendientes.');
        }

        $user = Auth::user();
        if (!$user->isAdmin() && $sale->branch_id !== $user->branch_id) {
            abort(403, 'No tienes acceso a esta cotización.');
        }

        $sale->saleProducts()->delete();
        $sale->forceDelete();

        return redirect()->route('pos.index')->with('success', 'Cotización eliminada.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Sale $sale)
    {
        // Cargar relaciones necesarias, incluyendo devoluciones y productos devueltos
        $sale->load([
            'branch.manager',
            'branch',
            'client',
            'seller',
            'saleProducts.product',
            'saleReturns.products',
        ]);

        $saleData = [
            'id' => $sale->id,
            'branch_id' => $sale->branch_id,
            'code' => $sale->code,
            'client_id' => $sale->client_id,
            'seller_id' => $sale->seller_id,
            'tax' => $sale->tax,
            'discount_type' => $sale->discount_type,
            'discount_value' => $sale->discount_value,
            'discount_amount' => $sale->discount_amount,
            'net' => $sale->net,
            'total' => $sale->total,
            'amount_paid' => $sale->amount_paid,
            'change_amount' => $sale->change_amount,
            'payment_method' => $sale->payment_method,
            'date' => $sale->date,
            'status' => $sale->status,
            'notes' => $sale->notes,
            'created_at' => $sale->created_at,
            'updated_at' => $sale->updated_at,
            'branch' => $sale->branch ? [
                'id' => $sale->branch->id,
                'name' => $sale->branch->name,
                'manager' => $sale->branch->manager ? $sale->branch->manager->name : null,
                'address' => $sale->branch->address,
                'phone' => $sale->branch->phone,
                'email' => $sale->branch->email,
                'status' => $sale->branch->status,
                'business_name' => $sale->branch->business_name ?? null,
            ] : null,
            'client' => $sale->client,
            'seller' => $sale->seller,
            'saleProducts' => $sale->saleProducts->map(function ($saleProduct) {
                return [
                    'id' => $saleProduct->id,
                    'sale_id' => $saleProduct->sale_id,
                    'product_id' => $saleProduct->product_id,
                    'quantity' => $saleProduct->quantity,
                    'price' => $saleProduct->price,
                    'subtotal' => $saleProduct->subtotal,
                    'product' => $saleProduct->product ? [
                        'id' => $saleProduct->product->id,
                        'name' => $saleProduct->product->name,
                        'code' => $saleProduct->product->code,
                        'tax' => $saleProduct->product->tax,
                    ] : null,
                ];
            })->toArray(),
            // Agregar historial de devoluciones
            'saleReturns' => $sale->saleReturns->map(function ($saleReturn) {
                return [
                    'id' => $saleReturn->id,
                    'reason' => $saleReturn->reason,
                    'created_at' => $saleReturn->created_at,
                    'products' => $saleReturn->products->map(function ($product) {
                        return [
                            'id' => $product->id,
                            'name' => $product->name,
                            'pivot' => [
                                'quantity' => $product->pivot->quantity,
                            ],
                        ];
                    })->toArray(),
                ];
            })->toArray(),
        ];

        $business = \App\Models\BusinessSetting::getSettings();

        return Inertia::render('sales/show', [
            'sale'             => $saleData,
            'businessName'     => $business->name,
            'businessNit'      => $business->nit,
            'businessAddress'  => $business->address,
            'businessPhone'    => $business->phone,
            'businessLogoUrl'  => $business->logo_url,
            'ticketConfig'     => $business->getTicketConfig(),
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Sale $sale)
    {
        // Verificar que el usuario sea administrador
        if (!auth()->user()->isAdmin()) {
            abort(403, 'No tienes permisos para editar ventas.');
        }

        $branches = Branch::all();
        $clients = Client::orderBy('name')->get();
        $sellers = User::whereIn('role', ['administrador', 'encargado', 'vendedor'])->orderBy('name')->get();

        return Inertia::render('sales/edit', [
            'sale' => $sale,
            'branches' => $branches,
            'clients' => $clients,
            'sellers' => $sellers,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Sale $sale)
    {
        // Verificar que el usuario sea administrador
        if (!auth()->user()->isAdmin()) {
            abort(403, 'No tienes permisos para editar ventas.');
        }

        // Obtener códigos de métodos de pago activos para validación
        $activePaymentMethods = PaymentMethod::where('is_active', true)->pluck('code')->toArray();
        
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'client_id' => 'required|exists:clients,id',
            'seller_id' => 'required|exists:users,id',
            'tax' => 'required|numeric|min:0',
            'net' => 'required|numeric|min:0',
            'total' => 'required|numeric|min:0',
            'payment_method' => 'required|string|in:' . implode(',', $activePaymentMethods),
            'date' => 'required|date',
            'status' => 'required|string|in:completed,pending,cancelled',
        ], [
            'payment_method.in' => 'El método de pago seleccionado no es válido. Por favor, selecciona un método de pago válido.',
        ]);

        $sale->update($validated);

        return redirect()->route('sales.show', $sale)->with('success', 'Venta actualizada exitosamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Sale $sale)
    {
        // Verificar que el usuario sea administrador
        if (!auth()->user()->isAdmin()) {
            abort(403, 'No tienes permisos para eliminar ventas.');
        }

        DB::transaction(function () use ($sale) {
            foreach ($sale->saleProducts as $saleProduct) {
                $product = Product::find($saleProduct->product_id);
                if ($product) {
                    $previousStock = $product->stock;
                    $product->stock += $saleProduct->quantity;
                    $product->save();

                    $this->stockMovements->record(
                        product: $product,
                        type: 'in',
                        quantity: $saleProduct->quantity,
                        previousStock: $previousStock,
                        newStock: $product->stock,
                        branchId: $sale->branch_id,
                        userId: Auth::id(),
                        reference: $sale->code,
                        notes: "Cancelación venta #{$sale->code}",
                    );
                }
            }

            $sale->delete();
        });

        return redirect()->route('sales.index')->with('success', 'Venta eliminada exitosamente.');
    }
}
