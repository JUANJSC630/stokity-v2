<?php

use App\Models\StorefrontIdempotencyKey;
use App\Models\StorefrontOrderCounter;
use App\Models\Tenant;
use App\Models\TenantApiKey;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

afterEach(fn () => app(TenantManager::class)->forget());

/**
 * @return array{tenant: Tenant, key: TenantApiKey, plain: string}
 */
function makeOrdersKey(string $slug): array
{
    $tenant = Tenant::create(['name' => $slug, 'slug' => $slug, 'status' => 'active']);
    $generated = TenantApiKey::generate($tenant, 'orders', null, false, true, null, false);

    return ['tenant' => $tenant, 'key' => $generated['key'], 'plain' => $generated['plainTextKey']];
}

function postReference(string $plain, ?string $idempotencyKey = null)
{
    $headers = ['Authorization' => 'Bearer '.$plain];

    if ($idempotencyKey !== null) {
        $headers['Idempotency-Key'] = $idempotencyKey;
    }

    return test()->withHeaders($headers)->postJson('/api/v1/store/order-reference');
}

it('returns 201 the first time and 200 with the same number on repetition, without consuming a number', function () {
    $w = makeOrdersKey('idem-basic');

    $first = postReference($w['plain'], 'checkout-abc-0001')->assertCreated();
    $second = postReference($w['plain'], 'checkout-abc-0001')->assertOk()->assertHeader('Idempotency-Replayed', 'true');
    $third = postReference($w['plain'], 'checkout-abc-0001')->assertOk();

    expect($first->headers->has('Idempotency-Replayed'))->toBeFalse()
        ->and($first->json('order_number'))->toBe('IDEM-BASIC-000001')
        ->and($second->json('order_number'))->toBe('IDEM-BASIC-000001')
        ->and($third->json('order_number'))->toBe('IDEM-BASIC-000001');

    postReference($w['plain'], 'checkout-abc-0002')->assertCreated()->assertJson(['order_number' => 'IDEM-BASIC-000002']);

    expect(StorefrontOrderCounter::where('tenant_id', $w['tenant']->id)->value('next_number'))->toBe(3);
});

it('keeps the legacy behaviour without the header: every call burns a new number', function () {
    $w = makeOrdersKey('idem-legacy');

    expect(postReference($w['plain'])->assertCreated()->json('order_number'))->toBe('IDEM-LEGACY-000001')
        ->and(postReference($w['plain'])->assertCreated()->json('order_number'))->toBe('IDEM-LEGACY-000002');
    expect(StorefrontIdempotencyKey::count())->toBe(0);
});

it('scopes the idempotency key to the API key: another key gets its own number', function () {
    $w = makeOrdersKey('idem-keys');
    $other = TenantApiKey::generate($w['tenant'], 'orders-2', null, false, true, null, false)['plainTextKey'];

    postReference($w['plain'], 'shared-header-1')->assertCreated()->assertJson(['order_number' => 'IDEM-KEYS-000001']);
    postReference($other, 'shared-header-1')->assertCreated()->assertJson(['order_number' => 'IDEM-KEYS-000002']);
    postReference($w['plain'], 'shared-header-1')->assertOk()->assertJson(['order_number' => 'IDEM-KEYS-000001']);
});

it('never shares idempotency keys across businesses', function () {
    $a = makeOrdersKey('idem-a');
    $b = makeOrdersKey('idem-b');

    postReference($a['plain'], 'same-header-xyz')->assertCreated()->assertJson(['order_number' => 'IDEM-A-000001']);
    postReference($b['plain'], 'same-header-xyz')->assertCreated()->assertJson(['order_number' => 'IDEM-B-000001']);
    postReference($b['plain'], 'same-header-xyz')->assertOk()->assertJson(['order_number' => 'IDEM-B-000001']);
    postReference($a['plain'], 'same-header-xyz')->assertOk()->assertJson(['order_number' => 'IDEM-A-000001']);
});

it('rejects a malformed Idempotency-Key with 422', function (string $header) {
    $w = makeOrdersKey('idem-invalid');

    postReference($w['plain'], $header)->assertUnprocessable()->assertJsonValidationErrors('idempotency_key');
    expect(StorefrontOrderCounter::where('tenant_id', $w['tenant']->id)->exists())->toBeFalse();
})->with([
    'too short' => 'abc1234',
    'too long' => str_repeat('a', 65),
    'bad characters' => 'hola mundo 1234',
    'symbols' => 'abc/def?ghi=1',
    'empty' => '',
]);

