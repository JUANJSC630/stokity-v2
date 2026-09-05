<?php

namespace App\Http\Controllers\Settings;

use App\Authorization\PermissionCatalog;
use App\Http\Controllers\Controller;
use App\Http\Requests\RoleRequest;
use App\Models\Role;
use App\Services\RoleGuardService;
use App\Tenancy\TenantManager;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class RoleController extends Controller
{
    public function __construct(private RoleGuardService $roleGuard) {}

    /**
     * Display the tenant's roles.
     */
    public function index(): Response
    {
        // Role carries no global tenant scope (unlike BelongsToTenant models)
        // — Spatie's own team-aware lookups (findByParam(), hasRole(), ...)
        // filter internally via getPermissionsTeamId(), but a plain query
        // like this one must filter explicitly or it leaks every tenant's
        // roles.
        $roles = Role::where('tenant_id', app(TenantManager::class)->id())
            ->withCount(['permissions', 'users'])
            ->orderByDesc('is_system')
            ->orderBy('name')
            ->get();

        return Inertia::render('settings/roles/index', [
            'roles' => $roles,
        ]);
    }

    /**
     * Show the form for creating a new custom role.
     */
    public function create(): Response
    {
        return Inertia::render('settings/roles/create', [
            'permissionsByModule' => PermissionCatalog::byModule(),
        ]);
    }

    /**
     * Store a newly created custom role.
     */
    public function store(RoleRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        // Role::create() would silently skip Spatie's team (tenant_id)
        // stamping — findOrCreate() is the team-aware path, same as
        // DefaultRoleProvisioner::syncRole().
        $role = Role::findOrCreate($validated['name'], 'web');
        $role->forceFill([
            'description' => $validated['description'] ?? null,
            'data_scope' => $validated['data_scope'],
            'is_default' => false,
            'is_system' => false,
        ])->save();

        $role->syncPermissions(PermissionCatalog::expandWithDependencies($validated['permissions']));

        return redirect()->route('settings.roles.index')->with('success', 'Rol creado correctamente.');
    }

    /**
     * Show the form for editing an existing role.
     */
    public function edit(Role $role): Response
    {
        $this->authorizeSameTenant($role);

        return Inertia::render('settings/roles/edit', [
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description,
                'data_scope' => $role->data_scope,
                'is_system' => $role->is_system,
                'permissions' => $role->permissions->pluck('name'),
            ],
            'permissionsByModule' => PermissionCatalog::byModule(),
        ]);
    }

    /**
     * Update the specified role's metadata and permissions.
     */
    public function update(RoleRequest $request, Role $role): RedirectResponse
    {
        $this->authorizeSameTenant($role);

        $validated = $request->validated();
        $permissions = PermissionCatalog::expandWithDependencies($validated['permissions']);

        $blocked = $this->roleGuard->updateWithGuard($role, $validated, $permissions, app(TenantManager::class)->id());

        if ($blocked) {
            return back()->withErrors([
                'permissions' => 'Al menos un rol del negocio debe conservar el permiso "Gestionar roles y permisos" — de lo contrario nadie podría volver a editar los roles.',
            ]);
        }

        return redirect()->route('settings.roles.index')->with('success', 'Rol actualizado correctamente.');
    }

    /**
     * Remove a custom role.
     */
    public function destroy(Role $role): RedirectResponse
    {
        $this->authorizeSameTenant($role);

        abort_if($role->is_system, 403, 'Los roles del sistema no se pueden eliminar.');

        if ($role->users()->count() > 0) {
            return back()->withErrors(['role' => 'No puedes eliminar un rol con usuarios asignados. Reasígnalos a otro rol primero.']);
        }

        $blocked = $this->roleGuard->deleteWithGuard($role, app(TenantManager::class)->id());

        if ($blocked) {
            return back()->withErrors([
                'role' => 'Este rol es el único que puede gestionar roles y permisos — no se puede eliminar sin dejar el negocio sin nadie que pueda volver a editarlos.',
            ]);
        }

        return redirect()->route('settings.roles.index')->with('success', 'Rol eliminado correctamente.');
    }

    /**
     * Route-model binding for {role} is NOT automatically tenant-scoped —
     * see the warning in app/Models/Role.php — so without this, an admin
     * of one tenant could edit/delete another tenant's role just by
     * guessing its ID.
     */
    private function authorizeSameTenant(Role $role): void
    {
        abort_if($role->tenant_id !== app(TenantManager::class)->id(), 404);
    }
}
