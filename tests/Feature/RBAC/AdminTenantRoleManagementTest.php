<?php

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use App\Tenancy\TenantProvisioner;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

/**
 * PR 2 of the super-admin expansion plan (Bloque 7.2 of
 * ROLES_PERMISSIONS_PLAN.md): a super admin edits any tenant's roles
 * directly from /admin/tenants/{tenant}/roles, instead of having to
 * impersonate that tenant's admin just to reach /settings/roles.
 *
 * Shares RoleGuardService with the tenant-facing Settings\RoleController —
 * these tests focus on what's specific to the admin side (arbitrary tenant,
 * Spatie team-context via TenantManager::runAs(), route-level isolation)
 * rather than re-proving every guard rule already covered by
 * tests/Feature/RBAC/RoleManagementTest.php.
 */
uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(PermissionSeeder::class));

afterEach(fn () => app(TenantManager::class)->forget());

function tenantRolesSuperAdmin(): User
{
    return User::create([
        'name' => 'Owner',
        'email' => 'owner@platform.test',
        'password' => Hash::make('password123'),
        'role' => User::ROLE_SUPER_ADMIN,
        'status' => true,
        'email_verified_at' => now(),
    ]);
}

it('lists a tenant\'s default roles with permission and user counts', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);

    $response = $this->actingAs(tenantRolesSuperAdmin())->get("/admin/tenants/{$tenant->id}/roles");

    $response->assertOk();
    $roles = collect($response->viewData('page')['props']['roles']);
    expect($roles->pluck('name'))->toContain('Administrador', 'Encargado', 'Vendedor');
    $admin = $roles->firstWhere('name', 'Administrador');
    expect($admin['users_count'])->toBe(1);
});

it('never mixes another tenant\'s roles into the list', function () {
    $tenantA = app(TenantProvisioner::class)->create([
        'business_name' => 'Tienda A', 'admin_name' => 'Admin A', 'admin_email' => 'a@a.test', 'admin_password' => 'password123',
    ]);
    app(TenantProvisioner::class)->create([
        'business_name' => 'Tienda B', 'admin_name' => 'Admin B', 'admin_email' => 'b@b.test', 'admin_password' => 'password123',
    ]);

    $response = $this->actingAs(tenantRolesSuperAdmin())->get("/admin/tenants/{$tenantA->id}/roles");

    $roleIds = collect($response->viewData('page')['props']['roles'])->pluck('id');
    $tenantIds = $roleIds->map(fn ($id) => Role::find($id)->tenant_id)->unique();
    expect($tenantIds->all())->toBe([$tenantA->id]);
});

it('creates a custom role for a tenant and auto-expands its permission dependencies', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);

    $response = $this->actingAs(tenantRolesSuperAdmin())->post("/admin/tenants/{$tenant->id}/roles", [
        'name' => 'Cajero',
        'description' => 'Solo POS',
        'data_scope' => 'branch',
        'permissions' => ['pos.apply_discount'],
    ]);

    $response->assertRedirect("/admin/tenants/{$tenant->id}/roles");

    app(TenantManager::class)->runAs($tenant, function () use ($tenant) {
        $role = Role::where('tenant_id', $tenant->id)->where('name', 'Cajero')->first();
        expect($role)->not->toBeNull()
            ->and($role->tenant_id)->toBe($tenant->id)
            ->and($role->is_system)->toBeFalse();
        expect($role->permissions->pluck('name'))->toContain('pos.apply_discount', 'pos.access', 'sales.create');
    });
});

