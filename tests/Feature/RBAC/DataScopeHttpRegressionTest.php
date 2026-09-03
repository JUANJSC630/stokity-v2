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

it('an Encargado cannot view, edit, or delete a product from another branch by guessing its ID', function () {
    // CodeRabbit PR-12 finding: ProductController's record-level actions had
    // no branch-ownership check at all — only the index() listing was
    // scoped. Encargado holds products.update/delete by default (only
    // users./branches./settings./payment_methods.write/sales.view_deleted
    // are excluded), so this was a live IDOR against real production data,
    // not just a future-custom-role gap.
    $manager = roleAssignedUser($this->tenant, $this->branchA, 'encargado', DefaultRoleProvisioner::ENCARGADO);

    $this->actingAs($manager)->get(route('products.show', $this->productB))->assertForbidden();
    $this->actingAs($manager)->get(route('products.edit', $this->productB))->assertForbidden();
    $this->actingAs($manager)->delete(route('products.destroy', $this->productB))->assertForbidden();
});

it('an Encargado cannot edit a product from another branch even by submitting their own branch_id', function () {
    // The deeper bug: ProductRequest::authorize() validated the SUBMITTED
    // branch_id (attacker-controlled), not the bound product's real branch —
    // so simply passing your own branch_id in the form satisfied the old
    // check regardless of which product you targeted, and $product->update()
    // would have silently moved productB into branchA.
    $manager = roleAssignedUser($this->tenant, $this->branchA, 'encargado', DefaultRoleProvisioner::ENCARGADO);

    $this->actingAs($manager)->put(route('products.update', $this->productB), [
        'name' => 'Hijacked', 'code' => $this->productB->code, 'sale_price' => 1, 'tax' => 0,
        'category_id' => $this->productB->category_id, 'min_stock' => 0,
        'branch_id' => $this->branchA->id,
    ])->assertForbidden();

    expect($this->productB->fresh()->branch_id)->toBe($this->branchB->id)
        ->and($this->productB->fresh()->name)->not->toBe('Hijacked');
});

it('an Encargado editing their own product cannot reassign it to another branch via branch_id', function () {
    $manager = roleAssignedUser($this->tenant, $this->branchA, 'encargado', DefaultRoleProvisioner::ENCARGADO);

    $this->actingAs($manager)->put(route('products.update', $this->productA), [
        'name' => $this->productA->name, 'code' => $this->productA->code, 'sale_price' => 1, 'tax' => 0,
        'category_id' => $this->productA->category_id, 'min_stock' => 0,
        'branch_id' => $this->branchB->id,
    ])->assertRedirect(route('products.show', $this->productA));

    expect($this->productA->fresh()->branch_id)->toBe($this->branchA->id);
});

it('an Encargado cannot widen the trashed-products listing past their own branch via ?branch=', function () {
    app(TenantManager::class)->runAs($this->tenant, fn () => $this->productB->delete());
    $manager = roleAssignedUser($this->tenant, $this->branchA, 'encargado', DefaultRoleProvisioner::ENCARGADO);

    $response = $this->actingAs($manager)->get(route('products.trashed', ['branch' => $this->branchB->id]));

    $response->assertOk();
    $ids = collect($response->viewData('page')['props']['products']['data'])->pluck('id');
    expect($ids)->not->toContain($this->productB->id);
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

it('cash-sessions index correctly separates the branch axis from the view_all permission axis', function () {
    // PR-4 update: these were briefly one combined isAdmin() bucket in PR-3
    // (deliberately deferred back then, see git history) — now properly split.
    // A data_scope='all' custom role widens the BRANCH axis (isAdmin prop /
    // availableBranches / branch filter) without needing cash_sessions.view_all,
    // exactly like every other module's branch-scope check — but still can't
    // see OTHER people's sessions, since that's the separate ownership axis.
    \Illuminate\Support\Facades\DB::table('roles')
        ->where('name', 'Encargado')
        ->update(['data_scope' => 'all']);

    $regionalManager = roleAssignedUser($this->tenant, $this->branchA, 'encargado', DefaultRoleProvisioner::ENCARGADO);
    $otherSession = app(TenantManager::class)->runAs($this->tenant, function () {
        $someoneElse = User::factory()->create(['role' => 'vendedor', 'branch_id' => $this->branchA->id]);

        return \App\Models\CashSession::create([
            'branch_id' => $this->branchA->id, 'opened_by_user_id' => $someoneElse->id,
            'status' => 'open', 'opening_amount' => 0, 'opened_at' => now(),
        ]);
    });

    $response = $this->actingAs($regionalManager)->get(route('cash-sessions.index'));

    $response->assertOk();
    $props = $response->viewData('page')['props'];
    // Branch axis: widened by the custom role's data_scope.
    expect($props['isAdmin'])->toBeTrue()
        ->and($props['availableBranches'])->not->toBeEmpty();
    // Ownership axis: still restricted — Encargado excludes cash_sessions.view_all.
    $sessionIds = collect($props['sessions']['data'])->pluck('id');
    expect($sessionIds)->not->toContain($otherSession->id);
});

it('returns report scopes the branches list like its sibling report methods', function () {
    // Pre-existing bug (present in master before this PR too): returnsReport()
    // sent every branch regardless of scope while index()/productsReport()/
    // sellersReport() in the same file already scoped it. Fixed opportunistically
    // since this PR already touches the same pattern in this same file.
    $manager = roleAssignedUser($this->tenant, $this->branchA, 'encargado', DefaultRoleProvisioner::ENCARGADO);

    $response = $this->actingAs($manager)->get(route('reports.returns'));

    $response->assertOk();
    expect($response->viewData('page')['props']['branches'])->toBe([]);
});
