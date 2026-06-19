<?php

use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;

uses(RefreshDatabase::class);

/**
 * Build a self-contained tenant with a branch, category, product and admin user.
 * Created under the tenant context so BelongsToTenant stamps tenant_id on each row.
 *
 * @return array{tenant: Tenant, user: User, product: Product}
 */
function makeTenantWorld(string $slug): array
{
    $tenant = Tenant::create(['name' => $slug, 'slug' => $slug, 'status' => 'active']);

    return app(TenantManager::class)->runAs($tenant, function () use ($tenant, $slug) {
        $branch = Branch::factory()->create();
        $category = Category::factory()->create();
        $product = Product::factory()->create([
            'branch_id' => $branch->id,
            'category_id' => $category->id,
            'code' => 'PROD-'.strtoupper($slug),
        ]);
        $user = User::factory()->create([
            'role' => 'administrador',
            'branch_id' => $branch->id,
            'status' => true,
        ]);

        return ['tenant' => $tenant, 'user' => $user, 'product' => $product];
    });
}

afterEach(fn () => app(TenantManager::class)->forget());

it('only lists products of the authenticated user tenant', function () {
    $a = makeTenantWorld('tenant-a');
    $b = makeTenantWorld('tenant-b');

    $this->actingAs($a['user'])
        ->get('/products')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('products/index')
            ->has('products.data', 1)
            ->where('products.data.0.code', 'PROD-TENANT-A')
        );

    $this->actingAs($b['user'])
        ->get('/products')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('products/index')
            ->has('products.data', 1)
            ->where('products.data.0.code', 'PROD-TENANT-B')
        );
});

it('cannot open another tenant product (404 via scoped route binding)', function () {
    $a = makeTenantWorld('tenant-x');
    $b = makeTenantWorld('tenant-y');

    // User from tenant X tries to view tenant Y's product.
    $this->actingAs($a['user'])
        ->get('/products/'.$b['product']->id)
        ->assertNotFound();
});

it('allows the same product code in two different tenants', function () {
    $a = Tenant::create(['name' => 'ta', 'slug' => 'ta', 'status' => 'active']);
    $b = Tenant::create(['name' => 'tb', 'slug' => 'tb', 'status' => 'active']);
    $tm = app(TenantManager::class);

    $tm->runAs($a, function () {
        $branch = Branch::factory()->create();
        Product::factory()->create(['branch_id' => $branch->id, 'code' => 'SHARED-CODE']);
    });

    // Same code under tenant B must NOT collide.
    $tm->runAs($b, function () {
        $branch = Branch::factory()->create();
        Product::factory()->create(['branch_id' => $branch->id, 'code' => 'SHARED-CODE']);
    });

    expect(Product::withoutGlobalScopes()->where('code', 'SHARED-CODE')->count())->toBe(2);
});

it('blocks login flows for a suspended tenant', function () {
    $tenant = Tenant::create(['name' => 'susp', 'slug' => 'susp', 'status' => 'suspended']);
    $user = app(TenantManager::class)->runAs($tenant, fn () => User::factory()->create([
        'role' => 'administrador',
        'status' => true,
    ]));

    $this->actingAs($user)->get('/dashboard')->assertForbidden();
});

it('still allows a suspended-tenant user to log out', function () {
    $tenant = Tenant::create(['name' => 'susp2', 'slug' => 'susp2', 'status' => 'suspended']);
    $user = app(TenantManager::class)->runAs($tenant, fn () => User::factory()->create([
        'role' => 'administrador',
        'status' => true,
    ]));

    $this->actingAs($user)->post('/logout')->assertRedirect();
});

it('fails closed when the user tenant no longer exists', function () {
    $world = makeTenantWorld('gone');
    $world['tenant']->delete(); // soft delete → Tenant::find() returns null

    $this->actingAs($world['user'])->get('/dashboard')->assertForbidden();
});
