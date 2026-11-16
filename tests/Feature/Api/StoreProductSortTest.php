<?php

use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\TenantApiKey;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

afterEach(fn () => app(TenantManager::class)->forget());

/** @return array{tenant: Tenant, plain: string} */
function makeSortWorld(): array
{
    $tenant = Tenant::create(['name' => 'sort', 'slug' => 'sort', 'status' => 'active']);

    return app(TenantManager::class)->runAs($tenant, function () use ($tenant) {
        $branch = Branch::factory()->create();
        $category = Category::factory()->create();
        // Created out of alphabetical order, one day apart.
        foreach (['Collar' => 3, 'Anillo' => 2, 'Brazalete' => 1] as $name => $daysAgo) {
            Product::factory()->create([
                'branch_id' => $branch->id,
                'category_id' => $category->id,
                'name' => $name,
                'show_in_storefront' => true,
                'status' => true,
                'created_at' => now()->subDays($daysAgo),
            ]);
        }

        return ['tenant' => $tenant, 'plain' => TenantApiKey::generate($tenant, 'reader')['plainTextKey']];
    });
}

/** @return array<int, string> */
function sortedNames(array $world, string $query): array
{
    return collect(test()->withHeader('Authorization', 'Bearer '.$world['plain'])->getJson('/api/v1/store/products?'.$query)->assertOk()->json('data'))
        ->pluck('name')->all();
}

it('keeps ordering by name by default', function () {
    expect(sortedNames(makeSortWorld(), ''))->toBe(['Anillo', 'Brazalete', 'Collar']);
});

it('orders newest first with ?sort=newest, like the panel products list', function () {
    expect(sortedNames(makeSortWorld(), 'sort=newest'))->toBe(['Brazalete', 'Anillo', 'Collar']);
});

it('accepts ?sort=name explicitly', function () {
    expect(sortedNames(makeSortWorld(), 'sort=name'))->toBe(['Anillo', 'Brazalete', 'Collar']);
});

it('rejects an unknown sort', function () {
    $world = makeSortWorld();

    test()->withHeader('Authorization', 'Bearer '.$world['plain'])->getJson('/api/v1/store/products?sort=price')->assertUnprocessable();
});
