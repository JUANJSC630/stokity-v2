<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductRequest;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $query = Product::query()
            ->with(['category', 'branch'])
            ->orderBy('name');

        // Filter by status if requested
        if ($request->has('status')) {
            $query->where('status', $request->boolean('status'));
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

        // Filter by search term
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $paginatedProducts = $query->paginate(10)->withQueryString();
        $categories = Category::where('status', true)->get();
        $branches = Auth::user()->isAdmin() ? Branch::where('status', true)->get() : [];
        
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
    public function create(): Response
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
    public function store(ProductRequest $request): RedirectResponse
    {
        // Validar y obtener datos
        $validated = $request->validated();

        // Manejar la imagen si existe
        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $filename = time() . '_' . Str::slug($request->name) . '.' . $file->getClientOriginalExtension();
            $file->move(public_path('uploads/products'), $filename);
            $validated['image'] = $filename;
        }

        // Crear el producto
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
    public function show(Product $product): Response
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
    public function edit(Product $product): Response
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
    public function update(ProductRequest $request, Product $product): RedirectResponse
    {
        // Validar y obtener datos
        $validated = $request->validated();

        // Manejar la imagen si existe
        if ($request->hasFile('image')) {
            // Eliminar imagen anterior si existe
            if ($product->image && file_exists(public_path('uploads/products/' . $product->image))) {
                unlink(public_path('uploads/products/' . $product->image));
            }

            // Guardar nueva imagen
            $file = $request->file('image');
            $filename = time() . '_' . Str::slug($request->name) . '.' . $file->getClientOriginalExtension();
            $file->move(public_path('uploads/products'), $filename);
            $validated['image'] = $filename;
        }

        // Actualizar el producto
        $product->update($validated);

        // Redireccionar con mensaje de éxito
        return redirect()->route('products.index')
            ->with('success', 'Producto actualizado exitosamente');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Product $product): RedirectResponse
    {
        $product->delete();

        return redirect()->route('products.index')
            ->with('success', 'Producto enviado a la papelera');
    }

    /**
     * Display a listing of trashed resources.
     */
    public function trashed(Request $request): Response
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
    public function restore($id): RedirectResponse
    {
        $product = Product::onlyTrashed()->findOrFail($id);
        $product->restore();

        return redirect()->route('products.trashed')
            ->with('success', 'Producto restaurado exitosamente');
    }

    /**
     * Force delete the specified resource.
     */
    public function forceDelete($id): RedirectResponse
    {
        $product = Product::onlyTrashed()->findOrFail($id);

        // Eliminar imagen si existe
        if ($product->image && file_exists(public_path('uploads/products/' . $product->image))) {
            unlink(public_path('uploads/products/' . $product->image));
        }

        $product->forceDelete();

        return redirect()->route('products.trashed')
            ->with('success', 'Producto eliminado permanentemente');
    }

    /**
     * Update product stock.
     */
    public function updateStock(Request $request, Product $product): RedirectResponse
    {
        $request->validate([
            'stock' => 'required|integer|min:0',
            'operation' => 'required|in:set,add,subtract',
            'notes' => 'nullable|string|max:255',
        ]);

        $oldStock = $product->stock;

        switch ($request->operation) {
            case 'set':
                $product->stock = $request->stock;
                break;
            case 'add':
                $product->stock += $request->stock;
                break;
            case 'subtract':
                $product->stock = max(0, $product->stock - $request->stock);
                break;
        }

        $product->save();

        // TODO: Log stock movement in a separate table for audit purposes

        return redirect()->back()
            ->with('success', 'Stock actualizado correctamente');
    }
}
