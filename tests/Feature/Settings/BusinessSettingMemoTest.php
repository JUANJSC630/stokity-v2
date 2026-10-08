<?php

use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\Product;
use App\Models\Tenant;
use App\Tenancy\TenantManager;
use Illuminate\Support\Facades\Cache;

beforeEach(function () {
    $this->tenantA = Tenant::create(['name' => 'A', 'slug' => 'tenant-a', 'status' => 'active']);
    $this->tenantB = Tenant::create(['name' => 'B', 'slug' => 'tenant-b', 'status' => 'active']);

    $manager = app(TenantManager::class);
    $manager->runAs($this->tenantA, fn () => BusinessSetting::factory()->create(['name' => 'Negocio A']));
    $manager->runAs($this->tenantB, fn () => BusinessSetting::factory()->create(['name' => 'Negocio B']));
    Cache::flush();
});

afterEach(fn () => app(TenantManager::class)->forget());

describe('BusinessSetting::getSettings memo', function () {
    it('reads the cache once per request however many times it is called', function () {
        app(TenantManager::class)->set($this->tenantA);
        Cache::partialMock()->shouldReceive('remember')->once()->andReturnUsing(fn ($key, $ttl, $callback) => $callback());

        foreach (range(1, 50) as $ignored) {
            BusinessSetting::getSettings();
        }
    });

    it('does not mix tenants when the context changes', function () {
        $manager = app(TenantManager::class);

        $manager->set($this->tenantA);
        expect(BusinessSetting::getSettings()->name)->toBe('Negocio A');

        $manager->set($this->tenantB);
        expect(BusinessSetting::getSettings()->name)->toBe('Negocio B');

        $manager->set($this->tenantA);
        expect(BusinessSetting::getSettings()->name)->toBe('Negocio A');
    });

    it('returns fresh values right after the settings are saved', function () {
        app(TenantManager::class)->set($this->tenantA);
        expect(BusinessSetting::getSettings()->name)->toBe('Negocio A');

        BusinessSetting::getSettings()->update(['name' => 'Renombrado']);

        expect(BusinessSetting::getSettings()->name)->toBe('Renombrado');
    });

    it('resolves the default image of many products with a single cache read', function () {
        app(TenantManager::class)->set($this->tenantA);
        $category = Category::factory()->create();
        $products = Product::factory()->count(30)->create(['category_id' => $category->id, 'image' => null]);
        Cache::flush();
        Cache::partialMock()->shouldReceive('remember')->once()->andReturnUsing(fn ($key, $ttl, $callback) => $callback());

        $products->each(fn (Product $product) => $product->image_url);
    });
});
