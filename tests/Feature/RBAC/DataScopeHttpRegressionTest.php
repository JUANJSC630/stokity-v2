<?php

use App\Authorization\DefaultRoleProvisioner;
use App\Models\Branch;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use Database\Seeders\PermissionSeeder;

/**
 * AccessSnapshotTest proves the legacy-fallback path (no Spatie role assigned)
 * is byte-identical before/after PR-3. This file proves the OTHER half: real
 * production state now has every user role-assigned (roles:assign-legacy
 * already ran), so these hit the same routes with an actual Spatie role
 * attached, and — the whole point of this migration — a custom role with
 * data_scope='all' widens access on a live route without touching any
 * controller.
 */
uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    $this->seed(PermissionSeeder::class);
    $this->tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme', 'status' => 'active']);
    app(DefaultRoleProvisioner::class)->seedFor($this->tenant);

    [$this->branchA, $this->branchB, $this->productA, $this->productB] = app(TenantManager::class)->runAs($this->tenant, function () {
        $a = Branch::create(['name' => 'Zarzal', 'business_name' => 'Acme', 'address' => 'x', 'phone' => 'x', 'status' => true]);
        $b = Branch::create(['name' => 'Cartago', 'business_name' => 'Acme', 'address' => 'x', 'phone' => 'x', 'status' => true]);
        $pa = Product::factory()->create(['branch_id' => $a->id]);
        $pb = Product::factory()->create(['branch_id' => $b->id]);

        return [$a, $b, $pa, $pb];
    });

    \App\Models\BusinessSetting::factory()->create();
});

function roleAssignedUser(Tenant $tenant, Branch $branch, string $legacyRole, string $spatieRole): User
{
    return app(TenantManager::class)->runAs($tenant, function () use ($branch, $legacyRole, $spatieRole) {
        $user = User::create([
            'name' => 'Test', 'email' => uniqid().'@acme.test', 'password' => bcrypt('x'),
            'role' => $legacyRole, 'branch_id' => $branch->id, 'status' => true, 'email_verified_at' => now(),
        ]);
        $user->assignRole($spatieRole);

        return $user;
    });
}

it('an Administrador with a real Spatie role sees products from every branch', function () {
    $admin = roleAssignedUser($this->tenant, $this->branchA, 'administrador', DefaultRoleProvisioner::ADMINISTRADOR);

    $response = $this->actingAs($admin)->get(route('products.index'));

    $response->assertOk();
    $ids = collect($response->viewData('page')['props']['products']['data'])->pluck('id');
    expect($ids)->toContain($this->productA->id)
        ->and($ids)->toContain($this->productB->id);
});

it('an Encargado with a real Spatie role only sees products from their own branch', function () {
    $manager = roleAssignedUser($this->tenant, $this->branchA, 'encargado', DefaultRoleProvisioner::ENCARGADO);

    $response = $this->actingAs($manager)->get(route('products.index'));

    $response->assertOk();
    $ids = collect($response->viewData('page')['props']['products']['data'])->pluck('id');
    expect($ids)->toContain($this->productA->id)
        ->and($ids)->not->toContain($this->productB->id);
});

it('an Encargado with a real Spatie role cannot open a product from another branch', function () {
    // stock-movements.product is gated by AdminOrManagerMiddleware (PR-0), so
    // a vendedor can't reach it at all — use Encargado to test the record-level
    // abort_if() inside the controller instead.
    $manager = roleAssignedUser($this->tenant, $this->branchA, 'encargado', DefaultRoleProvisioner::ENCARGADO);

    $this->actingAs($manager)
        ->get(route('stock-movements.product', $this->productB))
        ->assertForbidden();

    $this->actingAs($manager)
        ->get(route('stock-movements.product', $this->productA))
        ->assertOk();
});

it('THE KEY CAPABILITY: a custom role with data_scope=all sees every branch, with zero controller changes', function () {
    // Exactly what a tenant admin does from the future role-management UI:
    // duplicate Encargado, flip its data_scope. No code touched.
    $regional = app(TenantManager::class)->runAs($this->tenant, function () {
        return \Spatie\Permission\Models\Role::create([
            'name' => 'Encargado Regional', 'guard_name' => 'web', 'data_scope' => 'all',
        ])->syncPermissions(\App\Authorization\PermissionCatalog::names());
    });

    $regionalManager = app(TenantManager::class)->runAs($this->tenant, function () {
        $user = User::create([
            'name' => 'Regional', 'email' => 'regional@acme.test', 'password' => bcrypt('x'),
            'role' => 'encargado', 'branch_id' => $this->branchA->id, 'status' => true, 'email_verified_at' => now(),
        ]);
        $user->assignRole('Encargado Regional');

        return $user;
    });

    $response = $this->actingAs($regionalManager)->get(route('products.index'));

    $response->assertOk();
    $ids = collect($response->viewData('page')['props']['products']['data'])->pluck('id');
    expect($ids)->toContain($this->productA->id)
        ->and($ids)->toContain($this->productB->id);
});

it('cross-tenant isolation still holds regardless of data_scope', function () {
    // data_scope='all' means "every branch of MY tenant", never another tenant's.
    $otherTenant = Tenant::create(['name' => 'Other', 'slug' => 'other', 'status' => 'active']);
    app(DefaultRoleProvisioner::class)->seedFor($otherTenant);
    $otherProduct = app(TenantManager::class)->runAs($otherTenant, function () {
        $branch = Branch::create(['name' => 'Other Branch', 'business_name' => 'Other', 'address' => 'x', 'phone' => 'x', 'status' => true]);

        return Product::factory()->create(['branch_id' => $branch->id]);
    });

    $admin = roleAssignedUser($this->tenant, $this->branchA, 'administrador', DefaultRoleProvisioner::ADMINISTRADOR);

    $response = $this->actingAs($admin)->get(route('products.index'));

    $ids = collect($response->viewData('page')['props']['products']['data'])->pluck('id');
    expect($ids)->not->toContain($otherProduct->id);
});
