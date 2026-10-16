<?php

use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\TenantApiKey;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

afterEach(fn () => app(TenantManager::class)->forget());

/**
 * @return array{tenant: Tenant, product: Product}
 */
function makeProfilesTenant(string $slug): array
{
    $tenant = Tenant::create(['name' => $slug, 'slug' => $slug, 'status' => 'active']);

    $product = app(TenantManager::class)->runAs($tenant, fn () => Product::factory()->create([
        'branch_id' => Branch::factory()->create()->id,
        'category_id' => Category::factory()->create()->id,
        'name' => 'Producto '.$slug,
        'show_in_storefront' => true,
        'status' => true,
    ]));

    return ['tenant' => $tenant, 'product' => $product];
}

/**
 * Runs store:keys:create and returns the plaintext keys it printed, indexed by key name.
 *
 * @param  array<string, mixed>  $options
 * @return array<string, string>
 */
function createKeysViaCommand(string $tenant, array $options = []): array
{
    $exit = Artisan::call('store:keys:create', ['tenant' => $tenant] + $options);
    $output = Artisan::output();

    expect($exit)->toBe(0);

    preg_match_all('/^(\S+)\s+\(id \d+.*\)\R(sk_store_[A-Za-z0-9]{40})$/m', $output, $matches, PREG_SET_ORDER);

    return collect($matches)->mapWithKeys(fn ($m) => [$m[1] => $m[2]])->all();
}

function asKey(string $plain)
{
    return test()->withHeader('Authorization', 'Bearer '.$plain);
}

it('creates the three profile keys with their scopes and rate limits, storing only hashes', function () {
    $world = makeProfilesTenant('keys-create');

    $keys = createKeysViaCommand('keys-create');

    expect(array_keys($keys))->toBe(['lu-lectura', 'lu-admin', 'lu-pedidos']);

    $rows = TenantApiKey::allTenants()->where('tenant_id', $world['tenant']->id)->get()->keyBy('name');

    expect($rows['lu-lectura']->only(['can_read_catalog', 'can_manage_media', 'can_generate_order_references', 'rate_limit_per_minute']))
        ->toBe(['can_read_catalog' => true, 'can_manage_media' => false, 'can_generate_order_references' => false, 'rate_limit_per_minute' => 300])
        ->and($rows['lu-admin']->only(['can_read_catalog', 'can_manage_media', 'can_generate_order_references', 'rate_limit_per_minute']))
        ->toBe(['can_read_catalog' => true, 'can_manage_media' => true, 'can_generate_order_references' => false, 'rate_limit_per_minute' => 120])
        ->and($rows['lu-pedidos']->only(['can_read_catalog', 'can_manage_media', 'can_generate_order_references', 'rate_limit_per_minute']))
        ->toBe(['can_read_catalog' => false, 'can_manage_media' => false, 'can_generate_order_references' => true, 'rate_limit_per_minute' => 30]);

    foreach ($keys as $name => $plain) {
        expect($rows[$name]->hashed_key)->toBe(TenantApiKey::hash($plain))
            ->and(DB::table('tenant_api_keys')->where('hashed_key', $plain)->exists())->toBeFalse();
    }
});

it('honours custom limits and prefix, and also resolves the tenant by id', function () {
    $world = makeProfilesTenant('keys-options');

    $keys = createKeysViaCommand((string) $world['tenant']->id, ['--prefix' => 'acme', '--read-limit' => 500]);

    expect(array_keys($keys))->toBe(['acme-lectura', 'acme-admin', 'acme-pedidos'])
        ->and(TenantApiKey::allTenants()->where('name', 'acme-lectura')->value('rate_limit_per_minute'))->toBe(500);
});

it('fails for an unknown tenant, a bad rotate profile and a bad limit', function () {
    makeProfilesTenant('keys-fail');

    expect(Artisan::call('store:keys:create', ['tenant' => 'nope']))->toBe(1)
        ->and(Artisan::call('store:keys:create', ['tenant' => 'keys-fail', '--rotate' => 'otro']))->toBe(1)
        ->and(Artisan::call('store:keys:create', ['tenant' => 'keys-fail', '--read-limit' => 'abc']))->toBe(1)
        ->and(TenantApiKey::allTenants()->count())->toBe(0);
});

it('refuses to create duplicates of active keys unless rotating', function () {
    makeProfilesTenant('keys-dup');
    createKeysViaCommand('keys-dup');

    expect(Artisan::call('store:keys:create', ['tenant' => 'keys-dup']))->toBe(1)
        ->and(TenantApiKey::allTenants()->count())->toBe(3);
});

it('orders-only key cannot read anything but can mint order references', function () {
    $world = makeProfilesTenant('keys-orders');
    $keys = createKeysViaCommand('keys-orders');

    foreach (['info', 'categories', 'branches', 'payment-methods', 'products', 'products/'.$world['product']->slug] as $path) {
        asKey($keys['lu-pedidos'])->getJson('/api/v1/store/'.$path)->assertForbidden();
    }

    asKey($keys['lu-pedidos'])->postJson('/api/v1/store/order-reference')->assertCreated();
    asKey($keys['lu-pedidos'])->patchJson('/api/v1/store/products/'.$world['product']->slug, ['show_in_storefront' => false])->assertForbidden();
});

