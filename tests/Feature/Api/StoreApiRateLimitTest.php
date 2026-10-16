<?php

use App\Models\StorefrontOrderCounter;
use App\Models\TenantApiKey;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

afterEach(fn () => app(TenantManager::class)->forget());

function storeGet(string $plainKey, string $path = '/api/v1/store/products')
{
    return test()->withHeader('Authorization', 'Bearer '.$plainKey)->getJson($path);
}

it('defaults a key without a custom limit to 60 requests per minute', function () {
    $world = makeStoreWorld('rl-default');

    expect($world['apiKey']->rate_limit_per_minute)->toBeNull()
        ->and($world['apiKey']->effectiveRateLimitPerMinute())->toBe(60);

    $first = storeGet($world['plainKey'])->assertOk();
    expect($first->headers->get('X-RateLimit-Limit'))->toBe('60')
        ->and($first->headers->get('X-RateLimit-Remaining'))->toBe('59');

    for ($i = 1; $i < 60; $i++) {
        storeGet($world['plainKey'])->assertOk();
    }

    storeGet($world['plainKey'])->assertTooManyRequests();
});

it('answers 429 with Retry-After once a custom limit of 5 per minute is exceeded', function () {
    $world = makeStoreWorld('rl-custom');
    $world['apiKey']->update(['rate_limit_per_minute' => 5]);

    for ($i = 0; $i < 5; $i++) {
        $response = storeGet($world['plainKey'])->assertOk();
        expect($response->headers->get('X-RateLimit-Limit'))->toBe('5');
    }

    $limited = storeGet($world['plainKey'])->assertTooManyRequests();

    expect((int) $limited->headers->get('Retry-After'))->toBeGreaterThan(0)
        ->and($limited->headers->get('X-RateLimit-Limit'))->toBe('5')
        ->and($limited->headers->get('X-RateLimit-Remaining'))->toBe('0')
        ->and($limited->json('message'))->toBeString();
});

it('lets the orders key keep minting order references after the read bucket is exhausted', function () {
    $reader = makeStoreWorld('rl-buckets');
    $reader['apiKey']->update(['rate_limit_per_minute' => 3]);

    for ($i = 0; $i < 3; $i++) {
        storeGet($reader['plainKey'])->assertOk();
    }
    storeGet($reader['plainKey'])->assertTooManyRequests();

    $orders = TenantApiKey::generate($reader['tenant'], 'orders', null, false, true);

    $this->withHeader('Authorization', 'Bearer '.$orders['plainTextKey'])
        ->postJson('/api/v1/store/order-reference')
        ->assertCreated();
});

it('keeps read, write and orders counters independent on the very same key', function () {
    $world = makeStoreWorld('rl-same-key', true, true);
    $world['apiKey']->update(['rate_limit_per_minute' => 2]);
    $auth = ['Authorization' => 'Bearer '.$world['plainKey']];

    storeGet($world['plainKey'])->assertOk();
    storeGet($world['plainKey'])->assertOk();
    storeGet($world['plainKey'])->assertTooManyRequests();

    $this->withHeaders($auth)->postJson('/api/v1/store/order-reference')->assertCreated();
    $this->withHeaders($auth)->postJson('/api/v1/store/order-reference')->assertCreated();
    $this->withHeaders($auth)->postJson('/api/v1/store/order-reference')->assertTooManyRequests();

    $this->withHeaders($auth)->patchJson('/api/v1/store/products/'.$world['visibleProduct']->slug, ['show_in_storefront' => true])->assertOk();

    expect(StorefrontOrderCounter::where('tenant_id', $world['tenant']->id)->value('next_number'))->toBe(3);
});

it('does not let one key exhaust the limit of another key of the same tenant', function () {
    $world = makeStoreWorld('rl-two-keys');
    $world['apiKey']->update(['rate_limit_per_minute' => 1]);
    $other = TenantApiKey::generate($world['tenant'], 'other');

    storeGet($world['plainKey'])->assertOk();
    storeGet($world['plainKey'])->assertTooManyRequests();
    storeGet($other['plainTextKey'])->assertOk();
});

it('sends the rate-limit headers on error responses too', function () {
    $world = makeStoreWorld('rl-headers');

    $notFound = storeGet($world['plainKey'], '/api/v1/store/products/does-not-exist')->assertNotFound();
    expect($notFound->headers->get('X-RateLimit-Limit'))->toBe('60');

    $forbidden = $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])
        ->postJson('/api/v1/store/order-reference')->assertForbidden();
    expect($forbidden->headers->get('X-RateLimit-Limit'))->toBe('60');
});

it('answers a 429 as JSON even when the client sends no Accept header', function () {
    $world = makeStoreWorld('rl-json');
    $world['apiKey']->update(['rate_limit_per_minute' => 1]);

    $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])->get('/api/v1/store/products')->assertOk();
    $limited = $this->withHeader('Authorization', 'Bearer '.$world['plainKey'])->get('/api/v1/store/products')->assertTooManyRequests();

    expect($limited->headers->get('Content-Type'))->toContain('application/json')
        ->and($limited->json('message'))->toBeString();
});
