<?php

namespace App\Http\Controllers;

use App\Http\Requests\BranchRequest;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BranchController extends Controller
{
    /**
     * Display a listing of the branches.
     */
    public function index(Request $request): Response
    {
        $query = Branch::query()
            ->with('manager:id,name,email')
            ->with('employees:id,name,email,role,branch_id,status')
            ->orderBy('name');

        // Aplicar filtros de búsqueda
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Filtrar por estado
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status === 'active');
        }

        $branches = $query->paginate(10)->withQueryString();

        return Inertia::render('branches/index', [
            'branches' => $branches,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    /**
     * Display trashed branches.
     */
    public function trashed(Request $request): Response
    {
        $query = Branch::onlyTrashed()
            ->with('manager:id,name,email')
            ->orderBy('deleted_at', 'desc');

        // Aplicar filtros de búsqueda
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $branches = $query->paginate(10)->withQueryString();

        return Inertia::render('branches/trashed', [
            'branches' => $branches,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new branch.
     */
    public function create(): Response
    {
        $managers = User::where('role', 'encargado')
            ->orderBy('name')
            ->select('id', 'name', 'email')
            ->get();

        return Inertia::render('branches/create', [
            'managers' => $managers,
        ]);
    }

    /**
     * Store a newly created branch.
     */
    public function store(BranchRequest $request): RedirectResponse
    {
        Branch::create($request->validated());

        return redirect()->route('branches.index')
            ->with('success', 'Sucursal creada correctamente.');
    }

    /**
     * Show the form for editing the specified branch.
     */
    public function edit(Branch $branch): Response
    {
        $branch->load('manager:id,name,email');
        $managers = User::where('role', 'encargado')
            ->orderBy('name')
            ->select('id', 'name', 'email')
            ->get();

        return Inertia::render('branches/edit', [
            'branch' => $branch,
            'managers' => $managers,
        ]);
    }

    /**
     * Update the specified branch.
     */
    public function update(BranchRequest $request, Branch $branch): RedirectResponse
    {
        $branch->update($request->validated());

        return redirect()->route('branches.index')
            ->with('success', 'Sucursal actualizada correctamente.');
    }

    /**
     * Remove the specified branch (soft delete).
     */
    public function destroy(Branch $branch): RedirectResponse
    {
        $branch->delete();

        return redirect()->route('branches.index')
            ->with('success', 'Sucursal eliminada correctamente.');
    }

    /**
     * Restore the specified trashed branch.
     */
    public function restore($id): RedirectResponse
    {
        $branch = Branch::onlyTrashed()->findOrFail($id);
        $branch->restore();

        return redirect()->route('branches.trashed')
            ->with('success', 'Sucursal restaurada correctamente.');
    }

    /**
     * Permanently delete the specified branch from the database.
     */
    public function forceDelete($id): RedirectResponse
    {
        $branch = Branch::onlyTrashed()->findOrFail($id);
        $branch->forceDelete();

        return redirect()->route('branches.trashed')
            ->with('success', 'Sucursal eliminada permanentemente.');
    }

    /**
     * Display the specified branch.
     */
    public function show(Branch $branch): Response
    {
        $branch->load(['manager:id,name,email,role', 'employees:id,name,email,role,branch_id,status']);
        
        return Inertia::render('branches/show', [
            'branch' => $branch,
        ]);
    }
}