it('accepts the boundary lengths 8 and 64', function () {
    $w = makeOrdersKey('idem-bounds');

    postReference($w['plain'], str_repeat('a', 8))->assertCreated();
    postReference($w['plain'], str_repeat('B', 64))->assertCreated();
    postReference($w['plain'], 'A_b-9'.str_repeat('z', 3))->assertCreated();
});

it('forgets the key after 24 hours and mints a new number', function () {
    $w = makeOrdersKey('idem-expiry');

    postReference($w['plain'], 'expiring-key-1')->assertCreated()->assertJson(['order_number' => 'IDEM-EXPIRY-000001']);

    $this->travel(23)->hours();
    postReference($w['plain'], 'expiring-key-1')->assertOk()->assertJson(['order_number' => 'IDEM-EXPIRY-000001']);

    $this->travel(2)->hours();
    postReference($w['plain'], 'expiring-key-1')->assertCreated()->assertJson(['order_number' => 'IDEM-EXPIRY-000002']);
    postReference($w['plain'], 'expiring-key-1')->assertOk()->assertJson(['order_number' => 'IDEM-EXPIRY-000002']);

    expect(StorefrontIdempotencyKey::count())->toBe(1);
});

it('prunes expired rows when a new key is claimed, so the table does not grow forever', function () {
    $w = makeOrdersKey('idem-prune');

    foreach (range(1, 5) as $i) {
        postReference($w['plain'], 'old-key-number-'.$i)->assertCreated();
    }
    expect(StorefrontIdempotencyKey::count())->toBe(5);

    $this->travel(25)->hours();
    postReference($w['plain'], 'fresh-key-number')->assertCreated();

    expect(StorefrontIdempotencyKey::count())->toBe(1);
});

it('replays a committed row without invoking the number claim again', function () {
    $w = makeOrdersKey('idem-race');

    // The duplicate-key branch (loser of a true race) needs two real
    // connections and is covered by the opt-in MySQL test below, not here.
    $claims = 0;
    $result = StorefrontIdempotencyKey::claimOrReplay($w['tenant']->id, $w['key']->id, 'race-header-001', function (int $tenantId) use (&$claims) {
        $claims++;

        return StorefrontOrderCounter::claimNext($tenantId);
    });
    expect($result)->toBe(['number' => 1, 'replayed' => false]);

    $row = StorefrontIdempotencyKey::first();
    DB::table('storefront_idempotency_keys')->where('id', $row->id)->update(['order_number' => 1]);

    $again = StorefrontIdempotencyKey::claimOrReplay($w['tenant']->id, $w['key']->id, 'race-header-001', function () use (&$claims) {
        $claims++;

        return 999;
    });

    expect($again)->toBe(['number' => 1, 'replayed' => true])->and($claims)->toBe(1);
});

/*
 * Real concurrency needs several database connections at once, which the
 * in-memory SQLite suite cannot give. This test fires 5 simultaneous HTTP
 * requests at a running instance (Herd + MySQL) and is skipped unless
 * STORE_CONCURRENCY_BASE_URL and STORE_CONCURRENCY_KEY (an orders key) are
 * set, e.g.:
 *   STORE_CONCURRENCY_BASE_URL=https://stokity-v2.test STORE_CONCURRENCY_KEY=sk_store_... \
 *     php artisan test --filter="5 simultaneous"
 */
it('produces a single number for 5 simultaneous requests with the same Idempotency-Key (real MySQL, opt-in)', function () {
    $base = getenv('STORE_CONCURRENCY_BASE_URL');
    $key = getenv('STORE_CONCURRENCY_KEY');

    $idempotencyKey = 'concurrency-'.bin2hex(random_bytes(8));

    $responses = Http::pool(fn ($pool) => collect(range(1, 5))->map(
        fn ($i) => $pool->as("r{$i}")->withoutVerifying()->withToken($key)
            ->withHeaders(['Idempotency-Key' => $idempotencyKey, 'Accept' => 'application/json'])
            ->post(rtrim($base, '/').'/api/v1/store/order-reference')
    )->all());

    $statuses = collect($responses)->map(fn ($r) => $r->status())->sort()->values()->all();
    $numbers = collect($responses)->map(fn ($r) => $r->json('order_number'))->unique()->values();

    expect($statuses)->toBe([200, 200, 200, 200, 201])
        ->and($numbers)->toHaveCount(1);
})->skip(fn () => ! getenv('STORE_CONCURRENCY_BASE_URL') || ! getenv('STORE_CONCURRENCY_KEY'), 'Opt-in: needs a running MySQL-backed instance');
