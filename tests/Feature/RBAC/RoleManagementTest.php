<?php

use App\Authorization\DefaultRoleProvisioner;
use App\Models\Branch;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use Database\Seeders\PermissionSeeder;

/**
 * PR-6: the role-management UI (/settings/roles) — the piece that makes
 * every prior PR's granular permission plumbing actually usable by a
 * tenant admin, instead of only by developers via tinker.
 */
uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    $this->seed(PermissionSeeder::class);
    $this->tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme', 'status' => 'active']);
    app(DefaultRoleProvisioner::class)->seedFor($this->tenant);

    $this->branch = app(TenantManager::class)->runAs($this->tenant, fn () => Branch::create([
        'name' => 'Principal', 'business_name' => 'Acme', 'address' => 'x', 'phone' => 'x', 'status' => true,
    ]));

    $this->admin = app(TenantManager::class)->runAs($this->tenant, function () {
        $user = User::create([
            'name' => 'Admin', 'email' => 'admin@acme.test', 'password' => bcrypt('x'),
            'role' => 'administrador', 'branch_id' => $this->branch->id, 'status' => true, 'email_verified_at' => now(),
        ]);
        $user->assignRole(DefaultRoleProvisioner::ADMINISTRADOR);

        return $user;
    });
});

it('lists the tenant roles with permission and user counts', function () {
    $response = $this->actingAs($this->admin)->get(route('settings.roles.index'));

    $response->assertOk();
    $names = collect($response->viewData('page')['props']['roles'])->pluck('name');
    expect($names)->toContain('Administrador', 'Encargado', 'Vendedor');
});

it('never lists another tenant\'s roles in the index — Role has no automatic tenant scope', function () {
    $otherTenant = Tenant::create(['name' => 'Other Business', 'slug' => 'other-biz', 'status' => 'active']);
    app(DefaultRoleProvisioner::class)->seedFor($otherTenant);

    $response = $this->actingAs($this->admin)->get(route('settings.roles.index'));

    $tenantIds = collect($response->viewData('page')['props']['roles'])->pluck('id')->map(
        fn ($id) => Role::find($id)->tenant_id,
    );
    expect($tenantIds->unique()->all())->toBe([$this->tenant->id]);
});

it('the lockout check is not fooled by another tenant\'s role also holding settings.roles.manage', function () {
    // Regression: the lockout-prevention query originally had no tenant
    // filter either — an unrelated tenant's Administrador role (which also
    // holds settings.roles.manage) would have made this check wrongly
    // think it was safe to strip the permission from every role in THIS
    // tenant, since "some role somewhere" still had it.
    // Fetch the admin's own role ID before seeding another tenant —
    // seedFor() leaves Spatie's active team switched to whatever it just
    // seeded and doesn't restore it, so any bare (non-runAs()) role lookup
    // done afterward would resolve against the wrong tenant.
    $adminRoleId = app(TenantManager::class)->runAs($this->tenant, fn () => $this->admin->roles()->first()->id);

    $otherTenant = Tenant::create(['name' => 'Other', 'slug' => 'other', 'status' => 'active']);
    app(DefaultRoleProvisioner::class)->seedFor($otherTenant);

    $response = $this->actingAs($this->admin)->put(route('settings.roles.update', $adminRoleId), [
        'name' => 'Administrador',
        'data_scope' => 'all',
        'permissions' => ['dashboard.view'],
    ]);

    $response->assertSessionHasErrors('permissions');
});

it('someone without settings.roles.manage gets 403 on every roles route', function () {
    $manager = app(TenantManager::class)->runAs($this->tenant, function () {
        $user = User::create([
            'name' => 'Manager', 'email' => 'manager@acme.test', 'password' => bcrypt('x'),
            'role' => 'encargado', 'branch_id' => $this->branch->id, 'status' => true, 'email_verified_at' => now(),
        ]);
        $user->assignRole(DefaultRoleProvisioner::ENCARGADO);

        return $user;
    });

    $this->actingAs($manager)->get(route('settings.roles.index'))->assertForbidden();
    $this->actingAs($manager)->get(route('settings.roles.create'))->assertForbidden();
    $this->actingAs($manager)->post(route('settings.roles.store'), ['name' => 'x'])->assertForbidden();
});

