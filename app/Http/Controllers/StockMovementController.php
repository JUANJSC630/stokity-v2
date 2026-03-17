<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Services\StockMovementService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StockMovementController extends Controller
{
    public function __construct(private StockMovementService $stockMovements) {}

    /**
     * Display a listing of stock movements.
     */
    public function index(Request $request): Response
    {
        $user = Auth::user();

        $query = StockMovement::with(['product', 'user', 'branch']);

        // Filtrar por sucursal si el usuario no es administrador
        if (!$user->isAdmin() && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        } elseif ($request->filled('branch') && $user->isAdmin()) {
            $query->where('branch_id', $request->branch);
        }

        // Filtrar por producto
        if ($request->filled('product')) {
            $query->where('product_id', $request->product);
        }

        // Filtrar por tipo de movimiento
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        // Filtrar por rango de fechas
        if ($request->filled('start_date')) {
            $query->whereDate('movement_date', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('movement_date', '<=', $request->end_date);
        }

        // Búsqueda por referencia o notas
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%")
                    ->orWhereHas('product', function ($productQuery) use ($search) {
                        $productQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%");
                    });
            });
        }

        $movements = $query->orderBy('movement_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        $branches = $user->isAdmin() ? Branch::where('status', true)->get() : collect();
        $products = Product::where('status', true)->get();

        return Inertia::render('stock-movements/index', [
            'movements' => $movements,
            'branches' => $branches,
            'products' => $products,
            'filters' => $request->only(['search', 'type', 'branch', 'product', 'start_date', 'end_date']),
        ]);
    }

    /**
     * Show the form for creating a new stock movement.
     */
    public function create(Request $request): Response
    {
        $user = Auth::user();

        // Si se proporciona un producto específico
        $selectedProduct = null;
        if ($request->filled('product_id')) {
            $selectedProduct = Product::with(['category', 'branch'])->find($request->product_id);
        }

        $branches = $user->isAdmin() || $user->isManager()
            ? Branch::where('status', true)->get()
            : Branch::where('id', $user->branch_id)->get();

        return Inertia::render('stock-movements/create', [
            'branches'        => $branches,
            'selectedProduct' => $selectedProduct,
            'userBranchId'    => $user->branch_id,
            'selectedType'    => $request->input('type', 'in'),
            'now'             => now()->format('Y-m-d\TH:i'),
            'suppliers'       => Supplier::when(!$user->isAdmin() && $user->branch_id, fn($q) => $q->where('branch_id', $user->branch_id))
                                    ->where('status', true)
                                    ->orderBy('name')
                                    ->get(['id', 'name']),
        ]);
    }

    /**
     * Store a newly created stock movement.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'product_id'    => 'required|exists:products,id',
            'type'          => 'required|in:in,out,adjustment,purchase,write_off,supplier_return',
            'quantity'      => [
                'required', 'integer',
                $request->input('type') === 'adjustment' ? 'min:0' : 'min:1',
            ],
            'unit_cost'     => 'nullable|numeric|min:0',
            'supplier_id'   => 'nullable|exists:suppliers,id',
            'reference'     => 'nullable|string|max:255',
            'notes'         => 'nullable|string|max:1000',
            'movement_date' => 'required|date',
        ]);

        $user = Auth::user();
        $product = Product::findOrFail($request->product_id);

        // Verificar permisos de sucursal
        if (!$user->isAdmin() && !$user->isManager() && $product->branch_id !== $user->branch_id) {
            return redirect()->back()->with('error', 'No tienes permisos para modificar este producto.');
        }

        DB::transaction(function () use ($request, $user, $product) {
            // Re-read with row lock to prevent race conditions with concurrent sales
            $locked        = Product::lockForUpdate()->findOrFail($product->id);
            $previousStock = $locked->stock;
            $quantity      = $request->quantity;

            $newStock = match ($request->type) {
                'in', 'purchase'                          => $previousStock + $quantity,
                'out', 'write_off', 'supplier_return'     => max(0, $previousStock - $quantity),
                'adjustment'                              => $quantity,
                default                                   => $previousStock,
            };

            $supplierId = $request->supplier_id ? (int) $request->supplier_id : null;

            $this->stockMovements->record(
                product:       $locked,
                type:          $request->type,
                quantity:      $quantity,
                previousStock: $previousStock,
                newStock:      $newStock,
                branchId:      $locked->branch_id,
                userId:        $user->id,
                reference:     $request->reference,
                notes:         $request->notes,
                supplierId:    $supplierId,
                unitCost:      $request->unit_cost !== null ? (float) $request->unit_cost : null,
                movementDate:  $request->movement_date,
            );

            // Auto-vincular producto al proveedor en el pivot cuando es una compra o entrada con proveedor
            if ($supplierId && in_array($request->type, ['purchase', 'in'])) {
                if (!$locked->suppliers()->where('supplier_id', $supplierId)->exists()) {
                    $locked->suppliers()->attach($supplierId, [
                        'purchase_price' => $request->unit_cost !== null ? (float) $request->unit_cost : null,
                        'supplier_code'  => null,
                        'is_default'     => false,
                    ]);
                }
            }

            $locked->update(['stock' => $newStock]);
        });

        return redirect()->route('stock-movements.index')
            ->with('success', 'Movimiento de stock registrado exitosamente');
    }

    /**
     * Display the specified stock movement.
     */
    public function show(StockMovement $stockMovement): Response
    {
        $stockMovement->load(['product', 'user', 'branch', 'supplier']);

        return Inertia::render('stock-movements/show', [
            'movement' => $stockMovement,
        ]);
    }

    /**
     * Get stock movements for a specific product.
     */
    public function productMovements(Request $request, Product $product): Response
    {
        $user = Auth::user();

        abort_if(!$user->isAdmin() && $product->branch_id !== $user->branch_id, 403);

        $product->load(['category', 'branch']);

        $movements = $product->stockMovements()
            ->with(['user', 'branch', 'supplier'])
            ->orderBy('movement_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('stock-movements/product-movements', [
            'product' => $product,
            'movements' => $movements,
        ]);
    }

    /**
     * Get stock movement statistics.
     */
    public function statistics(Request $request): Response
    {
        $user = Auth::user();

        $query = StockMovement::query();

        // Filtrar por sucursal si el usuario no es admin
        if (!$user->isAdmin() && !$user->isManager()) {
            $query->where('branch_id', $user->branch_id);
        } elseif ($request->filled('branch')) {
            $query->where('branch_id', $request->branch);
        }

        // Filtrar por rango de fechas
        if ($request->filled('start_date')) {
            $query->whereDate('movement_date', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('movement_date', '<=', $request->end_date);
        }

        $statistics = [
            'total_movements' => $query->count(),
            'total_in'  => $query->clone()->whereIn('type', ['in', 'purchase'])->sum('quantity'),
            'total_out' => $query->clone()->whereIn('type', ['out', 'write_off', 'supplier_return'])->sum('quantity'),
            'total_cost' => $query->clone()->whereNotNull('unit_cost')->sum(DB::raw('quantity * unit_cost')),
            'movements_by_type' => $query->clone()
                ->select('type', DB::raw('count(*) as count'))
                ->groupBy('type')
                ->pluck('count', 'type')
                ->toArray(),
        ];

        $branches = $user->isAdmin() || $user->isManager() ? Branch::where('status', true)->get() : collect();

        return Inertia::render('stock-movements/statistics', [
            'statistics' => $statistics,
            'branches' => $branches,
            'filters' => $request->only(['branch', 'start_date', 'end_date']),
        ]);
    }
}