it('rejects a duplicate role name within the same tenant but allows it in a different one', function () {
    $tenantA = app(TenantProvisioner::class)->create([
        'business_name' => 'Tienda A', 'admin_name' => 'Admin A', 'admin_email' => 'a@a.test', 'admin_password' => 'password123',
    ]);
    $tenantB = app(TenantProvisioner::class)->create([
        'business_name' => 'Tienda B', 'admin_name' => 'Admin B', 'admin_email' => 'b@b.test', 'admin_password' => 'password123',
    ]);
    $superAdmin = tenantRolesSuperAdmin();

    $this->actingAs($superAdmin)->post("/admin/tenants/{$tenantA->id}/roles", [
        'name' => 'Encargado', 'data_scope' => 'branch', 'permissions' => [],
    ])->assertSessionHasErrors('name');

    $this->actingAs($superAdmin)->post("/admin/tenants/{$tenantA->id}/roles", [
        'name' => 'Cajero', 'data_scope' => 'branch', 'permissions' => [],
    ])->assertRedirect("/admin/tenants/{$tenantA->id}/roles");

    // Same custom name, different tenant — must not collide.
    $this->actingAs($superAdmin)->post("/admin/tenants/{$tenantB->id}/roles", [
        'name' => 'Cajero', 'data_scope' => 'branch', 'permissions' => [],
    ])->assertRedirect("/admin/tenants/{$tenantB->id}/roles");
});

it('lets a super admin edit a system role\'s permissions but not its name', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $encargado = app(TenantManager::class)->runAs($tenant, fn () => Role::where('tenant_id', $tenant->id)->where('name', 'Encargado')->first());

    $response = $this->actingAs(tenantRolesSuperAdmin())->put("/admin/tenants/{$tenant->id}/roles/{$encargado->id}", [
        'name' => 'Renamed Encargado',
        'data_scope' => 'branch',
        'permissions' => ['sales.update'],
    ]);

    $response->assertRedirect("/admin/tenants/{$tenant->id}/roles");

    app(TenantManager::class)->runAs($tenant, function () use ($encargado) {
        $fresh = $encargado->fresh();
        expect($fresh->name)->toBe('Encargado')
            ->and($fresh->permissions->pluck('name'))->toContain('sales.update');
    });
});

it('blocks deleting a system role', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $encargado = app(TenantManager::class)->runAs($tenant, fn () => Role::where('tenant_id', $tenant->id)->where('name', 'Encargado')->first());

    $this->actingAs(tenantRolesSuperAdmin())
        ->delete("/admin/tenants/{$tenant->id}/roles/{$encargado->id}")
        ->assertForbidden();
});

it('blocks deleting a custom role that still has users assigned, accurately across tenants', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    // Another tenant's role happens to share nothing with this one, but
    // exercises that the users()->count() check isn't accidentally
    // confused by a totally different tenant's model_has_roles rows.
    app(TenantProvisioner::class)->create([
        'business_name' => 'Tienda B', 'admin_name' => 'Admin B', 'admin_email' => 'b@b.test', 'admin_password' => 'password123',
    ]);

    $role = app(TenantManager::class)->runAs($tenant, function () use ($tenant) {
        $role = Role::create(['name' => 'Cajero', 'tenant_id' => $tenant->id, 'guard_name' => 'web', 'data_scope' => 'branch', 'is_default' => false, 'is_system' => false]);
        $user = User::create([
            'name' => 'Empleado', 'email' => 'empleado@cafe.test', 'password' => Hash::make('x'),
            'role' => 'vendedor', 'status' => true, 'email_verified_at' => now(),
        ]);
        $user->assignRole($role);

        return $role;
    });

    $response = $this->actingAs(tenantRolesSuperAdmin())->delete("/admin/tenants/{$tenant->id}/roles/{$role->id}");

    $response->assertSessionHasErrors('role');
    app(TenantManager::class)->runAs($tenant, fn () => expect(Role::find($role->id))->not->toBeNull());
});