it('read key reads but cannot write or request an order number', function () {
    $world = makeProfilesTenant('keys-read');
    $keys = createKeysViaCommand('keys-read');
    $slug = $world['product']->slug;

    asKey($keys['lu-lectura'])->getJson('/api/v1/store/products')->assertOk();
    asKey($keys['lu-lectura'])->getJson('/api/v1/store/products/'.$slug)->assertOk();
    asKey($keys['lu-lectura'])->postJson('/api/v1/store/order-reference')->assertForbidden();
    asKey($keys['lu-lectura'])->patchJson('/api/v1/store/products/'.$slug, ['show_in_storefront' => false])->assertForbidden();
    asKey($keys['lu-lectura'])->postJson('/api/v1/store/products/'.$slug.'/images', ['image_url' => 'https://x.public.blob.vercel-storage.com/a.webp'])->assertForbidden();
    asKey($keys['lu-lectura'])->deleteJson('/api/v1/store/products/'.$slug.'/images/1')->assertForbidden();
    asKey($keys['lu-lectura'])->putJson('/api/v1/store/products/'.$slug.'/images/order', ['order' => []])->assertForbidden();

    expect($world['product']->fresh()->show_in_storefront)->toBeTrue();
});

it('admin key reads and patches but cannot request an order number', function () {
    $world = makeProfilesTenant('keys-admin');
    $keys = createKeysViaCommand('keys-admin');
    $slug = $world['product']->slug;

    asKey($keys['lu-admin'])->getJson('/api/v1/store/products')->assertOk();
    asKey($keys['lu-admin'])->patchJson('/api/v1/store/products/'.$slug, ['show_in_storefront' => false])->assertOk();
    asKey($keys['lu-admin'])->postJson('/api/v1/store/order-reference')->assertForbidden();

    expect($world['product']->fresh()->show_in_storefront)->toBeFalse();
});

it('never lets a key of business A see or modify business B', function () {
    $a = makeProfilesTenant('keys-iso-a');
    $b = makeProfilesTenant('keys-iso-b');
    $keysA = createKeysViaCommand('keys-iso-a');
    createKeysViaCommand('keys-iso-b');

    $list = asKey($keysA['lu-admin'])->getJson('/api/v1/store/products?visibility=all')->assertOk();
    expect(collect($list->json('data'))->pluck('code')->all())->toBe([$a['product']->code]);

    asKey($keysA['lu-admin'])->getJson('/api/v1/store/products/'.$b['product']->slug)->assertNotFound();
    asKey($keysA['lu-admin'])->patchJson('/api/v1/store/products/'.$b['product']->slug, ['show_in_storefront' => false])->assertNotFound();
    expect($b['product']->fresh()->show_in_storefront)->toBeTrue();

    $reference = asKey($keysA['lu-pedidos'])->postJson('/api/v1/store/order-reference')->assertCreated()->json('order_number');
    expect($reference)->toBe('000001');
});

it('keeps working a key created before can_read_catalog existed (column default)', function () {
    $world = makeProfilesTenant('keys-legacy');
    $plain = 'sk_store_'.str_repeat('a', 40);

    DB::table('tenant_api_keys')->insert([
        'tenant_id' => $world['tenant']->id,
        'name' => 'legacy',
        'key_prefix' => substr($plain, 0, 16),
        'hashed_key' => TenantApiKey::hash($plain),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    asKey($plain)->getJson('/api/v1/store/products')->assertOk();
});

it('rotates without downtime: the new key works while the old one still does, until revoked', function () {
    makeProfilesTenant('keys-rotate');
    $keys = createKeysViaCommand('keys-rotate');

    $new = createKeysViaCommand('keys-rotate', ['--rotate' => 'lectura']);

    expect($new)->toHaveCount(1)
        ->and(array_key_first($new))->toStartWith('lu-lectura-');

    $newPlain = array_values($new)[0];
    asKey($keys['lu-lectura'])->getJson('/api/v1/store/products')->assertOk();
    asKey($newPlain)->getJson('/api/v1/store/products')->assertOk();

    $oldId = TenantApiKey::allTenants()->where('name', 'lu-lectura')->value('id');
    expect(Artisan::call('store:keys:revoke', ['id' => $oldId]))->toBe(0);

    asKey($keys['lu-lectura'])->getJson('/api/v1/store/products')->assertUnauthorized();
    asKey($newPlain)->getJson('/api/v1/store/products')->assertOk();
    expect(Artisan::call('store:keys:revoke', ['id' => $oldId]))->toBe(0)
        ->and(Artisan::call('store:keys:revoke', ['id' => 999999]))->toBe(1);
});
