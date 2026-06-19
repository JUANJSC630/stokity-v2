<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\Client;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use App\Tenancy\TenantProvisioner;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

afterEach(fn () => app(TenantManager::class)->forget());

function seedTenantWithSales(string $slug): Tenant
{
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => $slug,
        'admin_name' => "{$slug} admin",
        'admin_email' => "{$slug}@x.test",
        'admin_password' => 'password123',
    ]);

    app(TenantManager::class)->runAs($tenant, function () {
        $branch = Branch::first();
        $category = Category::factory()->create();
        Product::factory()->create(['branch_id' => $branch->id, 'category_id' => $category->id]);
    });

    return $tenant;
}

it('wipes only the targeted tenant business data, preserving users/branches/settings', function () {
    $a = seedTenantWithSales('alpha');
    $b = seedTenantWithSales('beta');

    $countFor = fn (string $model, int $tid) => $model::withoutGlobalScopes()->where('tenant_id', $tid)->count();

    // Sanity: both tenants have data.
    expect($countFor(Product::class, $a->id))->toBe(1)
        ->and($countFor(PaymentMethod::class, $a->id))->toBe(6);

    $this->artisan('db:clean-transactional', ['--tenant' => $a->id, '--force' => true])
        ->assertSuccessful();

    // Tenant A business data is gone...
    expect($countFor(Product::class, $a->id))->toBe(0)
        ->and($countFor(Client::class, $a->id))->toBe(0)
        ->and($countFor(PaymentMethod::class, $a->id))->toBe(0);

    // ...but its identity rows survive.
    expect($countFor(User::class, $a->id))->toBeGreaterThan(0)
        ->and($countFor(Branch::class, $a->id))->toBeGreaterThan(0)
        ->and($countFor(BusinessSetting::class, $a->id))->toBe(1);

    // Tenant B is completely untouched.
    expect($countFor(Product::class, $b->id))->toBe(1)
        ->and($countFor(PaymentMethod::class, $b->id))->toBe(6)
        ->and($countFor(Client::class, $b->id))->toBe(1);
});

it('refuses to run without a --tenant', function () {
    $this->artisan('db:clean-transactional', ['--force' => true])
        ->assertFailed();
});
