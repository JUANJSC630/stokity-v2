<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
    /**
     * Display a listing of suppliers.
     */
    public function index(Request $request): Response
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        $query = Supplier::with('branch');

        if (!$user->isAdmin() && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('nit', 'like', "%{$search}%")
                    ->orWhere('contact_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status === 'active');
        }

        if ($request->filled('branch') && $user->isAdmin()) {
            $query->where('branch_id', $request->branch);
        }

        $suppliers = $query->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        $branches = $user->isAdmin()
            ? Branch::where('status', true)->get(['id', 'name'])
            : [];

        return Inertia::render('suppliers/index', [
            'suppliers' => $suppliers,
            'branches'  => $branches,
            'filters'   => $request->only(['search', 'status', 'branch']),
        ]);
    }

    /**
     * Show the form for creating a new supplier.
     */
    public function create(): Response
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        $branches = $user->isAdmin()
            ? Branch::where('status', true)->get(['id', 'name'])
            : Branch::where('id', $user->branch_id)->get(['id', 'name']);

        return Inertia::render('suppliers/create', [
            'branches'    => $branches,
            'userBranchId' => $user->branch_id,
        ]);
    }

    /**
     * Store a newly created supplier.
     */
    public function store(Request $request): RedirectResponse
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        $validated = $request->validate([
            'branch_id'    => 'required|exists:branches,id',
            'name'         => 'required|string|max:255',
            'nit'          => 'nullable|string|max:20',
            'contact_name' => 'nullable|string|max:255',
            'phone'        => 'nullable|string|max:20',
            'email'        => 'nullable|email|max:255',
            'address'      => 'nullable|string|max:255',
            'notes'        => 'nullable|string',
            'status'       => 'boolean',
        ]);

        // Non-admins are locked to their branch
        if (!$user->isAdmin()) {
            $validated['branch_id'] = $user->branch_id;
        }

        Supplier::create($validated);

        return redirect()->route('suppliers.index')->with('success', 'Proveedor creado exitosamente.');
    }

    /**
     * Display the specified supplier.
     */
    public function show(Request $request, Supplier $supplier): Response
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        abort_if(!$user->isAdmin() && $supplier->branch_id !== $user->branch_id, 403);

        $supplier->load(['branch', 'products' => function ($q) {
            $q->with('category')->withPivot(['purchase_price', 'supplier_code', 'is_default']);
        }]);

        $movementsQuery = $supplier->stockMovements()->with('product');

        if ($request->filled('start_date')) {
            $movementsQuery->whereDate('movement_date', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $movementsQuery->whereDate('movement_date', '<=', $request->end_date);
        }

        $totalCost = (float) $movementsQuery->clone()
            ->whereIn('type', ['in', 'purchase'])
            ->whereNotNull('unit_cost')
            ->sum(DB::raw('quantity * unit_cost'));

        $movements = $movementsQuery
            ->orderByDesc('movement_date')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('suppliers/show', [
            'supplier'   => $supplier,
            'movements'  => $movements,
            'totalCost'  => $totalCost,
            'filters'    => $request->only(['start_date', 'end_date']),
        ]);
    }

    /**
     * Show the form for editing the specified supplier.
     */
    public function edit(Supplier $supplier): Response
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        abort_if(!$user->isAdmin() && $supplier->branch_id !== $user->branch_id, 403);

        $branches = $user->isAdmin()
            ? Branch::where('status', true)->get(['id', 'name'])
            : Branch::where('id', $user->branch_id)->get(['id', 'name']);

        return Inertia::render('suppliers/edit', [
            'supplier' => $supplier,
            'branches' => $branches,
        ]);
    }

    /**
     * Update the specified supplier.
     */
    public function update(Request $request, Supplier $supplier): RedirectResponse
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        abort_if(!$user->isAdmin() && $supplier->branch_id !== $user->branch_id, 403);

        $validated = $request->validate([
            'branch_id'    => 'required|exists:branches,id',
            'name'         => 'required|string|max:255',
            'nit'          => 'nullable|string|max:20',
            'contact_name' => 'nullable|string|max:255',
            'phone'        => 'nullable|string|max:20',
            'email'        => 'nullable|email|max:255',
            'address'      => 'nullable|string|max:255',
            'notes'        => 'nullable|string',
            'status'       => 'boolean',
        ]);

        if (!$user->isAdmin()) {
            $validated['branch_id'] = $user->branch_id;
        }

        $supplier->update($validated);

        return redirect()->route('suppliers.show', $supplier)->with('success', 'Proveedor actualizado exitosamente.');
    }

    /**
     * Remove the specified supplier (soft delete).
     */
    public function destroy(Supplier $supplier): RedirectResponse
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        abort_if(!$user->isAdmin() && $supplier->branch_id !== $user->branch_id, 403);

        $supplier->delete();

        return redirect()->route('suppliers.index')->with('success', 'Proveedor eliminado exitosamente.');
    }
}
