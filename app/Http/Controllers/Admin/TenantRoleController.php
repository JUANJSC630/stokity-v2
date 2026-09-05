<?php

namespace App\Http\Controllers\Admin;

use App\Authorization\PermissionCatalog;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\TenantRoleRequest;
use App\Models\Role;
use App\Models\Tenant;
use App\Services\RoleGuardService;
use App\Tenancy\TenantManager;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Bloque 7.2 of ROLES_PERMISSIONS_PLAN.md: lets a super admin edit any
 * tenant's roles/permissions directly, instead of having to impersonate
 * that tenant's admin just to reach /settings/roles.
 *
 * Every action runs its Spatie-touching work (hasPermissionTo(),
 * syncPermissions(), findOrCreate()) inside TenantManager::runAs($tenant, ...)
 * so the team-context those calls rely on resolves against the TARGET
 * tenant, not whatever (nothing) the super admin's own session carries.
 * Shares the same guard rules as the tenant-facing editor via
 * RoleGuardService, so the two can never drift apart.
 */
class TenantRoleController extends Controller
{
    public function __construct(private RoleGuardService $roleGuard) {}

    public function index(Tenant $tenant, TenantManager $tenants): Response
    {
        $roles = $tenants->runAs($tenant, fn () => Role::where('tenant_id', $tenant->id)
            ->withCount(['permissions', 'users'])
            ->orderByDesc('is_system')
            ->orderBy('name')
            ->get());

        return Inertia::render('admin/tenants/roles/index', [
            'tenant' => ['id' => $tenant->id, 'name' => $tenant->name],
            'roles' => $roles,
        ]);
    }

    public function create(Tenant $tenant): Response
    {
        return Inertia::render('admin/tenants/roles/create', [
            'tenant' => ['id' => $tenant->id, 'name' => $tenant->name],
            'permissionsByModule' => PermissionCatalog::byModule(),
        ]);
    }

    public function store(TenantRoleRequest $request, Tenant $tenant, TenantManager $tenants): RedirectResponse
    {
        $validated = $request->validated();

        $tenants->runAs($tenant, function () use ($validated) {
            $role = Role::findOrCreate($validated['name'], 'web');
            $role->forceFill([
                'description' => $validated['description'] ?? null,
                'data_scope' => $validated['data_scope'],
                'is_default' => false,
                'is_system' => false,
            ])->save();

            $role->syncPermissions(PermissionCatalog::expandWithDependencies($validated['permissions']));
        });

        return redirect()->route('admin.tenants.roles.index', $tenant)->with('success', 'Rol creado correctamente.');
    }

    public function edit(Tenant $tenant, Role $role, TenantManager $tenants): Response
    {
        $this->authorizeSameTenant($role, $tenant);

        $permissionNames = $tenants->runAs($tenant, fn () => $role->permissions->pluck('name'));

        return Inertia::render('admin/tenants/roles/edit', [
            'tenant' => ['id' => $tenant->id, 'name' => $tenant->name],
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description,
                'data_scope' => $role->data_scope,
                'is_system' => $role->is_system,
                'permissions' => $permissionNames,
            ],
            'permissionsByModule' => PermissionCatalog::byModule(),
        ]);
    }

    public function update(TenantRoleRequest $request, Tenant $tenant, Role $role, TenantManager $tenants): RedirectResponse
    {
        $this->authorizeSameTenant($role, $tenant);

        $validated = $request->validated();
        $permissions = PermissionCatalog::expandWithDependencies($validated['permissions']);

        $blocked = $tenants->runAs(
            $tenant,
            fn () => $this->roleGuard->updateWithGuard($role, $validated, $permissions, $tenant->id)
        );

        if ($blocked) {
            return back()->withErrors([
                'permissions' => 'Al menos un rol del negocio debe conservar el permiso "Gestionar roles y permisos" — de lo contrario nadie podría volver a editar los roles.',
            ]);
        }

        return redirect()->route('admin.tenants.roles.index', $tenant)->with('success', 'Rol actualizado correctamente.');
    }

    public function destroy(Tenant $tenant, Role $role, TenantManager $tenants): RedirectResponse
    {
        $this->authorizeSameTenant($role, $tenant);

        abort_if($role->is_system, 403, 'Los roles del sistema no se pueden eliminar.');

        // Role::users() is role-id-pinned, not team-scoped (confirmed against
        // the vendor source) — same as Settings\RoleController::destroy(),
        // this check doesn't need to run inside runAs().
        if ($role->users()->count() > 0) {
            return back()->withErrors(['role' => 'No puedes eliminar un rol con usuarios asignados. Reasígnalos a otro rol primero.']);
        }

        $blocked = $tenants->runAs($tenant, fn () => $this->roleGuard->deleteWithGuard($role, $tenant->id));

        if ($blocked) {
            return back()->withErrors([
                'role' => 'Este rol es el único que puede gestionar roles y permisos — no se puede eliminar sin dejar el negocio sin nadie que pueda volver a editarlos.',
            ]);
        }

        return redirect()->route('admin.tenants.roles.index', $tenant)->with('success', 'Rol eliminado correctamente.');
    }

    /**
     * Route-model binding for {role} is NOT automatically tenant-scoped —
     * without this, a super admin could edit/delete a role belonging to a
     * DIFFERENT tenant than the one named in the URL just by mismatching IDs.
     */
    private function authorizeSameTenant(Role $role, Tenant $tenant): void
    {
        abort_if($role->tenant_id !== $tenant->id, 404);
    }
}
