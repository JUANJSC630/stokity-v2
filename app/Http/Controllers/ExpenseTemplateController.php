<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\ExpenseCategory;
use App\Models\ExpenseTemplate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseTemplateController extends Controller
{
    public function index(): Response
    {
        $user = Auth::user();

        $templates = ExpenseTemplate::with('category')
            ->when(! $user->isAdmin(), fn ($q) => $q->where('branch_id', $user->branch_id))
            ->orderBy('name')
            ->get();

        $categories = ExpenseCategory::orderBy('name')->get(['id', 'name', 'icon', 'color']);
        $branches = $user->isAdmin() ? Branch::where('status', true)->get(['id', 'name']) : collect();

        return Inertia::render('expenses/templates', [
            'templates' => $templates,
            'categories' => $categories,
            'branches' => $branches,
            'userBranchId' => $user->branch_id,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();

        $data = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'expense_category_id' => 'nullable|exists:expense_categories,id',
            'name' => 'required|string|max:255',
            'reference_amount' => 'required|numeric|min:1',
        ]);

        // Encargado solo puede crear plantillas para su sucursal
        if (! $user->isAdmin() && (int) $data['branch_id'] !== $user->branch_id) {
            abort(403);
        }

        ExpenseTemplate::create($data + ['is_active' => true]);

        return back()->with('success', 'Plantilla creada correctamente.');
    }

    public function update(Request $request, ExpenseTemplate $expenseTemplate): RedirectResponse
    {
        $user = Auth::user();
        if (! $user->isAdmin() && $expenseTemplate->branch_id !== $user->branch_id) {
            abort(403);
        }

        $data = $request->validate([
            'expense_category_id' => 'nullable|exists:expense_categories,id',
            'name' => 'required|string|max:255',
            'reference_amount' => 'required|numeric|min:1',
            'is_active' => 'boolean',
        ]);

        $expenseTemplate->update($data);

        return back()->with('success', 'Plantilla actualizada.');
    }

    public function destroy(ExpenseTemplate $expenseTemplate): RedirectResponse
    {
        $user = Auth::user();
        if (! $user->isAdmin() && $expenseTemplate->branch_id !== $user->branch_id) {
            abort(403);
        }

        $expenseTemplate->delete();

        return back()->with('success', 'Plantilla eliminada.');
    }
}
