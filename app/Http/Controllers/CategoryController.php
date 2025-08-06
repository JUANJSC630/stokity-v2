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
    public function index(Request $request)
    {
        $query = Category::query();

        // Apply search filters
        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            });
        }


        // Restructure pagination data to match frontend expectations
        $categories = $query->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('categories/index', [
            'categories' => $categories,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Display trashed categories.
     */
    public function trashed(Request $request)
    {
        $query = Category::onlyTrashed();

        // Apply search filters
        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            });
        }

        $categories = $query->orderBy('deleted_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('categories/trashed', [
            'categories' => $categories,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new category.
     */
    public function create()
    {
        return Inertia::render('categories/create');
    }

    /**
     * Store a newly created category.
     */
    public function store(CategoryRequest $request)
    {
        Category::create($request->validated());

        return redirect()->route('categories.index')
            ->with('success', 'Categoría creada correctamente.');
    }

    /**
     * Display the specified category.
     */
    public function show(Category $category)
    {
        $category->loadCount('products');

        return Inertia::render('categories/show', [
            'category' => $category,
        ]);
    }

    /**
     * Show the form for editing the specified category.
     */
    public function edit(Category $category)
    {
        return Inertia::render('categories/edit', [
            'category' => $category,
        ]);
    }

    /**
     * Update the specified category.
     */
    public function update(CategoryRequest $request, Category $category)
    {
        $category->update($request->validated());

        return redirect()->route('categories.index')
            ->with('success', 'Categoría actualizada correctamente.');
    }

    /**
     * Remove the specified category (soft delete).
     */
    public function destroy(Category $category)
    {
        $category->delete();

        return redirect()->route('categories.index')
            ->with('success', 'Categoría eliminada correctamente.');
    }

    /**
     * Restore the specified trashed category.
     */
    public function restore($id)
    {
        $category = Category::onlyTrashed()->findOrFail($id);
        $category->restore();

        return redirect()->route('categories.trashed')
            ->with('success', 'Categoría restaurada correctamente.');
    }

    /**
     * Permanently delete the specified category from the database.
     */
    public function forceDelete($id)
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
