<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\Client;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Tenant;
use App\Models\TenantApiKey;
use App\Models\User;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

afterEach(function () {
    app(TenantManager::class)->forget();
    Carbon::setTestNow();
});

/**
 * @return array{tenant: Tenant, plain: string, branch: Branch, category: Category, product: Product, seller: User, client: Client}
 */
function makeSyncWorld(string $slug): array
{
    $tenant = Tenant::create(['name' => $slug, 'slug' => $slug, 'status' => 'active']);

    return app(TenantManager::class)->runAs($tenant, function () use ($tenant) {
        $branch = Branch::factory()->create();
        $category = Category::factory()->create();

        BusinessSetting::factory()->create(['require_cash_session' => false]);
        PaymentMethod::factory()->create(['code' => 'cash', 'is_active' => true]);
        PaymentMethod::factory()->create(['code' => 'efectivo', 'name' => 'Efectivo', 'is_active' => true]);

        $product = Product::factory()->create([
            'branch_id' => $branch->id,
            'category_id' => $category->id,
            'code' => 'SYNC-1',
            'name' => 'Brazalete',
            'sale_price' => 10000,
            'purchase_price' => 4000,
            'stock' => 10,
            'reserved_stock' => 0,
            'min_stock' => 2,
            'tax' => 0,
            'show_in_storefront' => true,
            'status' => true,
        ]);

        return [
            'tenant' => $tenant,
            'plain' => TenantApiKey::generate($tenant, 'reader')['plainTextKey'],
            'branch' => $branch,
            'category' => $category,
            'product' => $product,
            'seller' => vendedorUser($branch),
            'client' => Client::factory()->create(),
        ];
    });
}

function inTenant(array $world, Closure $callback): mixed
{
    return app(TenantManager::class)->runAs($world['tenant'], $callback);
}

function syncGet(array $world, string $query = '', array $headers = [])
{
    return test()->withHeaders(['Authorization' => 'Bearer '.$world['plain']] + $headers)
        ->getJson('/api/v1/store/products'.($query === '' ? '' : '?'.$query));
}

function sinceParam(Carbon $moment): string
{
    return 'updated_since='.urlencode($moment->toIso8601String());
}

it('exposes created_at and updated_at as ISO 8601 with offset on products and categories', function () {
    Carbon::setTestNow('2026-10-16 14:03:22');
    $world = makeSyncWorld('sync-iso');

    $product = syncGet($world)->assertOk()->json('data.0');

    expect($product['created_at'])->toBe('2026-10-16T14:03:22-05:00')
        ->and($product['updated_at'])->toBe('2026-10-16T14:03:22-05:00')
        ->and($product['category']['created_at'])->toBe('2026-10-16T14:03:22-05:00')
        ->and($product['category']['updated_at'])->toBe('2026-10-16T14:03:22-05:00');
});

it('returns a product changed since the given moment, and an empty list when nothing changed', function () {
    Carbon::setTestNow('2026-10-16 10:00:00');
    $world = makeSyncWorld('sync-basic');

    Carbon::setTestNow('2026-10-16 11:00:00');
    inTenant($world, fn () => $world['product']->update(['name' => 'Brazalete dorado']));

    $changed = syncGet($world, sinceParam(Carbon::parse('2026-10-16 10:30:00')))->assertOk();
    expect($changed->json('data'))->toHaveCount(1)
        ->and($changed->json('data.0.name'))->toBe('Brazalete dorado')
        ->and($changed->json('data.0.visible'))->toBeTrue()
        ->and($changed->json('meta.synced_at'))->toBe('2026-10-16T11:00:00-05:00');

    syncGet($world, sinceParam(Carbon::parse('2026-10-16 11:00:01')))->assertOk()->assertJsonCount(0, 'data');
});

it('compares updated_since inclusively, so nothing is lost at the boundary', function () {
    Carbon::setTestNow('2026-10-16 10:00:00');
    $world = makeSyncWorld('sync-inclusive');

    syncGet($world, sinceParam(Carbon::parse('2026-10-16 10:00:00')))->assertJsonCount(1, 'data');
});

