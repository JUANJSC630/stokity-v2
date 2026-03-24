<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\ExpenseTemplate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $now  = Carbon::now('America/Bogota');

        $query = Expense::with(['category', 'template', 'user', 'branch'])
            ->when(! $user->isAdmin(), fn ($q) => $q->where('branch_id', $user->branch_id))
            ->when($user->isAdmin() && $request->filled('branch'), fn ($q) => $q->where('branch_id', $request->branch))
            ->when($request->filled('category'), fn ($q) => $q->where('expense_category_id', $request->category))
            ->when($request->filled('start_date'), fn ($q) => $q->whereDate('expense_date', '>=', $request->start_date))
            ->when($request->filled('end_date'), fn ($q) => $q->whereDate('expense_date', '<=', $request->end_date));

        $expenses = $query->orderByDesc('expense_date')->orderByDesc('id')->paginate(20)->withQueryString();

        // Plantillas activas sin registrar en el mes actual → banner de pendientes
        $pendingTemplates = ExpenseTemplate::with('category')
            ->where('is_active', true)
            ->when(! $user->isAdmin(), fn ($q) => $q->where('branch_id', $user->branch_id))
            ->get()
            ->filter(fn ($t) => ! $t->isRegisteredForMonth($now->year, $now->month))
            ->values();

        $categories = ExpenseCategory::orderBy('name')->get(['id', 'name', 'icon', 'color']);
        $branches   = $user->isAdmin() ? Branch::where('status', true)->get(['id', 'name']) : collect();

        return Inertia::render('expenses/index', [
            'expenses'         => $expenses,
            'pendingTemplates' => $pendingTemplates,
            'categories'       => $categories,
            'branches'         => $branches,
            'currentMonth'     => $now->translatedFormat('F Y'),
            'filters'          => $request->only(['branch', 'category', 'start_date', 'end_date']),
            'userBranchId'     => $user->branch_id,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();

        // Acepta un gasto único o un array de gastos (confirmación de plantillas mensuales)
        if ($request->has('expenses')) {
            // Bulk: confirmación de múltiples plantillas
            $request->validate([
                'expenses'                     => 'required|array|min:1',
                'expenses.*.branch_id'         => 'required|exists:branches,id',
                'expenses.*.expense_category_id' => 'nullable|exists:expense_categories,id',
                'expenses.*.expense_template_id' => 'nullable|exists:expense_templates,id',
                'expenses.*.amount'            => 'required|numeric|min:1',
                'expenses.*.description'       => 'nullable|string|max:255',
                'expenses.*.expense_date'      => 'required|date',
            ]);

            foreach ($request->expenses as $item) {
                if (! $user->isAdmin() && (int) $item['branch_id'] !== $user->branch_id) {
                    continue; // silently skip unauthorized branches
                }
                Expense::create($item + ['user_id' => $user->id]);
            }

            return back()->with('success', 'Gastos del mes registrados correctamente.');
        }

        // Single expense
        $data = $request->validate([
            'branch_id'           => 'required|exists:branches,id',
            'expense_category_id' => 'nullable|exists:expense_categories,id',
            'expense_template_id' => 'nullable|exists:expense_templates,id',
            'amount'              => 'required|numeric|min:1',
            'description'         => 'nullable|string|max:255',
            'expense_date'        => 'required|date',
            'notes'               => 'nullable|string|max:1000',
        ]);

        if (! $user->isAdmin() && (int) $data['branch_id'] !== $user->branch_id) {
            abort(403);
        }

        Expense::create($data + ['user_id' => $user->id]);

        return back()->with('success', 'Gasto registrado correctamente.');
    }

    public function update(Request $request, Expense $expense): RedirectResponse
    {
        $user = Auth::user();
        if (! $user->isAdmin() && $expense->branch_id !== $user->branch_id) {
            abort(403);
        }

        $data = $request->validate([
            'expense_category_id' => 'nullable|exists:expense_categories,id',
            'amount'              => 'required|numeric|min:1',
            'description'         => 'nullable|string|max:255',
            'expense_date'        => 'required|date',
            'notes'               => 'nullable|string|max:1000',
        ]);

        $expense->update($data);

        return back()->with('success', 'Gasto actualizado.');
    }

    public function destroy(Expense $expense): RedirectResponse
    {
        $user = Auth::user();
        if (! $user->isAdmin() && $expense->branch_id !== $user->branch_id) {
            abort(403);
        }

        $expense->delete();

        return back()->with('success', 'Gasto eliminado.');
    }
}
