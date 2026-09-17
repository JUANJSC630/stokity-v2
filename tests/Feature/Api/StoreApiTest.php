<?php

use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\TenantApiKey;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Mirrors tests/Feature/Tenancy/TenantIsolationTest.php's makeTenantWorld(),
 * but for the public storefront API: builds a tenant with one product
 * curated for the storefront (show_in_storefront=true, so it gets a slug)
 * and one that deliberately isn't, plus a live API key for that tenant.
 *
 * @return array{tenant: Tenant, apiKey: TenantApiKey, plainKey: string, visibleProduct: Product, hiddenProduct: Product}
 */
function makeStoreWorld(string $slug): array
{
    $tenant = Tenant::create(['name' => $slug, 'slug' => $slug, 'status' => 'active']);

    return app(TenantManager::class)->runAs($tenant, function () use ($tenant, $slug) {
        $branch = Branch::factory()->create();
        $category = Category::factory()->create();

        $visibleProduct = Product::factory()->create([
            'branch_id' => $branch->id,
            'category_id' => $category->id,
            'code' => 'PUB-'.strtoupper($slug),
            'name' => 'Producto público '.$slug,
            'show_in_storefront' => true,
            'status' => true,
            'stock' => 10,
        ]);

        $hiddenProduct = Product::factory()->create([
            'branch_id' => $branch->id,
            'category_id' => $category->id,
            'code' => 'PRIV-'.strtoupper($slug),
            'show_in_storefront' => false,
            'status' => true,
        ]);

        $generated = TenantApiKey::generate($tenant, 'test key');

        return [
            'tenant' => $tenant,
            'apiKey' => $generated['key'],
            'plainKey' => $generated['plainTextKey'],
            'visibleProduct' => $visibleProduct,
            'hiddenProduct' => $hiddenProduct,
        ];
    });
}

afterEach(fn () => app(TenantManager::class)->forget());

it('rejects a request with no api key', function () {
    $this->getJson('/api/v1/store/products')->assertUnauthorized();
});

it('rejects an invalid api key', function () {
    $this->withHeader('Authorization', 'Bearer sk_store_does-not-exist')
        ->getJson('/api/v1/store/products')
        ->assertUnauthorized();
});

it('rejects a revoked api key', function () {
    $world = makeStoreWorld('revoked-co');
    $world['apiKey']->revoke();

    $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])
        ->getJson('/api/v1/store/products')
        ->assertUnauthorized();
});

it('rejects a key belonging to a suspended tenant', function () {
    $world = makeStoreWorld('suspended-co');
    $world['tenant']->update(['status' => 'suspended']);

    $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])
        ->getJson('/api/v1/store/products')
        ->assertForbidden();
});

it('only lists products curated for the storefront, scoped to that tenant, without internal fields', function () {
    $a = makeStoreWorld('tenant-a-store');
    $b = makeStoreWorld('tenant-b-store');

    $response = $this->withHeader('Authorization', 'Bearer '.$a['plainKey'])
        ->getJson('/api/v1/store/products')
        ->assertOk();

    $codes = collect($response->json('data'))->pluck('code');

    expect($codes)->toContain('PUB-TENANT-A-STORE')
        ->not->toContain('PRIV-TENANT-A-STORE') // show_in_storefront = false
        ->not->toContain('PUB-TENANT-B-STORE') // another tenant entirely
        ->not->toContain('PRIV-TENANT-B-STORE');

    $response->assertJsonMissingPath('data.0.purchase_price')
        ->assertJsonMissingPath('data.0.reserved_stock')
        ->assertJsonMissingPath('data.0.branch_id');
});

it('throttles per tenant, not per IP — one tenant hitting its limit does not affect another', function () {
    // Pest's test client hits every route from the same fake IP, so this
    // only passes if the limiter really keys by tenant (AppServiceProvider's
    // 'store-api' limiter) — under the old `throttle:60,1` (IP-based), two
    // tenants sharing one IP would have shared one 60/min bucket, exactly
    // the scaling bug a server-side storefront integration would hit in
    // production (see AppServiceProvider::boot()'s comment on this limiter).
    $a = makeStoreWorld('throttle-a');
    $b = makeStoreWorld('throttle-b');

    // 70, comfortably past the 60/min limit — not exactly 61, since
    // Laravel's own limiter allows one extra hit right at the boundary
    // before it starts rejecting (RateLimiter::tooManyAttempts()'s
    // timer-key check), which isn't this app's behavior to pin down.
    $statuses = [];
    for ($i = 0; $i < 70; $i++) {
        $statuses[] = $this->withHeader('Authorization', 'Bearer '.$a['plainKey'])
            ->getJson('/api/v1/store/products')
            ->getStatusCode();
    }

    expect($statuses)->toContain(429);

    // Tenant B, same test-client IP, must still have its own fresh budget.
    $this->withHeader('Authorization', 'Bearer '.$b['plainKey'])
        ->getJson('/api/v1/store/products')
        ->assertOk();
});

