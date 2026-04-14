<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\ExpenseCategory;
use App\Models\ExpenseTemplate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseTemplateController extends Controller
{
    public function index(): Response
    {
        $user = Auth::user();
        $now  = Carbon::now('America/Bogota');

        $templates = ExpenseTemplate::with('category')
            ->when(! $user->isAdmin(), fn ($q) => $q->where('branch_id', $user->branch_id))
            ->orderBy('due_day')
            ->orderBy('name')
            ->get()
            ->map(function (ExpenseTemplate $t) use ($now) {
                $registered = $t->isRegisteredForMonth($now->year, $now->month);

                $dueStatus = match (true) {
                    $registered                          => 'registered',
                    ! $t->is_active                      => 'inactive',
                    $t->due_day === null                 => 'pending',
                    $now->day > $t->due_day              => 'overdue',
                    $now->day >= $t->due_day - 3         => 'due_soon',
                    default                              => 'pending',
                };

                return array_merge($t->toArray(), ['due_status' => $dueStatus]);
            });

        $categories = ExpenseCategory::orderBy('name')->get(['id', 'name', 'icon', 'color']);
        $branches = $user->isAdmin() ? Branch::where('status', true)->get(['id', 'name']) : collect();

        return Inertia::render('expenses/templates', [
            'templates'    => $templates,
            'categories'   => $categories,
            'branches'     => $branches,
            'userBranchId' => $user->branch_id,
            'currentDay'   => $now->day,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();

        $data = $request->validate([
            'branch_id'           => 'required|exists:branches,id',
            'expense_category_id' => 'nullable|exists:expense_categories,id',
            'name'                => 'required|string|max:255',
            'reference_amount'    => 'required|numeric|min:1',
            'due_day'             => 'nullable|integer|min:1|max:31',
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
            'name'                => 'required|string|max:255',
            'reference_amount'    => 'required|numeric|min:1',
            'due_day'             => 'nullable|integer|min:1|max:31',
            'is_active'           => 'boolean',
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
