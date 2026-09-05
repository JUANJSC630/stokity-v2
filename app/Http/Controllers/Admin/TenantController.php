<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantProvisioner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
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

    /**
     * Tenant detail: metrics, users, branches, and the admin-only actions
     * (edit, reset a user's password) that don't fit the summary table.
     */
    public function show(Tenant $tenant): Response
    {
        $users = User::allTenants()->where('tenant_id', $tenant->id)->orderBy('name')->get(['id', 'name', 'email', 'role', 'status']);
        $branches = Branch::allTenants()->where('tenant_id', $tenant->id)->orderBy('name')->get(['id', 'name', 'status']);

        return Inertia::render('admin/tenants/show', [
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'status' => $tenant->status,
                'plan' => $tenant->plan,
                'created_at' => $tenant->created_at?->toIso8601String(),
            ],
            'metrics' => [
                'users_count' => $users->count(),
                'products_count' => Product::allTenants()->where('tenant_id', $tenant->id)->count(),
                'sales_count' => Sale::allTenants()->where('tenant_id', $tenant->id)->count(),
            ],
            'users' => $users,
            'branches' => $branches,
        ]);
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

    /**
     * Archive a business (soft delete). Its data is preserved and its users are
     * locked out (IdentifyTenant fails closed for a missing/deleted tenant).
     */
    public function destroy(Tenant $tenant): RedirectResponse
    {
        $tenant->delete();

        return redirect()->route('admin.tenants.index')
            ->with('success', "Negocio «{$tenant->name}» eliminado.");
    }

    /**
     * Edit a tenant's own identity fields — everything else (users, branches,
     * catalog) is managed by the tenant itself once created.
     */
    public function update(Request $request, Tenant $tenant): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => ['required', 'string', 'max:255', 'alpha_dash', Rule::unique('tenants', 'slug')->ignore($tenant->id)],
            'plan' => 'nullable|string|max:255',
        ]);

        $tenant->update($validated);

        return back()->with('success', "Negocio «{$tenant->name}» actualizado.");
    }

    /**
     * Support action: generate a one-time temporary password for a tenant
     * user and return it once in the flash message. No email dependency —
     * the super admin relays it to the client through whatever channel they
     * already use (the local .env mailer isn't a production-grade guarantee
     * of delivery).
     */
    public function resetUserPassword(Tenant $tenant, User $user): RedirectResponse
    {
        abort_unless($user->tenant_id === $tenant->id, 404);

        $temporaryPassword = Str::password(12);
        $user->update(['password' => Hash::make($temporaryPassword)]);

        return back()->with([
            'success' => "Contraseña de «{$user->name}» restablecida.",
            'temporaryPassword' => $temporaryPassword,
        ]);
    }

    public function archivedIndex(): Response
    {
        $tenants = Tenant::onlyTrashed()->orderByDesc('deleted_at')->get()->map(fn (Tenant $t) => [
            'id' => $t->id,
            'name' => $t->name,
            'slug' => $t->slug,
            'deleted_at' => $t->deleted_at?->format('Y-m-d'),
        ]);

        return Inertia::render('admin/tenants/archived', ['tenants' => $tenants]);
    }

    public function restore(int $tenant): RedirectResponse
    {
        $restored = Tenant::onlyTrashed()->findOrFail($tenant);
        $restored->restore();

        return redirect()->route('admin.tenants.index')
            ->with('success', "Negocio «{$restored->name}» restaurado.");
    }
}
