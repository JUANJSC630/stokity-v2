<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StockMovementController extends Controller
{
    /**
     * Display a listing of stock movements.
     */
    public function index(Request $request): Response
    {
        $user = Auth::user();

        $query = StockMovement::with(['product', 'user', 'branch']);

        // Filtrar por sucursal si el usuario no es admin
        if (!$user->isAdmin()) {
            $query->where('branch_id', $user->branch_id);
        } elseif ($request->filled('branch')) {
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

        // Obtener productos disponibles
        $products = Product::where('status', true)
            ->when(!$user->isAdmin(), function ($query) use ($user) {
                return $query->where('branch_id', $user->branch_id);
            })
            ->with(['category', 'branch'])
            ->get();

        $branches = $user->isAdmin()
            ? Branch::where('status', true)->get()
            : Branch::where('id', $user->branch_id)->get();

        // Debug: verificar que los productos tienen las relaciones cargadas
        if ($selectedProduct) {
            \Log::info('Selected product loaded', [
                'product_id' => $selectedProduct->id,
                'product_name' => $selectedProduct->name,
                'category' => $selectedProduct->category ? $selectedProduct->category->name : 'null',
                'branch' => $selectedProduct->branch ? $selectedProduct->branch->name : 'null',
            ]);
        }

        return Inertia::render('stock-movements/create', [
            'products' => $products,
            'branches' => $branches,
            'selectedProduct' => $selectedProduct,
            'userBranchId' => $user->branch_id,
        ]);
    }

    /**
     * Store a newly created stock movement.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'type' => 'required|in:in,out,adjustment',
            'quantity' => 'required|integer|min:1',
            'unit_cost' => 'nullable|numeric|min:0',
            'reference' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
            'movement_date' => 'required|date',
        ]);

        $user = Auth::user();
        $product = Product::findOrFail($request->product_id);

        // Verificar permisos de sucursal
        if (!$user->isAdmin() && $product->branch_id !== $user->branch_id) {
            return redirect()->back()->with('error', 'No tienes permisos para modificar este producto.');
        }

        DB::transaction(function () use ($request, $user, $product) {
            $previousStock = $product->stock;
            $quantity = $request->quantity;

            // Calcular nuevo stock según el tipo de movimiento
            switch ($request->type) {
                case 'in':
                    $newStock = $previousStock + $quantity;
                    break;
                case 'out':
                    $newStock = max(0, $previousStock - $quantity);
                    break;
                case 'adjustment':
                    $newStock = $quantity; // Para ajustes, la cantidad es el nuevo valor
                    break;
            }

            // Crear el movimiento de stock
            StockMovement::create([
                'product_id' => $product->id,
                'user_id' => $user->id,
                'branch_id' => $product->branch_id,
                'type' => $request->type,
                'quantity' => $quantity,
                'previous_stock' => $previousStock,
                'new_stock' => $newStock,
                'unit_cost' => $request->unit_cost,
                'reference' => $request->reference,
                'notes' => $request->notes,
                'movement_date' => $request->movement_date,
            ]);

            // Actualizar el stock del producto
            $product->update(['stock' => $newStock]);
        });

        return redirect()->route('stock-movements.index')
            ->with('success', 'Movimiento de stock registrado exitosamente');
    }

    /**
     * Display the specified stock movement.
     */
    public function show(StockMovement $stockMovement): Response
    {
        $stockMovement->load(['product', 'user', 'branch']);

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

        // Debug: verificar el usuario y el producto
        \Log::info('ProductMovements called', [
            'user_id' => $user->id,
            'user_role' => $user->role,
            'product_id' => $product->id,
            'product_branch_id' => $product->branch_id,
            'user_branch_id' => $user->branch_id,
        ]);

        // Verificar permisos (temporalmente comentado para debugging)
        /*
        if (!$user->isAdmin() && $product->branch_id !== $user->branch_id) {
            \Log::warning('Access denied for product movements', [
                'user_id' => $user->id,
                'product_id' => $product->id,
                'user_branch' => $user->branch_id,
                'product_branch' => $product->branch_id,
            ]);
            abort(403);
        }
        */

        // Cargar las relaciones del producto
        $product->load(['category', 'branch']);

        // Debug: verificar que el producto tiene las relaciones cargadas
        \Log::info('Product loaded', [
            'product_id' => $product->id,
            'product_name' => $product->name,
            'category' => $product->category ? $product->category->name : 'null',
            'branch' => $product->branch ? $product->branch->name : 'null',
        ]);

        $movements = $product->stockMovements()
            ->with(['user', 'branch'])
            ->orderBy('movement_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        \Log::info('Movements loaded', [
            'movements_count' => $movements->count(),
            'total_movements' => $movements->total(),
        ]);

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
        if (!$user->isAdmin()) {
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
            'total_in' => $query->clone()->where('type', 'in')->sum('quantity'),
            'total_out' => $query->clone()->where('type', 'out')->sum('quantity'),
            'total_cost' => $query->clone()->whereNotNull('unit_cost')->sum(DB::raw('quantity * unit_cost')),
            'movements_by_type' => $query->clone()
                ->select('type', DB::raw('count(*) as count'))
                ->groupBy('type')
                ->pluck('count', 'type')
                ->toArray(),
        ];

        $branches = $user->isAdmin() ? Branch::where('status', true)->get() : collect();

        return Inertia::render('stock-movements/statistics', [
            'statistics' => $statistics,
            'branches' => $branches,
            'filters' => $request->only(['branch', 'start_date', 'end_date']),
        ]);
    }
}