it('creates a custom role and auto-expands requires dependencies', function () {
    $response = $this->actingAs($this->admin)->post(route('settings.roles.store'), [
        'name' => 'Cajero',
        'description' => 'Solo POS',
        'data_scope' => 'branch',
        // pos.apply_discount requires pos.access, which requires 4 more —
        // none of those are submitted explicitly.
        'permissions' => ['pos.apply_discount'],
    ]);

    $response->assertRedirect(route('settings.roles.index'));

    app(TenantManager::class)->runAs($this->tenant, function () {
        $role = Role::where('name', 'Cajero')->first();
        expect($role)->not->toBeNull()
            ->and($role->tenant_id)->toBe($this->tenant->id)
            ->and($role->is_system)->toBeFalse()
            ->and($role->is_default)->toBeFalse()
            ->and($role->data_scope)->toBe('branch');

        $names = $role->permissions->pluck('name');
        expect($names)->toContain('pos.apply_discount', 'pos.access', 'sales.create', 'products.view', 'payment_methods.view', 'clients.view');
    });
});

it('rejects a duplicate role name within the same tenant', function () {
    $this->actingAs($this->admin)->post(route('settings.roles.store'), [
        'name' => 'Encargado',
        'data_scope' => 'branch',
        'permissions' => [],
    ])->assertInvalid(['name']);
});

it('allows the same role name in a different tenant', function () {
    $otherTenant = Tenant::create(['name' => 'Other', 'slug' => 'other', 'status' => 'active']);
    app(DefaultRoleProvisioner::class)->seedFor($otherTenant);
    // "Encargado" already exists in $this->tenant and in $otherTenant (both
    // seeded) — creating a *custom* role named "Cajero" in $this->tenant
    // must not collide with a same-named role that could exist elsewhere.
    app(TenantManager::class)->runAs($otherTenant, fn () => Role::create([
        'name' => 'Cajero', 'guard_name' => 'web', 'data_scope' => 'branch', 'is_default' => false, 'is_system' => false,
    ]));

    $this->actingAs($this->admin)->post(route('settings.roles.store'), [
        'name' => 'Cajero',
        'data_scope' => 'branch',
        'permissions' => [],
    ])->assertRedirect(route('settings.roles.index'));
});

it('lets an admin edit a system role permissions but not its name', function () {
    $encargado = app(TenantManager::class)->runAs($this->tenant, fn () => Role::where('name', 'Encargado')->first());

    $response = $this->actingAs($this->admin)->put(route('settings.roles.update', $encargado->id), [
        'name' => 'Renamed Encargado',
        'data_scope' => 'branch',
        'permissions' => ['sales.update'],
    ]);

    $response->assertRedirect(route('settings.roles.index'));

    app(TenantManager::class)->runAs($this->tenant, function () use ($encargado) {
        $fresh = $encargado->fresh();
        expect($fresh->name)->toBe('Encargado')
            ->and($fresh->permissions->pluck('name'))->toContain('sales.update');
    });
});

it('blocks deleting a system role', function () {
    $encargado = app(TenantManager::class)->runAs($this->tenant, fn () => Role::where('name', 'Encargado')->first());

    $this->actingAs($this->admin)->delete(route('settings.roles.destroy', $encargado->id))->assertForbidden();
});

it('blocks deleting a custom role that still has users assigned', function () {
    $role = app(TenantManager::class)->runAs($this->tenant, function () {
        $role = Role::create(['name' => 'Cajero', 'guard_name' => 'web', 'data_scope' => 'branch', 'is_default' => false, 'is_system' => false]);
        $user = User::create([
            'name' => 'Empleado', 'email' => 'empleado@acme.test', 'password' => bcrypt('x'),
            'role' => 'vendedor', 'branch_id' => $this->branch->id, 'status' => true, 'email_verified_at' => now(),
        ]);
        $user->assignRole($role);

        return $role;
    });

    $response = $this->actingAs($this->admin)->delete(route('settings.roles.destroy', $role->id));

    $response->assertSessionHasErrors('role');
    app(TenantManager::class)->runAs($this->tenant, fn () => expect(Role::find($role->id))->not->toBeNull());
});

it('deletes a custom role with no users assigned', function () {
    $role = app(TenantManager::class)->runAs($this->tenant, fn () => Role::create([
        'name' => 'Cajero', 'guard_name' => 'web', 'data_scope' => 'branch', 'is_default' => false, 'is_system' => false,
    ]));

    $this->actingAs($this->admin)->delete(route('settings.roles.destroy', $role->id))
        ->assertRedirect(route('settings.roles.index'));

    app(TenantManager::class)->runAs($this->tenant, fn () => expect(Role::find($role->id))->toBeNull());
});

it('prevents saving a role update that would leave the tenant with no role holding settings.roles.manage', function () {
    // Administrador is the ONLY role with settings.roles.manage in a fresh
    // tenant — stripping it here would lock every future admin out of this
    // very screen.
    $response = $this->actingAs($this->admin)->put(route('settings.roles.update', $this->admin->roles()->first()->id), [
        'name' => 'Administrador',
        'data_scope' => 'all',
        'permissions' => ['dashboard.view'],
    ]);

    $response->assertSessionHasErrors('permissions');
    app(TenantManager::class)->runAs($this->tenant, function () {
        $fresh = Role::where('name', 'Administrador')->first();
        expect($fresh->permissions->pluck('name'))->toContain('settings.roles.manage');
    });
});

