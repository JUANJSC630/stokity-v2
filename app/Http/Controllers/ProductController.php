<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductRequest;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use App\Services\BlobStorageService;
use App\Services\StockMovementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function __construct(
        private StockMovementService $stockMovements,
        private BlobStorageService $blob,
    ) {}

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Product::query();

        $with = ['branch', 'category'];

        $query->with($with);

        // Filtrar por sucursal del usuario si no es administrador
        $user = Auth::user();
        if (!$user->isAdmin() && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        // Búsqueda eficiente usando join
        if ($request->search) {
            $search = $request->search;
            $query->leftJoin('branches', 'products.branch_id', '=', 'branches.id')
                ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
                ->where(function ($q) use ($search) {
                    $q->where('products.name', 'like', "%{$search}%")
                        ->orWhere('products.code', 'like', "%{$search}%")
                        ->orWhere('products.description', 'like', "%{$search}%");
                })
                ->select('products.*');
        }

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('products.status', $request->status);
        }

        if ($request->category) {
            $query->where('category_id', $request->category);
        }

        // Solo permitir filtro por sucursal si es administrador
        if ($request->branch && $user->isAdmin()) {
            $query->where('branch_id', $request->branch);
        }

        $products = $query->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        $categories = Category::where('status', true)->get();
        
        // Solo mostrar todas las sucursales si es administrador
        $branches = $user->isAdmin() 
            ? Branch::where('status', true)->get()
            : Branch::where('id', $user->branch_id)->get();

        return Inertia::render('products/index', [
            'products' => $products,
            'categories' => $categories,
            'branches' => $branches,
            'filters' => $request->only(['search', 'status', 'category', 'branch']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $user = Auth::user();
        $categories = Category::where('status', true)->get();

        // If user is admin, get all branches, otherwise only user's branch
        $branches = $user->isAdmin()
            ? Branch::where('status', true)->get()
            : Branch::where('id', $user->branch_id)->get();

        return Inertia::render('products/create', [
            'categories' => $categories,
            'branches' => $branches,
            'userBranchId' => $user->branch_id,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(ProductRequest $request)
    {
        // Validar y obtener datos
        $validated = $request->validated();

        if ($request->hasFile('image')) {
            $validated['image'] = $this->blob->upload($request->file('image'), 'products');
        }

        $product = Product::create($validated);

        // Registrar en log - podría implementarse un sistema de auditoría aquí
        // Log::info('Product created', ['product_id' => $product->id, 'user_id' => Auth::id()]);

        // Redireccionar con mensaje de éxito
        return redirect()->route('products.index')
            ->with('success', 'Producto creado exitosamente');
    }

    /**
     * Display the specified resource.
     */
    public function show(Product $product)
    {
        // Cargar relaciones
        $product->load(['category', 'branch']);

        return Inertia::render('products/show', [
            'product' => $product
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Product $product)
    {
        $user = Auth::user();
        $categories = Category::where('status', true)->get();

        // If user is admin, get all branches, otherwise only user's branch
        $branches = $user->isAdmin()
            ? Branch::where('status', true)->get()
            : Branch::where('id', $user->branch_id)->get();

        return Inertia::render('products/edit', [
            'product' => $product,
            'categories' => $categories,
            'branches' => $branches,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(ProductRequest $request, Product $product)
    {
        // Validar y obtener datos
        $validated = $request->validated();

        if ($request->hasFile('image')) {
            // Delete old blob if it exists
            if ($product->image) {
                $this->blob->delete($product->image);
            }
            $validated['image'] = $this->blob->upload($request->file('image'), 'products');
        } else {
            unset($validated['image']);
        }

        // Actualizar el producto
        $product->update($validated);

        // Redireccionar con mensaje de éxito
        return redirect()->route('products.show', $product)
            ->with('success', 'Producto actualizado exitosamente');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Product $product)
    {
        $product->delete();

        return redirect()->route('products.index')
            ->with('success', 'Producto enviado a la papelera');
    }

    /**
     * Display a listing of trashed resources.
     */
    public function trashed(Request $request)
    {
        $query = Product::onlyTrashed()
            ->with(['category', 'branch'])
            ->orderBy('name');

        // Filter by search term
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Filter by category if requested
        if ($request->filled('category')) {
            $query->where('category_id', $request->category);
        }

        // Filter by branch if requested
        if ($request->filled('branch')) {
            $query->where('branch_id', $request->branch);
        } else {
            // If user is not admin and has a branch, show only products from that branch
            $user = Auth::user();
            if (!$user->isAdmin() && $user->branch_id) {
                $query->where('branch_id', $user->branch_id);
            }
        }

        $paginatedProducts = $query->paginate(10)->withQueryString();
        $categories = Category::all();
        $branches = Auth::user()->isAdmin() ? Branch::all() : [];

        $products = [
            'data' => $paginatedProducts->items(),
            'meta' => [
                'current_page' => $paginatedProducts->currentPage(),
                'last_page' => $paginatedProducts->lastPage(),
                'per_page' => $paginatedProducts->perPage(),
                'total' => $paginatedProducts->total(),
                'from' => $paginatedProducts->firstItem(),
                'to' => $paginatedProducts->lastItem(),
            ],
            'links' => $paginatedProducts->linkCollection()->toArray(),
        ];

        return Inertia::render('products/trashed', [
            'products' => $products,
            'categories' => $categories,
            'branches' => $branches,
            'filters' => $request->only(['search', 'category', 'branch']),
        ]);
    }

    /**
     * Restore the specified resource.
     */
    public function restore($id)
    {
        $product = Product::onlyTrashed()->findOrFail($id);
        $product->restore();

        return redirect()->route('products.trashed')
            ->with('success', 'Producto restaurado exitosamente');
    }

    /**
     * Force delete the specified resource.
     */
    public function forceDelete($id)
    {
        $product = Product::onlyTrashed()->findOrFail($id);

        if ($product->image) {
            $this->blob->delete($product->image);
        }

        $product->forceDelete();

        return redirect()->route('products.trashed')
            ->with('success', 'Producto eliminado permanentemente');
    }

    /**
     * Update product stock.
     */
    public function updateStock(Request $request, Product $product)
    {
        $request->validate([
            'stock' => 'required|integer|min:0',
            'operation' => 'required|in:set,add,subtract',
            'notes' => 'nullable|string|max:255',
        ]);

        $previousStock = $product->stock;

        $newStock = match ($request->operation) {
            'set'      => $request->stock,
            'add'      => $previousStock + $request->stock,
            'subtract' => max(0, $previousStock - $request->stock),
            default    => $previousStock,
        };

        $quantity = match ($request->operation) {
            'add'      => $request->stock,
            'subtract' => $previousStock - $newStock,
            default    => abs($newStock - $previousStock),
        };

        DB::transaction(function () use ($product, $previousStock, $newStock, $quantity, $request) {
            $product->stock = $newStock;
            $product->save();

            $this->stockMovements->record(
                product: $product,
                type: match ($request->operation) {
                    'add'      => 'in',
                    'subtract' => 'out',
                    default    => 'adjustment',
                },
                quantity: $quantity,
                previousStock: $previousStock,
                newStock: $newStock,
                branchId: $product->branch_id,
                userId: Auth::id(),
                notes: $request->notes,
            );
        });

        return redirect()->back()
            ->with('success', 'Stock actualizado correctamente');
    }

    /**
     * Search products by name or code — JSON API for POS search.
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate(['q' => 'required|string|min:2|max:100']);

        $user = Auth::user();

        $query = Product::where('status', true)
            ->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->q}%")
                    ->orWhere('code', 'like', "%{$request->q}%");
            });

        if (!$user->isAdmin() && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        $products = $query->orderBy('name')
            ->limit(30)
            ->get(['id', 'name', 'code', 'sale_price', 'stock', 'image', 'tax']);

        return response()->json($products);
    }

    /**
     * Genera un código de producto único de 8 dígitos por defecto
     */
    public function generateCode(Request $request)
    {
        // No es necesario el nombre, pero se valida por compatibilidad
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $maxAttempts = 20; // Aumentamos los intentos para mayor seguridad
        do {
            // Generar un número aleatorio de 8 dígitos
            $code = str_pad((string) rand(10000000, 99999999), 8, '0', STR_PAD_LEFT);
            $exists = Product::where('code', $code)->exists();
            $maxAttempts--;
        } while ($exists && $maxAttempts > 0);
        
        if ($maxAttempts <= 0) {
            return response()->json(['error' => 'No se pudo generar un código único de 8 dígitos.'], 500);
        }
        
        return response()->json(['code' => $code]);
    }
}
