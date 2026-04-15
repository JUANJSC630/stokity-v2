<?php

namespace App\Http\Controllers;

use App\Models\ExpenseCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseCategoryController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('expenses/categories', [
            'categories' => ExpenseCategory::orderBy('is_system', 'desc')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100|unique:expense_categories,name',
            'color' => 'nullable|string|max:30',
        ]);

        ExpenseCategory::create([
            'name' => $data['name'],
            'color' => $data['color'] ?? null,
            'icon' => null,
            'is_system' => false,
        ]);

        return back()->with('success', 'Categoría creada correctamente.');
    }

    public function update(Request $request, ExpenseCategory $expenseCategory): RedirectResponse
    {
        if ($expenseCategory->is_system) {
            return back()->withErrors(['name' => 'Las categorías del sistema no se pueden editar.']);
        }

        $data = $request->validate([
            'name' => 'required|string|max:100|unique:expense_categories,name,'.$expenseCategory->id,
            'color' => 'nullable|string|max:30',
        ]);

        $expenseCategory->update([
            'name' => $data['name'],
            'color' => $data['color'] ?? null,
        ]);

        return back()->with('success', 'Categoría actualizada correctamente.');
    }

    public function destroy(Request $request, ExpenseCategory $expenseCategory): RedirectResponse
    {
        if ($expenseCategory->is_system) {
            return back()->withErrors(['name' => 'Las categorías del sistema no se pueden eliminar.']);
        }

        $request->validate([
            'deletion_reason' => 'nullable|string|max:500',
        ]);

        // Desasociar gastos y plantillas antes de eliminar
        $expenseCategory->expenses()->update(['expense_category_id' => null]);
        $expenseCategory->templates()->update(['expense_category_id' => null]);
        $expenseCategory->update([
            'deleted_by' => $request->user()->id,
            'deletion_reason' => $request->deletion_reason,
        ]);
        $expenseCategory->delete();

        return back()->with('success', 'Categoría eliminada correctamente.');
    }
}