it('allows removing settings.roles.manage from one role if another role still holds it', function () {
    $customAdmin = app(TenantManager::class)->runAs($this->tenant, fn () => Role::create([
        'name' => 'Co-Admin', 'guard_name' => 'web', 'data_scope' => 'all', 'is_default' => false, 'is_system' => false,
    ])->syncPermissions(['settings.roles.manage']));

    // Administrador still holds settings.roles.manage, so it's safe to
    // strip it from this second role.
    $response = $this->actingAs($this->admin)->put(route('settings.roles.update', $customAdmin->id), [
        'name' => 'Co-Admin',
        'data_scope' => 'all',
        'permissions' => ['dashboard.view'],
    ]);

    $response->assertRedirect(route('settings.roles.index'));
});

it('blocks deleting a custom role that is the tenant\'s only remaining holder of settings.roles.manage', function () {
    // Regression: destroy() originally had no lockout guard at all (only
    // update() did). Sequence: strip settings.roles.manage from
    // Administrador while a custom Co-Admin role still holds it (allowed —
    // Co-Admin covers the tenant) — then try to delete Co-Admin, which
    // would leave zero roles able to manage roles. A separate user holding
    // ONLY Co-Admin performs the delete attempt, since stripping the
    // permission from Administrador means $this->admin itself can no
    // longer reach any settings.roles.manage-gated route afterward.
    $coAdmin = app(TenantManager::class)->runAs($this->tenant, fn () => Role::create([
        'name' => 'Co-Admin', 'guard_name' => 'web', 'data_scope' => 'all', 'is_default' => false, 'is_system' => false,
    ])->syncPermissions(['settings.roles.manage']));

    $coAdminUser = app(TenantManager::class)->runAs($this->tenant, function () use ($coAdmin) {
        $user = User::create([
            'name' => 'Co-Admin User', 'email' => 'coadmin@acme.test', 'password' => bcrypt('x'),
            'role' => 'administrador', 'branch_id' => $this->branch->id, 'status' => true, 'email_verified_at' => now(),
        ]);
        $user->assignRole($coAdmin);

        return $user;
    });

    $adminRoleId = app(TenantManager::class)->runAs($this->tenant, fn () => $this->admin->roles()->first()->id);
    $this->actingAs($this->admin)->put(route('settings.roles.update', $adminRoleId), [
        'name' => 'Administrador',
        'data_scope' => 'all',
        'permissions' => ['dashboard.view'],
    ])->assertRedirect(route('settings.roles.index'));

    $response = $this->actingAs($coAdminUser)->delete(route('settings.roles.destroy', $coAdmin->id));

    $response->assertSessionHasErrors('role');
    app(TenantManager::class)->runAs($this->tenant, fn () => expect(Role::find($coAdmin->id))->not->toBeNull());
});

it('a tenant admin cannot reach another tenant\'s role by ID', function () {
    $otherTenant = Tenant::create(['name' => 'Other', 'slug' => 'other', 'status' => 'active']);
    app(DefaultRoleProvisioner::class)->seedFor($otherTenant);
    // Role carries no automatic tenant scope (see app/Models/Role.php) —
    // filter explicitly, or this could return $this->tenant's own row.
    $otherRole = Role::where('tenant_id', $otherTenant->id)->where('name', 'Encargado')->first();

    $this->actingAs($this->admin)->get(route('settings.roles.edit', $otherRole->id))->assertNotFound();
});

it('a newly created custom role can be assigned to a user through the user form', function () {
    $role = app(TenantManager::class)->runAs($this->tenant, fn () => Role::create([
        'name' => 'Cajero', 'guard_name' => 'web', 'data_scope' => 'branch', 'is_default' => false, 'is_system' => false,
    ])->syncPermissions(['pos.access', 'sales.create', 'products.view', 'payment_methods.view', 'clients.view']));

    $response = $this->actingAs($this->admin)->post(route('users.store'), [
        'name' => 'Nuevo Cajero',
        'email' => 'cajero@acme.test',
        'role_id' => $role->id,
        'branch_id' => $this->branch->id,
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertRedirect(route('users.index'));

    app(TenantManager::class)->runAs($this->tenant, function () {
        $created = User::where('email', 'cajero@acme.test')->first();
        expect($created->hasRole('Cajero'))->toBeTrue()
            // Custom role, data_scope=branch → legacy string approximates to 'encargado'.
            ->and($created->role)->toBe('encargado')
            ->and($created->can('pos.access'))->toBeTrue()
            ->and($created->can('users.view'))->toBeFalse();
    });
});
