<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantProvisioner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class TenantController extends Controller
{
    public function index(): Response
    {
        // One grouped count per entity instead of 3 queries per tenant (no N+1).
        $countByTenant = fn (string $model) => $model::allTenants()
            ->selectRaw('tenant_id, COUNT(*) as aggregate')
            ->groupBy('tenant_id')
            ->pluck('aggregate', 'tenant_id');

        $users = $countByTenant(User::class);
        $products = $countByTenant(Product::class);
        $sales = $countByTenant(Sale::class);

        $tenants = Tenant::orderByDesc('id')->get()->map(fn (Tenant $t) => [
            'id' => $t->id,
            'name' => $t->name,
            'slug' => $t->slug,
            'status' => $t->status,
            'created_at' => $t->created_at?->format('Y-m-d'),
            'users_count' => (int) ($users[$t->id] ?? 0),
            'products_count' => (int) ($products[$t->id] ?? 0),
            'sales_count' => (int) ($sales[$t->id] ?? 0),
        ]);

        return Inertia::render('admin/tenants/index', ['tenants' => $tenants]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/tenants/create');
    }

    public function store(Request $request, TenantProvisioner $provisioner): RedirectResponse
    {
        $validated = $request->validate([
            'business_name' => 'required|string|max:255',
            'branch_name' => 'nullable|string|max:255',
            'admin_name' => 'required|string|max:255',
            'admin_email' => 'required|email|max:255|unique:users,email',
            'admin_password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $tenant = $provisioner->create($validated);

        return redirect()->route('admin.tenants.index')
            ->with('success', "Negocio «{$tenant->name}» creado correctamente.");
    }

    public function suspend(Tenant $tenant): RedirectResponse
    {
        $tenant->update(['status' => Tenant::STATUS_SUSPENDED]);

        return back()->with('success', "Negocio «{$tenant->name}» suspendido.");
    }

    public function activate(Tenant $tenant): RedirectResponse
    {
        $tenant->update(['status' => Tenant::STATUS_ACTIVE]);

        return back()->with('success', "Negocio «{$tenant->name}» activado.");
    }
}
