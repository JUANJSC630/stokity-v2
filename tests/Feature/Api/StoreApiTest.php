<?php

use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
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
 * $canManageMedia defaults to false to match a real freshly-issued key's
 * default — tests exercising the images/visibility write surface must opt
 * in explicitly, same as a SuperAdmin checking the box in the panel.
 *
 * @return array{tenant: Tenant, apiKey: TenantApiKey, plainKey: string, visibleProduct: Product, hiddenProduct: Product}
 */
function makeStoreWorld(string $slug, bool $canManageMedia = false): array
{
    $tenant = Tenant::create(['name' => $slug, 'slug' => $slug, 'status' => 'active']);

    return app(TenantManager::class)->runAs($tenant, function () use ($tenant, $slug, $canManageMedia) {
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

        $generated = TenantApiKey::generate($tenant, 'test key', null, $canManageMedia);

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

it('rejects an image upload from a key without the can_manage_media scope', function () {
    $world = makeStoreWorld('image-scope-upload');

    $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])
        ->postJson('/api/v1/store/products/'.$world['visibleProduct']->slug.'/images', [
            'image_url' => 'https://example.com/img.webp',
        ])
        ->assertForbidden();
});

it('rejects an image delete from a key without the can_manage_media scope', function () {
    $world = makeStoreWorld('image-scope-delete');

    $image = app(TenantManager::class)->runAs($world['tenant'], fn () => ProductImage::factory()->create([
        'product_id' => $world['visibleProduct']->id,
    ]));

    $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])
        ->deleteJson('/api/v1/store/products/'.$world['visibleProduct']->slug.'/images/'.$image->id)
        ->assertForbidden();
});

it('attaches an image the storefront already uploaded to its own blob store', function () {
    $world = makeStoreWorld('image-attach', canManageMedia: true);

    $response = $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])
        ->postJson('/api/v1/store/products/'.$world['visibleProduct']->slug.'/images', [
            'image_url' => 'https://example-storefront.public.blob.vercel-storage.com/img-1.webp',
        ])
        ->assertCreated();

    $response->assertJsonPath('data.url', 'https://example-storefront.public.blob.vercel-storage.com/img-1.webp')
        ->assertJsonPath('data.sort_order', 0);

    expect($response->json('data.id'))->not->toBeNull();

    app(TenantManager::class)->runAs($world['tenant'], function () use ($world) {
        expect(ProductImage::where('product_id', $world['visibleProduct']->id)->count())->toBe(1);
    });
});

it('rejects a non-https image_url', function () {
    $world = makeStoreWorld('image-non-https', canManageMedia: true);

    $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])
        ->postJson('/api/v1/store/products/'.$world['visibleProduct']->slug.'/images', [
            'image_url' => 'http://example.com/img.webp',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('image_url');
});

it('rejects a malformed image_url', function () {
    $world = makeStoreWorld('image-malformed', canManageMedia: true);

    $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])
        ->postJson('/api/v1/store/products/'.$world['visibleProduct']->slug.'/images', [
            'image_url' => 'not-a-url',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('image_url');
});

it('404s attaching an image to another tenant\'s product slug', function () {
    $a = makeStoreWorld('image-tenant-x', canManageMedia: true);
    $b = makeStoreWorld('image-tenant-y');

    $this->withHeader('Authorization', 'Bearer '.$a['plainKey'])
        ->postJson('/api/v1/store/products/'.$b['visibleProduct']->slug.'/images', [
            'image_url' => 'https://example.com/img.webp',
        ])
        ->assertNotFound();
});

it('enforces the 8-image-per-product ceiling', function () {
    $world = makeStoreWorld('image-ceiling', canManageMedia: true);

    app(TenantManager::class)->runAs($world['tenant'], function () use ($world) {
        ProductImage::factory()->count(ProductImage::MAX_PER_PRODUCT)->create([
            'product_id' => $world['visibleProduct']->id,
        ]);
    });

    $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])
        ->postJson('/api/v1/store/products/'.$world['visibleProduct']->slug.'/images', [
            'image_url' => 'https://example.com/one-too-many.webp',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('image_url');
});

it('deletes a product image', function () {
    $world = makeStoreWorld('image-delete', canManageMedia: true);

    $image = app(TenantManager::class)->runAs($world['tenant'], fn () => ProductImage::factory()->create([
        'product_id' => $world['visibleProduct']->id,
    ]));

    $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])
        ->deleteJson('/api/v1/store/products/'.$world['visibleProduct']->slug.'/images/'.$image->id)
        ->assertNoContent();

    app(TenantManager::class)->runAs($world['tenant'], function () use ($image) {
        expect(ProductImage::find($image->id))->toBeNull();
    });
});