it('reads updated_since in any equivalent ISO 8601 form, including an unencoded plus', function (string $value) {
    Carbon::setTestNow('2026-10-16 12:00:00');
    $world = makeSyncWorld('sync-forms');

    // product updated_at = 12:00:00 Bogota (= 17:00:00Z); since 16:59:59Z includes it.
    $this->withHeader('Authorization', 'Bearer '.$world['plain'])
        ->getJson('/api/v1/store/products?updated_since='.$value)
        ->assertOk()
        ->assertJsonCount(1, 'data');
})->with([
    'utc Z' => '2026-10-16T16:59:59Z',
    'encoded offset' => '2026-10-16T11%3A59%3A59-05%3A00',
    'unencoded plus' => '2026-10-16T21:59:59+05:00',
    'no zone (app timezone)' => '2026-10-16T11:59:59',
    'date only' => '2026-10-16',
]);

it('rejects an invalid updated_since with 422', function (string $value) {
    $world = makeSyncWorld('sync-invalid');

    syncGet($world, 'updated_since='.urlencode($value))->assertUnprocessable()->assertJsonValidationErrors('updated_since');
})->with(['text' => 'ayer', 'bad date' => '2026-13-45T00:00:00Z', 'epoch' => '1760000000', 'sql' => "2026-10-16'; drop"]);

it('returns a product that stopped being public as a minimal visible:false stub, without price or stock', function () {
    Carbon::setTestNow('2026-10-16 10:00:00');
    $world = makeSyncWorld('sync-hidden');

    Carbon::setTestNow('2026-10-16 11:00:00');
    inTenant($world, fn () => $world['product']->update(['show_in_storefront' => false]));

    $row = syncGet($world, sinceParam(Carbon::parse('2026-10-16 10:30:00')))->assertOk()->json('data.0');

    expect($row)->toHaveKeys(['code', 'slug', 'visible', 'updated_at'])
        ->and($row['visible'])->toBeFalse()
        ->and($row['code'])->toBe('SYNC-1')
        ->and($row)->not->toHaveKeys(['price', 'name', 'available_stock', 'in_stock']);
});

it('returns a deactivated product (status=false) as a visible:false stub', function () {
    Carbon::setTestNow('2026-10-16 10:00:00');
    $world = makeSyncWorld('sync-inactive');

    Carbon::setTestNow('2026-10-16 11:00:00');
    inTenant($world, fn () => $world['product']->update(['status' => false]));

    syncGet($world, sinceParam(Carbon::parse('2026-10-16 10:30:00')))
        ->assertJsonPath('data.0.visible', false)
        ->assertJsonPath('data.0.code', 'SYNC-1');
});

it('returns a soft-deleted product as a deleted:true stub with deleted_at', function () {
    Carbon::setTestNow('2026-10-16 10:00:00');
    $world = makeSyncWorld('sync-deleted');

    Carbon::setTestNow('2026-10-16 11:00:00');
    inTenant($world, fn () => $world['product']->delete());

    $row = syncGet($world, sinceParam(Carbon::parse('2026-10-16 10:30:00')))->assertOk()->json('data.0');

    expect($row)->toBe([
        'code' => 'SYNC-1',
        'slug' => $world['product']->slug,
        'deleted' => true,
        'deleted_at' => '2026-10-16T11:00:00-05:00',
        'updated_at' => '2026-10-16T11:00:00-05:00',
    ]);
});

it('never reports a product that was never curated for the storefront', function () {
    Carbon::setTestNow('2026-10-16 10:00:00');
    $world = makeSyncWorld('sync-private');

    $privateId = inTenant($world, fn () => Product::factory()->create([
        'branch_id' => $world['branch']->id,
        'category_id' => $world['category']->id,
        'code' => 'RAW-1',
        'show_in_storefront' => false,
        'status' => true,
    ])->id);

    Carbon::setTestNow('2026-10-16 11:00:00');
    inTenant($world, function () use ($privateId) {
        Product::find($privateId)->update(['stock' => 99]);
        Product::find($privateId)->delete();
    });

    $codes = collect(syncGet($world, sinceParam(Carbon::parse('2026-10-16 10:30:00')))->json('data'))->pluck('code');
    expect($codes)->not->toContain('RAW-1');
});

