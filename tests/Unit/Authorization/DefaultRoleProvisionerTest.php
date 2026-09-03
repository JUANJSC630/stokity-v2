<?php

use App\Authorization\DefaultRoleProvisioner;
use App\Authorization\PermissionCatalog;
use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Permissions are global, seeded once — mirrors what PermissionSeeder does.
    foreach (PermissionCatalog::names() as $name) {
        \Spatie\Permission\Models\Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
    }
});

it('creates the 3 default roles for a tenant, marked default and system', function () {
    $tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme', 'status' => 'active']);

    (new DefaultRoleProvisioner)->seedFor($tenant);

    app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);
    $roles = Role::where('tenant_id', $tenant->id)->pluck('name')->sort()->values();

    expect($roles->all())->toBe(['Administrador', 'Encargado', 'Vendedor']);

    foreach (['Administrador', 'Encargado', 'Vendedor'] as $name) {
        $role = Role::where('tenant_id', $tenant->id)->where('name', $name)->first();
        expect($role->is_default)->toBeTrue()
            ->and($role->is_system)->toBeTrue();
    }
});

it('gives Administrador every permission in the catalog', function () {
    $tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme', 'status' => 'active']);
    (new DefaultRoleProvisioner)->seedFor($tenant);
    app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);

    $admin = Role::where('tenant_id', $tenant->id)->where('name', 'Administrador')->first();

    expect($admin->permissions->pluck('name')->sort()->values()->all())
        ->toBe(collect(PermissionCatalog::names())->sort()->values()->all());
    expect($admin->data_scope)->toBe('all');
});

it('keeps Encargado away from users, branches, payment methods and role management', function () {
    $tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme', 'status' => 'active']);
    (new DefaultRoleProvisioner)->seedFor($tenant);
    app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);

    $encargado = Role::where('tenant_id', $tenant->id)->where('name', 'Encargado')->first();
    $names = $encargado->permissions->pluck('name');

    expect($names->contains(fn (string $n) => str_starts_with($n, 'users.')))->toBeFalse()
        ->and($names->contains(fn (string $n) => str_starts_with($n, 'branches.')))->toBeFalse()
        ->and($names->contains(fn (string $n) => str_starts_with($n, 'payment_methods.')))->toBeFalse()
        ->and($names)->not->toContain('settings.roles.manage')
        ->and($names)->not->toContain('sales.view_deleted')
        ->and($names)->not->toContain('sales.delete')
        ->and($names)->not->toContain('reports.branches.view')
        ->and($names)->toContain('finances.view')
        ->and($names)->toContain('stock_movements.create')
        ->and($encargado->data_scope)->toBe('branch');
});

it('keeps Vendedor to POS, sales, clients, credits and blind cash sessions', function () {
    $tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme', 'status' => 'active']);
    (new DefaultRoleProvisioner)->seedFor($tenant);
    app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);

    $vendedor = Role::where('tenant_id', $tenant->id)->where('name', 'Vendedor')->first();
    $names = $vendedor->permissions->pluck('name');

    expect($names)->toContain('pos.access')
        ->and($names)->toContain('sales.create')
        ->and($names)->toContain('clients.create')
        ->and($names)->toContain('credits.register_payment')
        ->and($names)->not->toContain('products.view_purchase_price')
        ->and($names)->not->toContain('cash_sessions.view_expected')
        ->and($names)->not->toContain('cash_sessions.view_all')
        ->and($names)->not->toContain('reports.view')
        ->and($names)->not->toContain('finances.view')
        ->and($names)->not->toContain('products.create');
});

it('is idempotent: re-seeding does not duplicate roles or lose the tenant scope', function () {
    $tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme', 'status' => 'active']);
    $provisioner = new DefaultRoleProvisioner;

    $provisioner->seedFor($tenant);
    $provisioner->seedFor($tenant);

    app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);
    expect(Role::where('tenant_id', $tenant->id)->count())->toBe(3);
});

it('never lets two tenants share role rows', function () {
    $a = Tenant::create(['name' => 'A', 'slug' => 'a', 'status' => 'active']);
    $b = Tenant::create(['name' => 'B', 'slug' => 'b', 'status' => 'active']);
    $provisioner = new DefaultRoleProvisioner;

    $provisioner->seedFor($a);
    $provisioner->seedFor($b);

    expect(Role::where('tenant_id', $a->id)->count())->toBe(3)
        ->and(Role::where('tenant_id', $b->id)->count())->toBe(3)
        ->and(Role::count())->toBe(6);
});
