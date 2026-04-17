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
    public function index(Request $request)
    {
        $query = Branch::query();

        // Aplicar filtros de búsqueda
        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            });
        }

        // Filtrar por estado
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('branches.status', $request->status);
        }

        $branches = $query->with(['manager:id,name', 'employees:id,name,role,branch_id'])
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

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
        $query = Branch::onlyTrashed();

        // Aplicar filtros de búsqueda
        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            });
        }

        $branches = $query->orderBy('deleted_at', 'desc')
            ->paginate(10)
            ->withQueryString();

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
        $managers = User::whereIn('role', ['encargado', 'administrador'])
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return Inertia::render('branches/create', [
            'managers' => $managers,
        ]);
    }

    /**
     * Store a newly created branch.
     */
    public function store(BranchRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['manager_id'] = !empty($data['manager_id']) ? $data['manager_id'] : null;

        Branch::create($data);

        return redirect()->route('branches.index')
            ->with('success', 'Sucursal creada correctamente.');
    }

    /**
     * Show the form for editing the specified branch.
     */
    public function edit(Branch $branch): Response
    {
        $branch->load('manager:id,name,email');

        $managers = User::whereIn('role', ['encargado', 'administrador'])
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

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
        $data = $request->validated();
        $data['manager_id'] = !empty($data['manager_id']) ? $data['manager_id'] : null;

        $branch->update($data);

        return redirect()->route('branches.show', $branch)
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