it('keeps the normal mode untouched: hidden and deleted stay out, ordered by name, no sync fields', function () {
    Carbon::setTestNow('2026-10-16 10:00:00');
    $world = makeSyncWorld('sync-regression');

    inTenant($world, function () use ($world) {
        foreach (['Zeta', 'Alfa'] as $name) {
            Product::factory()->create(['branch_id' => $world['branch']->id, 'category_id' => $world['category']->id, 'name' => $name, 'show_in_storefront' => true, 'status' => true]);
        }
        $gone = Product::factory()->create(['branch_id' => $world['branch']->id, 'category_id' => $world['category']->id, 'name' => 'Borrado', 'show_in_storefront' => true, 'status' => true]);
        $gone->delete();
        Product::factory()->create(['branch_id' => $world['branch']->id, 'category_id' => $world['category']->id, 'name' => 'Oculto', 'show_in_storefront' => false, 'status' => true]);
    });

    $response = syncGet($world)->assertOk();

    expect(collect($response->json('data'))->pluck('name')->all())->toBe(['Alfa', 'Brazalete', 'Zeta'])
        ->and($response->json('data.0'))->not->toHaveKey('visible')
        ->and($response->json('meta'))->not->toHaveKey('synced_at');
});

it('orders sync results by updated_at then id and paginates up to 100 per page', function () {
    Carbon::setTestNow('2026-10-16 10:00:00');
    $world = makeSyncWorld('sync-order');

    inTenant($world, function () use ($world) {
        Carbon::setTestNow('2026-10-16 10:00:05');
        $second = Product::factory()->create(['branch_id' => $world['branch']->id, 'category_id' => $world['category']->id, 'code' => 'B-2', 'name' => 'A last by name', 'show_in_storefront' => true, 'status' => true]);
        $third = Product::factory()->create(['branch_id' => $world['branch']->id, 'category_id' => $world['category']->id, 'code' => 'B-3', 'name' => 'A also', 'show_in_storefront' => true, 'status' => true]);
        expect($third->id)->toBeGreaterThan($second->id);
    });

    $codes = collect(syncGet($world, sinceParam(Carbon::parse('2026-10-16 09:00:00')))->json('data'))->pluck('code')->all();
    expect($codes)->toBe(['SYNC-1', 'B-2', 'B-3']);

    $page = syncGet($world, sinceParam(Carbon::parse('2026-10-16 09:00:00')).'&per_page=2')->assertOk();
    expect($page->json('meta.per_page'))->toBe(2)->and($page->json('meta.last_page'))->toBe(2);

    syncGet($world, 'per_page=100')->assertOk();
    syncGet($world, 'per_page=101')->assertUnprocessable();
});

it('lists the product again after a real POS sale, with the new available_stock', function () {
    Carbon::setTestNow('2026-10-16 10:00:00');
    $world = makeSyncWorld('sync-sale');

    Carbon::setTestNow('2026-10-16 11:00:00');
    $this->actingAs($world['seller'])->post(route('sales.store'), [
        'branch_id' => $world['branch']->id,
        'client_id' => $world['client']->id,
        'seller_id' => $world['seller']->id,
        'net' => 20000,
        'total' => 20000,
        'amount_paid' => 20000,
        'change_amount' => 0,
        'payment_method' => 'cash',
        'date' => now()->format('Y-m-d H:i'),
        'status' => 'completed',
        'discount_type' => 'none',
        'discount_value' => 0,
        'notes' => null,
        'products' => [['id' => $world['product']->id, 'quantity' => 3, 'price' => 10000, 'subtotal' => 30000]],
    ])->assertRedirect();

    app(TenantManager::class)->forget();

    $row = syncGet($world, sinceParam(Carbon::parse('2026-10-16 10:30:00')))->assertOk()->json('data.0');
    expect($row['code'])->toBe('SYNC-1')->and($row['available_stock'])->toBe(7);
});

it('lists the product again when a layaway reserves stock, with available_stock reduced', function () {
    Carbon::setTestNow('2026-10-16 10:00:00');
    $world = makeSyncWorld('sync-reserve');

    Carbon::setTestNow('2026-10-16 11:00:00');
    $this->actingAs($world['seller'])->post(route('credits.store'), [
        'type' => 'layaway',
        'client_id' => $world['client']->id,
        'branch_id' => $world['branch']->id,
        'notes' => null,
        'due_date' => null,
        'installments_count' => null,
        'initial_payment' => null,
        'initial_payment_method' => null,
        'items' => [['product_id' => $world['product']->id, 'quantity' => 4, 'unit_price' => 10000, 'subtotal' => 40000]],
    ])->assertRedirect();

    app(TenantManager::class)->forget();

    $row = syncGet($world, sinceParam(Carbon::parse('2026-10-16 10:30:00')))->assertOk()->json('data.0');
    expect($row['code'])->toBe('SYNC-1')->and($row['available_stock'])->toBe(6);
});

