<?php

use App\Models\Tenant;
use App\Models\TenantApiKey;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

it('answers 200 without any api key, with version, time and db ok', function () {
    config(['app.version' => 'abc1234']);
    $this->travelTo('2026-10-16 10:00:00');

    $this->getJson('/api/v1/store/health')
        ->assertOk()
        ->assertExactJson([
            'status' => 'ok',
            'version' => 'abc1234',
            'time' => '2026-10-16T10:00:00-05:00',
            'db' => 'ok',
        ])
        ->assertHeader('Cache-Control', 'no-store, private');
});

it('answers 503 with db error when the database fails, without leaking details', function () {
    DB::shouldReceive('select')->once()->andThrow(new PDOException('SQLSTATE[HY000] secret host details'));

    $response = $this->getJson('/api/v1/store/health')->assertStatus(503);

    expect($response->json())->toMatchArray(['status' => 'error', 'db' => 'error'])
        ->and($response->getContent())->not->toContain('secret');
});

it('has its own 120 per minute per IP limit that api key buckets cannot touch', function () {
    $tenant = Tenant::create(['name' => 'h', 'slug' => 'health-co', 'status' => 'active']);
    $plain = TenantApiKey::generate($tenant, 'reader', null, false, false, 1)['plainTextKey'];

    $this->withHeader('Authorization', 'Bearer '.$plain)->getJson('/api/v1/store/info')->assertOk();
    $this->withHeader('Authorization', 'Bearer '.$plain)->getJson('/api/v1/store/info')->assertTooManyRequests();

    $first = $this->getJson('/api/v1/store/health')->assertOk();
    expect($first->headers->get('X-RateLimit-Limit'))->toBe('120');

    for ($i = 1; $i < 120; $i++) {
        $this->getJson('/api/v1/store/health')->assertOk();
    }

    $this->getJson('/api/v1/store/health')->assertTooManyRequests();
});
