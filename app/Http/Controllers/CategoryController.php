<?php

namespace App\Http\Controllers;

use App\Http\Requests\CategoryRequest;
use App\Models\Category;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    /**
     * Display a listing of the categories.
     */
    public function index(Request $request): Response
    {
        $query = Category::query()
            ->orderBy('name');

        // Apply search filters
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status === 'active');
        }

        $paginatedCategories = $query->paginate(30)->withQueryString();

        // Restructure pagination data to match frontend expectations
        $categories = [
            'data' => $paginatedCategories->items(),
            'meta' => [
                'current_page' => $paginatedCategories->currentPage(),
                'last_page' => $paginatedCategories->lastPage(),
                'per_page' => $paginatedCategories->perPage(),
                'total' => $paginatedCategories->total(),
                'from' => $paginatedCategories->firstItem(),
                'to' => $paginatedCategories->lastItem(),
                'links' => $paginatedCategories->linkCollection()->toArray(),
                'path' => $paginatedCategories->path(),
            ],
        ];

        return Inertia::render('categories/index', [
            'categories' => $categories,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    /**
     * Display trashed categories.
     */
    public function trashed(Request $request): Response
    {
        $query = Category::onlyTrashed()
            ->orderBy('deleted_at', 'desc');

        // Apply search filters
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $paginatedCategories = $query->paginate(30)->withQueryString();

        // Restructure pagination data to match frontend expectations
        $categories = [
            'data' => $paginatedCategories->items(),
            'meta' => [
                'current_page' => $paginatedCategories->currentPage(),
                'last_page' => $paginatedCategories->lastPage(),
                'per_page' => $paginatedCategories->perPage(),
                'total' => $paginatedCategories->total(),
                'from' => $paginatedCategories->firstItem(),
                'to' => $paginatedCategories->lastItem(),
                'links' => $paginatedCategories->linkCollection()->toArray(),
                'path' => $paginatedCategories->path(),
            ],
        ];

        return Inertia::render('categories/trashed', [
            'categories' => $categories,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new category.
     */
    public function create(): Response
    {
        return Inertia::render('categories/create');
    }

    /**
     * Store a newly created category.
     */
    public function store(CategoryRequest $request): RedirectResponse
    {
        Category::create($request->validated());

        return redirect()->route('categories.index')
            ->with('success', 'Categoría creada correctamente.');
    }

    /**
     * Display the specified category.
     */
    public function show(Category $category): Response
    {
        $category->loadCount('products');

        return Inertia::render('categories/show', [
            'category' => $category,
        ]);
    }

    /**
     * Show the form for editing the specified category.
     */
    public function edit(Category $category): Response
    {
        return Inertia::render('categories/edit', [
            'category' => $category,
        ]);
    }

    /**
     * Update the specified category.
     */
    public function update(CategoryRequest $request, Category $category): RedirectResponse
    {
        $category->update($request->validated());

        return redirect()->route('categories.index')
            ->with('success', 'Categoría actualizada correctamente.');
    }

    /**
     * Remove the specified category (soft delete).
     */
    public function destroy(Category $category): RedirectResponse
    {
        $category->delete();

        return redirect()->route('categories.index')
            ->with('success', 'Categoría eliminada correctamente.');
    }

    /**
     * Restore the specified trashed category.
     */
    public function restore($id): RedirectResponse
    {
        $category = Category::onlyTrashed()->findOrFail($id);
        $category->restore();

        return redirect()->route('categories.trashed')
            ->with('success', 'Categoría restaurada correctamente.');
    }

    /**
     * Permanently delete the specified category from the database.
     */
    public function forceDelete($id): RedirectResponse
    {
        $category = Category::onlyTrashed()->findOrFail($id);

        // Check if category has associated products
        $productsCount = $category->products()->count();
        if ($productsCount > 0) {
            return redirect()->route('categories.trashed')
                ->with('error', "No se puede eliminar permanentemente la categoría porque tiene {$productsCount} productos asociados.");
        }

        $category->forceDelete();

        return redirect()->route('categories.trashed')
            ->with('success', 'Categoría eliminada permanentemente.');
    }
}