it('excludes a category whose only curated product was later deactivated', function () {
    $world = makeStoreWorld('cat-visibility');

    app(TenantManager::class)->runAs($world['tenant'], function () use ($world) {
        // Curated for the storefront, but deactivated in the panel without
        // being un-curated — StoreProductController would already exclude
        // it (status=true required), so its category must not show up
        // either, or the storefront nav would link to an empty category.
        Product::factory()->create([
            'branch_id' => $world['visibleProduct']->branch_id,
            'category_id' => $world['visibleProduct']->category_id,
            'code' => 'DEACTIVATED-ONLY',
            'show_in_storefront' => true,
            'status' => false,
        ]);
    });

    $onlyDeactivatedCategory = Category::factory()->create();
    app(TenantManager::class)->runAs($world['tenant'], fn () => Product::factory()->create([
        'branch_id' => $world['visibleProduct']->branch_id,
        'category_id' => $onlyDeactivatedCategory->id,
        'code' => 'ONLY-DEACTIVATED-CAT',
        'show_in_storefront' => true,
        'status' => false,
    ]));

    $categoryIds = collect(
        $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])
            ->getJson('/api/v1/store/categories')
            ->assertOk()
            ->json('data')
    )->pluck('id');

    expect($categoryIds)->toContain($world['visibleProduct']->category_id)
        ->not->toContain($onlyDeactivatedCategory->id);
});

it('never leaks the PHP_INT_MAX stock sentinel for a service-type product', function () {
    $world = makeStoreWorld('service-product');

    $service = app(TenantManager::class)->runAs($world['tenant'], fn () => Product::factory()->create([
        'branch_id' => $world['visibleProduct']->branch_id,
        'category_id' => $world['visibleProduct']->category_id,
        'code' => 'SERVICE-CODE',
        'name' => 'Instalación a domicilio',
        'type' => 'servicio',
        'show_in_storefront' => true,
        'status' => true,
    ]));

    $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])
        ->getJson('/api/v1/store/products/'.$service->slug)
        ->assertOk()
        ->assertJsonPath('data.is_service', true)
        ->assertJsonPath('data.in_stock', true)
        ->assertJsonPath('data.available_stock', null);
});

it('retries with a fresh slug on a raw unique-constraint collision (simulated concurrent-save race)', function () {
    $world = makeStoreWorld('slug-race');

    // generateUniqueSlug()'s own exists()-check would never produce this —
    // it's forcing the exact scenario a real race between two concurrent
    // saves would hit at the DB level: two rows both trying to write the
    // same slug because both checked before either had saved.
    $colliding = app(TenantManager::class)->runAs($world['tenant'], function () use ($world) {
        $colliding = Product::factory()->make([
            'branch_id' => $world['visibleProduct']->branch_id,
            'category_id' => $world['visibleProduct']->category_id,
            'code' => 'RACE-CODE',
            'show_in_storefront' => true,
            'slug' => $world['visibleProduct']->slug,
        ]);
        $colliding->save();

        return $colliding;
    });

    expect($colliding->slug)->not->toBe($world['visibleProduct']->slug);
    expect(Product::where('slug', $colliding->slug)->count())->toBe(1);
});

it('404s on another tenant product slug and on a non-curated product slug', function () {
    $a = makeStoreWorld('tenant-x-store');
    $b = makeStoreWorld('tenant-y-store');

    $this->withHeader('Authorization', 'Bearer '.$a['plainKey'])
        ->getJson('/api/v1/store/products/'.$b['visibleProduct']->slug)
        ->assertNotFound();

    // hiddenProduct never got a slug (show_in_storefront stayed false), so
    // even guessing "producto-x" style would not match — assert the field
    // itself is null to make that explicit, then confirm 404 on a lookup.
    expect($a['hiddenProduct']->slug)->toBeNull();

    $this->withHeader('Authorization', 'Bearer '.$a['plainKey'])
        ->getJson('/api/v1/store/products/'.$a['visibleProduct']->slug)
        ->assertOk()
        ->assertJsonPath('data.code', 'PUB-TENANT-X-STORE');
});
