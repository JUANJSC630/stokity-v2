<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Client;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Http\Resources\SaleResource;

class SaleController extends Controller
{
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

        $sales = $query->orderBy('date', 'desc')
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
        $branches = Branch::all();
        $clients = Client::orderBy('name')->get();
        $sellers = User::whereIn('role', ['administrador', 'encargado', 'vendedor'])->orderBy('name')->get();
        $products = collect();
        if ($request->filled('product_search')) {
            $search = $request->input('product_search');
            $products = Product::where('status', true)
                ->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%");
                })
                ->orderBy('name')
                ->limit(30)
                ->get();
        }
        return Inertia::render('sales/create', [
            'branches' => $branches,
            'clients' => $clients,
            'sellers' => $sellers,
            'products' => $products,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'client_id' => 'required|exists:clients,id',
            'seller_id' => 'required|exists:users,id',
            'tax' => 'required|numeric|min:0',
            'net' => 'required|numeric|min:0',
            'total' => 'required|numeric|min:0',
            'amount_paid' => 'required|numeric|min:0',
            'change_amount' => 'required|numeric|min:0',
            'payment_method' => 'required|string|in:cash,credit_card,debit_card,transfer,other',
            'date' => 'required|date',
            'status' => 'required|string|in:completed,pending,cancelled',
            'products' => 'required|array|min:1',
            'products.*.id' => 'required|exists:products,id',
            'products.*.quantity' => 'required|integer|min:1',
            'products.*.price' => 'required|numeric|min:0',
            'products.*.subtotal' => 'required|numeric|min:0',
        ]);

        // Verificar stock disponible
        foreach ($request->products as $index => $prod) {
            $product = Product::find($prod['id']);
            if (!$product || $product->stock < $prod['quantity']) {
                return back()->withErrors([
                    "products.{$index}.quantity" => "Stock insuficiente para {$product->name}. Disponible: {$product->stock}",
                ])->withInput();
            }
        }

        // Generar código único para la venta
        $validated['code'] = 'SALE-' . now()->format('YmdHis') . rand(100, 999);

        $products = $validated['products'];
        unset($validated['products']);

        $sale = Sale::create($validated);

        // Guardar productos vendidos y actualizar el stock
        foreach ($products as $prod) {
            $sale->saleProducts()->create([
                'product_id' => $prod['id'],
                'quantity' => $prod['quantity'],
                'price' => $prod['price'],
                'subtotal' => $prod['subtotal'],
            ]);

            // Actualizar el stock del producto
            $product = Product::find($prod['id']);
            if ($product) {
                $product->stock -= $prod['quantity'];
                $product->save();
            }
        }

        return redirect()->route('sales.index')->with('success', 'Venta creada exitosamente.');
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
            'net' => $sale->net,
            'total' => $sale->total,
            'amount_paid' => $sale->amount_paid,
            'change_amount' => $sale->change_amount,
            'payment_method' => $sale->payment_method,
            'date' => $sale->date,
            'status' => $sale->status,
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

        return Inertia::render('sales/show', [
            'sale' => $saleData,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Sale $sale)
    {
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
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'client_id' => 'required|exists:clients,id',
            'seller_id' => 'required|exists:users,id',
            'tax' => 'required|numeric|min:0',
            'net' => 'required|numeric|min:0',
            'total' => 'required|numeric|min:0',
            'payment_method' => 'required|string|in:cash,credit_card,debit_card,transfer,other',
            'date' => 'required|date',
            'status' => 'required|string|in:completed,pending,cancelled',
        ]);

        $sale->update($validated);

        return redirect()->route('sales.show', $sale)->with('success', 'Venta actualizada exitosamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Sale $sale)
    {
        // Restaurar el stock de los productos antes de eliminar la venta
        foreach ($sale->saleProducts as $saleProduct) {
            $product = Product::find($saleProduct->product_id);
            if ($product) {
                $product->stock += $saleProduct->quantity;
                $product->save();
            }
        }

        $sale->delete();

        return redirect()->route('sales.index')->with('success', 'Venta eliminada exitosamente.');
    }
}