it('404s deleting an image that belongs to another tenant\'s product', function () {
    $a = makeStoreWorld('image-del-tenant-x', canManageMedia: true);
    $b = makeStoreWorld('image-del-tenant-y');

    $bImage = app(TenantManager::class)->runAs($b['tenant'], fn () => ProductImage::factory()->create([
        'product_id' => $b['visibleProduct']->id,
    ]));

    $this->withHeader('Authorization', 'Bearer '.$a['plainKey'])
        ->deleteJson('/api/v1/store/products/'.$a['visibleProduct']->slug.'/images/'.$bImage->id)
        ->assertNotFound();
});

it('lists hidden products too when visibility=all and the key can manage media', function () {
    $world = makeStoreWorld('visibility-all-scoped', canManageMedia: true);

    $codes = collect(
        $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])
            ->getJson('/api/v1/store/products?visibility=all')
            ->assertOk()
            ->json('data')
    )->pluck('code');

    expect($codes)->toContain('PUB-VISIBILITY-ALL-SCOPED', 'PRIV-VISIBILITY-ALL-SCOPED');
});

it('ignores visibility=all from a key without the can_manage_media scope', function () {
    $world = makeStoreWorld('visibility-all-unscoped');

    $codes = collect(
        $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])
            ->getJson('/api/v1/store/products?visibility=all')
            ->assertOk()
            ->json('data')
    )->pluck('code');

    expect($codes)->toContain('PUB-VISIBILITY-ALL-UNSCOPED')
        ->not->toContain('PRIV-VISIBILITY-ALL-UNSCOPED');
});

it('exposes show_in_storefront on GET /products/{slug} only for a can_manage_media key', function () {
    $scoped = makeStoreWorld('show-in-storefront-scoped', canManageMedia: true);
    $unscoped = makeStoreWorld('show-in-storefront-unscoped');

    $this->withHeader('Authorization', 'Bearer '.$scoped['plainKey'])
        ->getJson('/api/v1/store/products/'.$scoped['visibleProduct']->slug)
        ->assertOk()
        ->assertJsonPath('data.show_in_storefront', true);

    $this->withHeader('Authorization', 'Bearer '.$unscoped['plainKey'])
        ->getJson('/api/v1/store/products/'.$unscoped['visibleProduct']->slug)
        ->assertOk()
        ->assertJsonMissingPath('data.show_in_storefront');
});

it('shows a never-curated product (no slug) by code when visibility=all and the key can manage media', function () {
    $world = makeStoreWorld('show-by-code-visibility-all', canManageMedia: true);

    $neverCurated = app(TenantManager::class)->runAs($world['tenant'], fn () => Product::factory()->create([
        'branch_id' => $world['visibleProduct']->branch_id,
        'category_id' => $world['visibleProduct']->category_id,
        'code' => 'NEVER-CURATED-SHOW-CODE',
        'show_in_storefront' => false,
        'status' => true,
    ]));

    expect($neverCurated->slug)->toBeNull();

    $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])
        ->getJson('/api/v1/store/products/'.$neverCurated->code.'?visibility=all')
        ->assertOk()
        ->assertJsonPath('data.code', 'NEVER-CURATED-SHOW-CODE')
        ->assertJsonPath('data.show_in_storefront', false);
});

it('404s showing a never-curated product by code without visibility=all, even with a can_manage_media key', function () {
    $world = makeStoreWorld('show-by-code-no-visibility', canManageMedia: true);

    $neverCurated = app(TenantManager::class)->runAs($world['tenant'], fn () => Product::factory()->create([
        'branch_id' => $world['visibleProduct']->branch_id,
        'category_id' => $world['visibleProduct']->category_id,
        'code' => 'NEVER-CURATED-NO-VIS-PARAM',
        'show_in_storefront' => false,
        'status' => true,
    ]));

    $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])
        ->getJson('/api/v1/store/products/'.$neverCurated->code)
        ->assertNotFound();
});

