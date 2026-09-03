<?php

use App\Authorization\DefaultRoleProvisioner;
use App\Models\Branch;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use Database\Seeders\PermissionSeeder;

/**
 * PR-5: the frontend's usePermissions()/<Can> read auth.permissions, shared
 * globally by HandleInertiaRequests. This proves that prop actually carries
 * the user's real Spatie permission set (not just an empty array) and stays
 * correctly scoped per role and per tenant.
 */
uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    $this->seed(PermissionSeeder::class);
    $this->tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme', 'status' => 'active']);
    app(DefaultRoleProvisioner::class)->seedFor($this->tenant);

    $this->branch = app(TenantManager::class)->runAs($this->tenant, fn () => Branch::create([
        'name' => 'Principal', 'business_name' => 'Acme', 'address' => 'x', 'phone' => 'x', 'status' => true,
    ]));
});

it('shares the real permission list for an Administrador', function () {
    $admin = app(TenantManager::class)->runAs($this->tenant, function () {
        $user = User::create([
            'name' => 'Admin', 'email' => 'admin@acme.test', 'password' => bcrypt('x'),
            'role' => 'administrador', 'branch_id' => $this->branch->id, 'status' => true, 'email_verified_at' => now(),
        ]);
        $user->assignRole(DefaultRoleProvisioner::ADMINISTRADOR);

        return $user;
    });

    $response = $this->actingAs($admin)->get(route('dashboard'));

    $permissions = $response->viewData('page')['props']['auth']['permissions'];
    expect($permissions)->toContain('products.create')
        ->and($permissions)->toContain('users.view')
        ->and($permissions)->toContain('dashboard.branch_sales.view');
});

it('shares a narrower permission list for an Encargado, excluding admin-only permissions', function () {
    $manager = app(TenantManager::class)->runAs($this->tenant, function () {
        $user = User::create([
            'name' => 'Manager', 'email' => 'manager@acme.test', 'password' => bcrypt('x'),
            'role' => 'encargado', 'branch_id' => $this->branch->id, 'status' => true, 'email_verified_at' => now(),
        ]);
        $user->assignRole(DefaultRoleProvisioner::ENCARGADO);

        return $user;
    });

    $response = $this->actingAs($manager)->get(route('dashboard'));

    $permissions = $response->viewData('page')['props']['auth']['permissions'];
    expect($permissions)->toContain('products.create')
        ->and($permissions)->not->toContain('users.view')
        ->and($permissions)->not->toContain('sales.update')
        ->and($permissions)->not->toContain('dashboard.branch_sales.view');
});

it('shares the legacy-fallback permission list for a user with no Spatie role assigned yet', function () {
    // Mirrors User::hasPermissionTo()'s fallback: a tenant that hasn't run
    // roles:assign-legacy (or any bare test fixture) must see the SAME
    // permissions here as the backend actually grants them via can() —
    // calling Spatie's getAllPermissions() directly (bypassing the
    // fallback) would wrongly show an empty list and blank sidebar for a
    // user the backend still fully authorizes.
    $legacyAdmin = app(TenantManager::class)->runAs($this->tenant, fn () => User::create([
        'name' => 'Legacy Admin', 'email' => 'legacy-admin@acme.test', 'password' => bcrypt('x'),
        'role' => 'administrador', 'branch_id' => $this->branch->id, 'status' => true, 'email_verified_at' => now(),
    ]));

    expect($legacyAdmin->roles()->exists())->toBeFalse();

    $response = $this->actingAs($legacyAdmin)->get(route('dashboard'));

    $permissions = $response->viewData('page')['props']['auth']['permissions'];
    expect($permissions)->toContain('products.create')
        ->and($permissions)->toContain('users.view')
        ->and($legacyAdmin->can('products.create'))->toBeTrue();
});

it('shares an empty permission list for a guest', function () {
    $response = $this->get(route('login'));

    $permissions = $response->viewData('page')['props']['auth']['permissions'];
    expect($permissions)->toBe([]);
});