it('bumps updated_at when the gallery changes or the category is renamed', function () {
    Carbon::setTestNow('2026-10-16 10:00:00');
    $world = makeSyncWorld('sync-touch');

    Carbon::setTestNow('2026-10-16 11:00:00');
    inTenant($world, fn () => ProductImage::create(['product_id' => $world['product']->id, 'image' => 'https://x.public.blob.vercel-storage.com/a.webp', 'sort_order' => 0]));
    expect($world['product']->fresh()->updated_at->toIso8601String())->toBe('2026-10-16T11:00:00-05:00');

    Carbon::setTestNow('2026-10-16 12:00:00');
    inTenant($world, fn () => Category::find($world['category']->id)->update(['name' => 'Renombrada']));
    expect($world['product']->fresh()->updated_at->toIso8601String())->toBe('2026-10-16T12:00:00-05:00');
});

it('answers 304 when If-None-Match matches, for the list and the detail', function () {
    $world = makeSyncWorld('sync-etag');
    $slug = $world['product']->slug;

    foreach (['/api/v1/store/products', '/api/v1/store/products/'.$slug] as $path) {
        $first = $this->withHeader('Authorization', 'Bearer '.$world['plain'])->getJson($path)->assertOk();
        $etag = $first->headers->get('ETag');

        expect($etag)->toStartWith('W/"')
            ->and($first->headers->get('Cache-Control'))->toContain('no-cache');

        $this->withHeaders(['Authorization' => 'Bearer '.$world['plain'], 'If-None-Match' => $etag])->getJson($path)
            ->assertStatus(304)->assertHeader('ETag', $etag);

        $this->withHeaders(['Authorization' => 'Bearer '.$world['plain'], 'If-None-Match' => '"nope", '.$etag])->getJson($path)->assertStatus(304);
        $this->withHeaders(['Authorization' => 'Bearer '.$world['plain'], 'If-None-Match' => '*'])->getJson($path)->assertStatus(304);
        $this->withHeaders(['Authorization' => 'Bearer '.$world['plain'], 'If-None-Match' => 'W/"stale"'])->getJson($path)->assertOk();
    }
});

it('changes the ETag when the product changes, so the next revalidation gets a 200', function () {
    $world = makeSyncWorld('sync-etag-change');
    $etag = syncGet($world)->headers->get('ETag');

    inTenant($world, fn () => $world['product']->update(['name' => 'Otro nombre']));

    syncGet($world, '', ['If-None-Match' => $etag])->assertOk();
});

it('still answers 304 in sync mode even though meta.synced_at moves on every call', function () {
    Carbon::setTestNow('2026-10-16 10:00:00');
    $world = makeSyncWorld('sync-etag-sync');
    $query = sinceParam(Carbon::parse('2026-10-16 09:00:00'));

    $first = syncGet($world, $query)->assertOk();
    Carbon::setTestNow('2026-10-16 10:05:00');

    syncGet($world, $query, ['If-None-Match' => $first->headers->get('ETag')])->assertStatus(304);
});

it('never lets a key of business A see products of business B through updated_since', function () {
    Carbon::setTestNow('2026-10-16 10:00:00');
    $a = makeSyncWorld('sync-iso-a');
    $b = makeSyncWorld('sync-iso-b');

    Carbon::setTestNow('2026-10-16 11:00:00');
    inTenant($b, fn () => $b['product']->delete());
    inTenant($b, fn () => Product::factory()->create(['branch_id' => $b['branch']->id, 'category_id' => $b['category']->id, 'code' => 'ONLY-B', 'show_in_storefront' => true, 'status' => true]));

    $codes = collect(syncGet($a, sinceParam(Carbon::parse('2026-10-16 09:00:00')))->json('data'))->pluck('code')->all();

    expect($codes)->toBe(['SYNC-1'])
        ->and(syncGet($a, sinceParam(Carbon::parse('2026-10-16 09:00:00')))->json('data.0.deleted'))->toBeNull();
});

it('keeps internal fields out of every sync row', function () {
    Carbon::setTestNow('2026-10-16 10:00:00');
    $world = makeSyncWorld('sync-whitelist');

    $row = syncGet($world, sinceParam(Carbon::parse('2026-10-16 09:00:00')))->json('data.0');

    expect($row)->not->toHaveKeys(['purchase_price', 'reserved_stock', 'min_stock', 'stock', 'branch_id', 'tenant_id', 'show_in_storefront']);
});