it('deletes a custom role with no users assigned', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $role = app(TenantManager::class)->runAs($tenant, fn () => Role::create([
        'name' => 'Cajero', 'tenant_id' => $tenant->id, 'guard_name' => 'web', 'data_scope' => 'branch', 'is_default' => false, 'is_system' => false,
    ]));

    $this->actingAs(tenantRolesSuperAdmin())
        ->delete("/admin/tenants/{$tenant->id}/roles/{$role->id}")
        ->assertRedirect("/admin/tenants/{$tenant->id}/roles");

    app(TenantManager::class)->runAs($tenant, fn () => expect(Role::find($role->id))->toBeNull());
});

it('prevents an update that would leave the tenant with no role able to manage roles', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $administrador = app(TenantManager::class)->runAs($tenant, fn () => Role::where('tenant_id', $tenant->id)->where('name', 'Administrador')->first());

    $response = $this->actingAs(tenantRolesSuperAdmin())->put("/admin/tenants/{$tenant->id}/roles/{$administrador->id}", [
        'name' => 'Administrador', 'data_scope' => 'all', 'permissions' => ['dashboard.view'],
    ]);

    $response->assertSessionHasErrors('permissions');
    app(TenantManager::class)->runAs($tenant, function () use ($administrador) {
        expect($administrador->fresh()->permissions->pluck('name'))->toContain('settings.roles.manage');
    });
});

it('refuses to reach a role that belongs to a different tenant than the one in the URL', function () {
    $tenantA = app(TenantProvisioner::class)->create([
        'business_name' => 'Tienda A', 'admin_name' => 'Admin A', 'admin_email' => 'a@a.test', 'admin_password' => 'password123',
    ]);
    $tenantB = app(TenantProvisioner::class)->create([
        'business_name' => 'Tienda B', 'admin_name' => 'Admin B', 'admin_email' => 'b@b.test', 'admin_password' => 'password123',
    ]);
    $roleB = app(TenantManager::class)->runAs($tenantB, fn () => Role::where('tenant_id', $tenantB->id)->where('name', 'Encargado')->first());

    $superAdmin = tenantRolesSuperAdmin();

    $this->actingAs($superAdmin)->get("/admin/tenants/{$tenantA->id}/roles/{$roleB->id}/edit")->assertNotFound();

    // Same guard on the mutating routes, not just the GET edit form — a
    // super admin can't update or delete tenant B's role through tenant A's
    // URL segment just because the {role} id resolves to a real row.
    $this->actingAs($superAdmin)
        ->put("/admin/tenants/{$tenantA->id}/roles/{$roleB->id}", ['name' => 'Hacked', 'data_scope' => 'branch', 'permissions' => []])
        ->assertNotFound();
    $this->actingAs($superAdmin)->delete("/admin/tenants/{$tenantA->id}/roles/{$roleB->id}")->assertNotFound();

    app(TenantManager::class)->runAs($tenantB, fn () => expect($roleB->fresh()->name)->toBe('Encargado'));
});

it('forbids a tenant user from reaching any of the admin role routes', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());

    $this->actingAs($admin)->get("/admin/tenants/{$tenant->id}/roles")->assertForbidden();
    $this->actingAs($admin)->get("/admin/tenants/{$tenant->id}/roles/create")->assertForbidden();
});

it('does not disturb the tenant-facing /settings/roles behavior — a role edited from admin is visible there too', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());
    $encargado = app(TenantManager::class)->runAs($tenant, fn () => Role::where('tenant_id', $tenant->id)->where('name', 'Encargado')->first());

    $this->actingAs(tenantRolesSuperAdmin())->put("/admin/tenants/{$tenant->id}/roles/{$encargado->id}", [
        'name' => 'Encargado', 'data_scope' => 'branch', 'description' => 'Ajustado por soporte', 'permissions' => ['sales.update'],
    ])->assertRedirect();

    $response = $this->actingAs($admin)->get(route('settings.roles.edit', $encargado->id));

    $response->assertOk();
    expect($response->viewData('page')['props']['role']['description'])->toBe('Ajustado por soporte');
    expect($response->viewData('page')['props']['role']['permissions'])->toContain('sales.update');
});
