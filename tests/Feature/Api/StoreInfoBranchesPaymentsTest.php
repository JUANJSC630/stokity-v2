<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\PaymentMethod;
use App\Models\Tenant;
use App\Models\TenantApiKey;
use App\Tenancy\TenantManager;

/**
 * Public storefront endpoints that had no test: store info, branches and payment
 * methods. They are read with a tenant API key and must show only that tenant's
 * public data, never internal fields.
 */
function storeKeyFor(Tenant $tenant): string
{
    return app(TenantManager::class)->runAs($tenant, fn () => TenantApiKey::generate($tenant, 'storefront')['plainTextKey']);
}

beforeEach(function () {
    $manager = app(TenantManager::class);
    $this->a = Tenant::create(['name' => 'A', 'slug' => 'store-a', 'status' => 'active']);
    $this->b = Tenant::create(['name' => 'B', 'slug' => 'store-b', 'status' => 'active']);

    $manager->runAs($this->a, function () {
        BusinessSetting::factory()->create([
            'name' => 'Lu Accesorios', 'phone' => '3001112233', 'email' => 'tienda@a.test', 'address' => 'Calle 1 # 2-3',
            'social_media' => '@lu', 'currency_symbol' => '$', 'brand_color' => '#112233', 'nit' => '900123456-7',
        ]);
        Branch::factory()->create(['name' => 'Zona Norte', 'status' => true]);
        Branch::factory()->create(['name' => 'Centro', 'status' => true]);
        Branch::factory()->create(['name' => 'Cerrada', 'status' => false]);
        PaymentMethod::factory()->create(['code' => 'efectivo', 'name' => 'Efectivo', 'is_active' => true, 'sort_order' => 1]);
        PaymentMethod::factory()->create(['code' => 'transferencia', 'name' => 'Transferencia', 'is_active' => true, 'sort_order' => 2]);
        PaymentMethod::factory()->create(['code' => 'cheque', 'name' => 'Cheque', 'is_active' => false, 'sort_order' => 3]);
    });

    $manager->runAs($this->b, function () {
        BusinessSetting::factory()->create(['name' => 'Otro negocio']);
        Branch::factory()->create(['name' => 'Sucursal ajena', 'status' => true]);
        PaymentMethod::factory()->create(['code' => 'ajeno', 'name' => 'Método ajeno', 'is_active' => true]);
    });

    $this->keyA = storeKeyFor($this->a);
});

afterEach(fn () => app(TenantManager::class)->forget());

describe('GET /api/v1/store/info', function () {
    it('returns the public look of the business of the key', function () {
        $this->withToken($this->keyA)->getJson('/api/v1/store/info')
            ->assertOk()
            ->assertJsonPath('data.name', 'Lu Accesorios')
            ->assertJsonPath('data.phone', '3001112233')
            ->assertJsonPath('data.email', 'tienda@a.test')
            ->assertJsonPath('data.address', 'Calle 1 # 2-3')
            ->assertJsonPath('data.social_media', '@lu')
            ->assertJsonPath('data.currency_symbol', '$')
            ->assertJsonPath('data.brand_color', '#112233');
    });

    it('never exposes internal business fields', function () {
        $data = $this->withToken($this->keyA)->getJson('/api/v1/store/info')->json('data');

        expect(array_keys($data))->toEqualCanonicalizing([
            'name', 'logo_url', 'phone', 'email', 'address', 'social_media', 'currency_symbol', 'brand_color', 'brand_color_secondary',
        ]);
        expect(json_encode($data))->not->toContain('900123456-7');
    });

    it('does not create a settings row as a side effect of a public read', function () {
        $empty = Tenant::create(['name' => 'Vacío', 'slug' => 'store-empty', 'status' => 'active']);

        $this->withToken(storeKeyFor($empty))->getJson('/api/v1/store/info')->assertOk();

        expect(app(TenantManager::class)->runAs($empty, fn () => BusinessSetting::count()))->toBe(0);
    });

    it('requires an api key', function () {
        $this->getJson('/api/v1/store/info')->assertUnauthorized();
    });
});

describe('GET /api/v1/store/branches', function () {
    it('lists only active branches of the tenant, ordered by name, with public fields', function () {
        $response = $this->withToken($this->keyA)->getJson('/api/v1/store/branches')->assertOk();

        expect($response->json('data.*.name'))->toBe(['Centro', 'Zona Norte']);
        expect(array_keys($response->json('data.0')))->toEqualCanonicalizing(['id', 'name', 'address', 'phone']);
    });

    it('requires an api key', function () {
        $this->getJson('/api/v1/store/branches')->assertUnauthorized();
    });
});

describe('GET /api/v1/store/payment-methods', function () {
    it('lists only active payment methods of the tenant in the configured order', function () {
        $response = $this->withToken($this->keyA)->getJson('/api/v1/store/payment-methods')->assertOk();

        expect($response->json('data.*.code'))->toBe(['efectivo', 'transferencia']);
        expect(array_keys($response->json('data.0')))->toEqualCanonicalizing(['code', 'name']);
    });

    it('requires an api key', function () {
        $this->getJson('/api/v1/store/payment-methods')->assertUnauthorized();
    });
});
