<?php

use App\Authorization\DefaultRoleProvisioner;
use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use Database\Seeders\PermissionSeeder;

/**
 * F6 of PLAN.md: price/code label printing via QZ Tray, from the product
 * detail page (single) and the catalog list (multi-select batch).
 */
uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

function labelPrintUser(Tenant $tenant, Branch $branch, string $legacyRole, string $spatieRole): User
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

beforeEach(function () {
    $this->seed(PermissionSeeder::class);
    $this->tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme', 'status' => 'active']);
    app(DefaultRoleProvisioner::class)->seedFor($this->tenant);

    [$this->branchA, $this->branchB, $this->productA, $this->productB] = app(TenantManager::class)->runAs($this->tenant, function () {
        $a = Branch::create(['name' => 'Zarzal', 'business_name' => 'Acme', 'address' => 'x', 'phone' => 'x', 'status' => true]);
        $b = Branch::create(['name' => 'Cartago', 'business_name' => 'Acme', 'address' => 'x', 'phone' => 'x', 'status' => true]);
        $pa = Product::factory()->create(['branch_id' => $a->id, 'code' => 'PROD-A', 'sale_price' => 15000]);
        $pb = Product::factory()->create(['branch_id' => $b->id, 'code' => 'PROD-B', 'sale_price' => 25000]);

        return [$a, $b, $pa, $pb];
    });

    app(TenantManager::class)->runAs($this->tenant, fn () => BusinessSetting::factory()->create());
});

it('lets an admin print a single label', function () {
    $admin = labelPrintUser($this->tenant, $this->branchA, 'administrador', DefaultRoleProvisioner::ADMINISTRADOR);

    $response = $this->actingAs($admin)->postJson('/print/labels', [
        'product_ids' => [$this->productA->id],
    ]);

    $response->assertOk();
    expect($response->json('data'))->not->toBeEmpty();
    expect(base64_decode((string) $response->json('data')))->not->toBeEmpty();
    expect($response->json('printed_count'))->toBe(1);
});

it('lets an admin print a batch of labels across branches', function () {
    $admin = labelPrintUser($this->tenant, $this->branchA, 'administrador', DefaultRoleProvisioner::ADMINISTRADOR);

    $response = $this->actingAs($admin)->postJson('/print/labels', [
        'product_ids' => [$this->productA->id, $this->productB->id],
    ]);

    $response->assertOk();
    expect($response->json('data'))->not->toBeEmpty();
    expect($response->json('printed_count'))->toBe(2);
});

it('blocks a vendedor from printing labels', function () {
    $seller = labelPrintUser($this->tenant, $this->branchA, 'vendedor', DefaultRoleProvisioner::VENDEDOR);

    $this->actingAs($seller)->postJson('/print/labels', [
        'product_ids' => [$this->productA->id],
    ])->assertForbidden();
});

it('silently drops a product from another branch for a branch-restricted encargado', function () {
    $manager = labelPrintUser($this->tenant, $this->branchA, 'encargado', DefaultRoleProvisioner::ENCARGADO);

    // Only productB (branch B) requested — the encargado is restricted to branch A,
    // so nothing in the batch is printable.
    $this->actingAs($manager)->postJson('/print/labels', [
        'product_ids' => [$this->productB->id],
    ])->assertNotFound();
});

it('prints only the in-branch product when an encargado batch mixes branches', function () {
    $manager = labelPrintUser($this->tenant, $this->branchA, 'encargado', DefaultRoleProvisioner::ENCARGADO);

    $response = $this->actingAs($manager)->postJson('/print/labels', [
        'product_ids' => [$this->productA->id, $this->productB->id],
    ]);

    // Doesn't 403/404 — productA (branch A) is still printable, productB is just excluded.
    // printed_count reflects the exclusion so the frontend can tell the user.
    $response->assertOk();
    expect($response->json('printed_count'))->toBe(1);
});

it('rejects a product_ids batch larger than the allowed cap', function () {
    $admin = labelPrintUser($this->tenant, $this->branchA, 'administrador', DefaultRoleProvisioner::ADMINISTRADOR);

    $this->actingAs($admin)->postJson('/print/labels', [
        'product_ids' => range(1, 101),
    ])->assertUnprocessable();
});

it('strips control bytes from the product name/code so they cannot inject printer commands', function () {
    $admin = labelPrintUser($this->tenant, $this->branchA, 'administrador', DefaultRoleProvisioner::ADMINISTRADOR);
    $maliciousProduct = app(TenantManager::class)->runAs($this->tenant, fn () => Product::factory()->create([
        'branch_id' => $this->branchA->id,
        'name' => "Evil\x1b\x40Product",
        'code' => "COD\x1dVE",
    ]));

    $response = $this->actingAs($admin)->postJson('/print/labels', [
        'product_ids' => [$maliciousProduct->id],
    ]);

    $response->assertOk();
    $bytes = base64_decode((string) $response->json('data'));
    // 0x1B (ESC) is a real control byte and gets stripped; the 0x40 ('@')
    // that followed it is an ordinary printable character and survives —
    // the point is that the ESC-@ command sequence itself never reaches
    // the printer intact, not that every byte of the input disappears.
    expect($bytes)->not->toContain("Evil\x1b\x40Product")
        ->and($bytes)->not->toContain("COD\x1dVE")
        ->and($bytes)->toContain('Evil@Product')
        ->and($bytes)->toContain('CODVE');
});

it('never leaks a product belonging to another tenant', function () {
    $otherTenant = Tenant::create(['name' => 'Other', 'slug' => 'other-biz', 'status' => 'active']);
    app(DefaultRoleProvisioner::class)->seedFor($otherTenant);
    $otherProduct = app(TenantManager::class)->runAs($otherTenant, function () {
        $branch = Branch::create(['name' => 'X', 'business_name' => 'Other', 'address' => 'x', 'phone' => 'x', 'status' => true]);

        return Product::factory()->create(['branch_id' => $branch->id]);
    });

    $admin = labelPrintUser($this->tenant, $this->branchA, 'administrador', DefaultRoleProvisioner::ADMINISTRADOR);

    $this->actingAs($admin)->postJson('/print/labels', [
        'product_ids' => [$otherProduct->id],
    ])->assertNotFound();
});

it('rejects an empty product_ids array', function () {
    $admin = labelPrintUser($this->tenant, $this->branchA, 'administrador', DefaultRoleProvisioner::ADMINISTRADOR);

    $this->actingAs($admin)->postJson('/print/labels', [
        'product_ids' => [],
    ])->assertUnprocessable();
});

it('fails closed instead of leaking every branch when a restricted user has no branch_id', function () {
    // A branch getting deleted nullOnDelete()s every user's branch_id who
    // was assigned to it — isRestrictedToOwnBranch() stays true, but
    // branch_id becomes null. The filter must still apply (as `branch_id
    // IS NULL`, matching nothing real) rather than being skipped outright.
    $manager = labelPrintUser($this->tenant, $this->branchA, 'encargado', DefaultRoleProvisioner::ENCARGADO);
    app(TenantManager::class)->runAs($this->tenant, fn () => $manager->update(['branch_id' => null]));

    $this->actingAs($manager)->postJson('/print/labels', [
        'product_ids' => [$this->productA->id, $this->productB->id],
    ])->assertNotFound();
});