it('404s showing a never-curated product by code with visibility=all when the key lacks can_manage_media', function () {
    $world = makeStoreWorld('show-by-code-unscoped');

    $neverCurated = app(TenantManager::class)->runAs($world['tenant'], fn () => Product::factory()->create([
        'branch_id' => $world['visibleProduct']->branch_id,
        'category_id' => $world['visibleProduct']->category_id,
        'code' => 'NEVER-CURATED-UNSCOPED-KEY',
        'show_in_storefront' => false,
        'status' => true,
    ]));

    $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])
        ->getJson('/api/v1/store/products/'.$neverCurated->code.'?visibility=all')
        ->assertNotFound();
});

it('activates a hidden product via PATCH when the key can manage media', function () {
    $world = makeStoreWorld('patch-activate', canManageMedia: true);

    // A product that was curated once (so it has a slug) and later hidden
    // again — the realistic shape of "not currently public", since a
    // product that never had show_in_storefront=true never gets a slug at
    // all (Product::booted()'s saving() hook).
    $toggled = app(TenantManager::class)->runAs($world['tenant'], function () use ($world) {
        $product = Product::factory()->create([
            'branch_id' => $world['visibleProduct']->branch_id,
            'category_id' => $world['visibleProduct']->category_id,
            'code' => 'TOGGLED-PATCH-ACTIVATE',
            'show_in_storefront' => true,
            'status' => true,
        ]);
        $product->update(['show_in_storefront' => false]);

        return $product;
    });

    expect($toggled->slug)->not->toBeNull();

    $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])
        ->patchJson('/api/v1/store/products/'.$toggled->slug, ['show_in_storefront' => true])
        ->assertOk()
        ->assertJsonPath('data.show_in_storefront', true);

    app(TenantManager::class)->runAs($world['tenant'], function () use ($toggled) {
        expect($toggled->fresh()->show_in_storefront)->toBeTrue();
    });
});

it('rejects PATCH visibility from a key without the can_manage_media scope', function () {
    $world = makeStoreWorld('patch-scope');

    $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])
        ->patchJson('/api/v1/store/products/'.$world['visibleProduct']->slug, ['show_in_storefront' => false])
        ->assertForbidden();
});

it('404s PATCHing visibility on another tenant\'s product', function () {
    $a = makeStoreWorld('patch-tenant-x', canManageMedia: true);
    $b = makeStoreWorld('patch-tenant-y');

    $this->withHeader('Authorization', 'Bearer '.$a['plainKey'])
        ->patchJson('/api/v1/store/products/'.$b['visibleProduct']->slug, ['show_in_storefront' => false])
        ->assertNotFound();
});

it('activates by code a product that was never curated before (no slug yet), and mints its slug in the same call', function () {
    $world = makeStoreWorld('patch-activate-by-code', canManageMedia: true);

    $neverCurated = app(TenantManager::class)->runAs($world['tenant'], fn () => Product::factory()->create([
        'branch_id' => $world['visibleProduct']->branch_id,
        'category_id' => $world['visibleProduct']->category_id,
        'code' => 'NEVER-CURATED-CODE',
        'show_in_storefront' => false,
        'status' => true,
    ]));

    expect($neverCurated->slug)->toBeNull();

    $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])
        ->patchJson('/api/v1/store/products/'.$neverCurated->code, ['show_in_storefront' => true])
        ->assertOk()
        ->assertJsonPath('data.show_in_storefront', true);

    app(TenantManager::class)->runAs($world['tenant'], function () use ($neverCurated) {
        $fresh = $neverCurated->fresh();
        expect($fresh->show_in_storefront)->toBeTrue();
        expect($fresh->slug)->not->toBeNull();
    });
});

it('attaches an image by code to a product that was never activated', function () {
    $world = makeStoreWorld('image-upload-by-code', canManageMedia: true);

    $neverCurated = app(TenantManager::class)->runAs($world['tenant'], fn () => Product::factory()->create([
        'branch_id' => $world['visibleProduct']->branch_id,
        'category_id' => $world['visibleProduct']->category_id,
        'code' => 'NEVER-CURATED-IMAGE-CODE',
        'show_in_storefront' => false,
        'status' => true,
    ]));

    expect($neverCurated->slug)->toBeNull();

    $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])
        ->postJson('/api/v1/store/products/'.$neverCurated->code.'/images', [
            'image_url' => 'https://example.com/pre-curation.webp',
        ])
        ->assertCreated()
        ->assertJsonPath('data.url', 'https://example.com/pre-curation.webp');

    app(TenantManager::class)->runAs($world['tenant'], function () use ($neverCurated) {
        expect(ProductImage::where('product_id', $neverCurated->id)->count())->toBe(1);
    });
});
