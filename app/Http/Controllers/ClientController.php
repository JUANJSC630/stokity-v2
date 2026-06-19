<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Tenancy\TenantManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ClientController extends Controller
{
    /** Constrain a unique rule to the current tenant. */
    private function perTenant(): \Closure
    {
        return fn ($q) => $q->where('tenant_id', app(TenantManager::class)->id());
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Client::query();

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('document', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $clients = $query->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('clients/index', [
            'clients' => $clients,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('clients/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'document' => ['required', 'string', 'max:20', Rule::unique('clients', 'document')->where($this->perTenant())],
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'email' => ['nullable', 'string', 'email', 'max:255', Rule::unique('clients', 'email')->where($this->perTenant())],
            'birthdate' => 'nullable|date',
        ]);

        $client = Client::create($validated);
        // Si la petición es Inertia, devolver redirect para Inertia

        return redirect()->back()->with('success', 'Cliente creado exitosamente.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Client $client)
    {
        $user = Auth::user();

        $salesQuery = $client->sales()
            ->when(! $user->isAdmin(), fn ($q) => $q->where('branch_id', $user->branch_id));

        $sales = (clone $salesQuery)
            ->with('seller')
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        $statsRow = (clone $salesQuery)
            ->selectRaw('COUNT(*) as total_sales, COALESCE(SUM(total), 0) as total_spent, MAX(created_at) as last_purchase')
            ->first();

        $stats = [
            'total_sales' => (int) $statsRow->total_sales,
            'total_spent' => (float) $statsRow->total_spent,
            'last_purchase' => $statsRow->last_purchase,
        ];

        return Inertia::render('clients/show', [
            'client' => $client,
            'sales' => $sales,
            'stats' => $stats,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Client $client)
    {
        return Inertia::render('clients/edit', [
            'client' => $client,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Client $client)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'document' => ['required', 'string', 'max:20', Rule::unique('clients', 'document')->ignore($client->id)->where($this->perTenant())],
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'email' => ['nullable', 'string', 'email', 'max:255', Rule::unique('clients', 'email')->ignore($client->id)->where($this->perTenant())],
            'birthdate' => 'nullable|date',
        ]);

        $client->update($validated);

        return redirect()->route('clients.show', $client)->with('success', 'Cliente actualizado exitosamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Client $client)
    {
        $client->delete();

        return redirect()->route('clients.index')->with('success', 'Cliente eliminado exitosamente.');
    }
}
