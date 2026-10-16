<?php

use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductTag;
use App\Models\Tenant;
use App\Models\TenantApiKey;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

afterEach(function () {
    app(TenantManager::class)->forget();
    Carbon::setTestNow();
});

/**
 * @return array{tenant: Tenant, plain: string, adminPlain: string, products: array<int, Product>}
 */
function makeTagApiWorld(string $slug): array
{
    $tenant = Tenant::create(['name' => $slug, 'slug' => $slug, 'status' => 'active']);

    return app(TenantManager::class)->runAs($tenant, function () use ($tenant) {
        $branch = Branch::factory()->create();
        $category = Category::factory()->create();

        return [
            'tenant' => $tenant,
            'plain' => TenantApiKey::generate($tenant, 'reader')['plainTextKey'],
            'adminPlain' => TenantApiKey::generate($tenant, 'admin', null, true)['plainTextKey'],
            'products' => Product::factory()->count(4)->create([
                'branch_id' => $branch->id,
                'category_id' => $category->id,
                'show_in_storefront' => true,
                'status' => true,
            ])->all(),
        ];
    });
}

function tagApi(array $world, string $path, string $key = 'plain')
{
    return test()->withHeader('Authorization', 'Bearer '.$world[$key])->getJson('/api/v1/store/'.$path);
}

it('creates a tag, assigns it to 3 of 4 products and filters by it, showing tags in list and detail', function () {
    $w = makeTagApiWorld('tag-api');

    app(TenantManager::class)->runAs($w['tenant'], function () use ($w) {
        $tag = ProductTag::create(['name' => 'Artesanal']);
        $tag->products()->attach(collect($w['products'])->take(3)->pluck('id'));
    });

    $filtered = tagApi($w, 'products?tag=artesanal')->assertOk();
    expect($filtered->json('data'))->toHaveCount(3)
        ->and(collect($filtered->json('data'))->pluck('tags.0')->unique()->all())->toBe([['slug' => 'artesanal', 'name' => 'Artesanal']]);

    $all = tagApi($w, 'products')->assertOk();
    expect($all->json('data'))->toHaveCount(4);

    $untagged = collect($all->json('data'))->firstWhere('code', $w['products'][3]->code);
    expect($untagged['tags'])->toBe([]);

    $detail = tagApi($w, 'products/'.$w['products'][0]->slug)->assertOk();
    expect($detail->json('data.tags'))->toBe([['slug' => 'artesanal', 'name' => 'Artesanal']]);
});

it('matches any of several comma-separated tags and ignores unknown ones', function () {
    $w = makeTagApiWorld('tag-any');

    app(TenantManager::class)->runAs($w['tenant'], function () use ($w) {
        ProductTag::create(['name' => 'Artesanal'])->products()->attach($w['products'][0]->id);
        ProductTag::create(['name' => 'Oro'])->products()->attach($w['products'][1]->id);
    });

    expect(tagApi($w, 'products?tag=artesanal,oro')->json('data'))->toHaveCount(2)
        ->and(tagApi($w, 'products?tag=oro,no-existe')->json('data'))->toHaveCount(1)
        ->and(tagApi($w, 'products?tag=no-existe')->json('data'))->toHaveCount(0);
});

it('orders a product tags by name and exposes only slug and name', function () {
    $w = makeTagApiWorld('tag-shape');

    app(TenantManager::class)->runAs($w['tenant'], function () use ($w) {
        $w['products'][0]->tags()->attach([ProductTag::create(['name' => 'Zafiro'])->id, ProductTag::create(['name' => 'Ámbar'])->id]);
    });

    $tags = tagApi($w, 'products/'.$w['products'][0]->slug)->json('data.tags');

    expect($tags)->toHaveCount(2)->and(array_keys($tags[0]))->toBe(['slug', 'name']);
});

it('reports a product as changed when its tags change, so updated_since picks it up', function () {
    Carbon::setTestNow('2026-10-16 10:00:00');
    $w = makeTagApiWorld('tag-sync');
    $tag = app(TenantManager::class)->runAs($w['tenant'], fn () => ProductTag::create(['name' => 'Artesanal']));

    Carbon::setTestNow('2026-10-16 11:00:00');
    $this->actingAs(app(TenantManager::class)->runAs($w['tenant'], fn () => adminUser(Branch::first())))
        ->post(route('product-tags.assign'), ['product_ids' => [$w['products'][0]->id], 'tag_id' => $tag->id, 'action' => 'add'])
        ->assertRedirect();
    app(TenantManager::class)->forget();

    $rows = tagApi($w, 'products?updated_since='.urlencode('2026-10-16T10:30:00-05:00'))->json('data');
    expect($rows)->toHaveCount(1)->and($rows[0]['code'])->toBe($w['products'][0]->code)->and($rows[0]['tags'][0]['slug'])->toBe('artesanal');
});

it('never shows or filters by the tags of another business', function () {
    $a = makeTagApiWorld('tag-iso-a');
    $b = makeTagApiWorld('tag-iso-b');

    app(TenantManager::class)->runAs($b['tenant'], fn () => ProductTag::create(['name' => 'Artesanal'])->products()->attach($b['products'][0]->id));
    app(TenantManager::class)->runAs($a['tenant'], fn () => ProductTag::create(['name' => 'Artesanal']));

    expect(tagApi($a, 'products?tag=artesanal')->json('data'))->toHaveCount(0);
    foreach (tagApi($a, 'products')->json('data') as $row) {
        expect($row['tags'])->toBe([]);
    }
    expect(tagApi($b, 'products?tag=artesanal')->json('data'))->toHaveCount(1);
});

it('includes tags in the PATCH response of an admin key', function () {
    $w = makeTagApiWorld('tag-patch');
    app(TenantManager::class)->runAs($w['tenant'], fn () => ProductTag::create(['name' => 'Artesanal'])->products()->attach($w['products'][0]->id));

    $response = $this->withHeader('Authorization', 'Bearer '.$w['adminPlain'])
        ->patchJson('/api/v1/store/products/'.$w['products'][0]->slug, ['show_in_storefront' => true])->assertOk();

    expect($response->json('data.tags'))->toBe([['slug' => 'artesanal', 'name' => 'Artesanal']]);
});

it('seeds the default Artesanal tag for the Lu Accesorios business only', function () {
    $lu = Tenant::create(['name' => 'Lu Accesorios', 'slug' => 'luaccesorios', 'status' => 'active']);
    $other = Tenant::create(['name' => 'Otro', 'slug' => 'otro', 'status' => 'active']);
    $migration = require database_path('migrations/2026_10_16_143654_create_product_tags_table.php');

    Schema::drop('product_product_tag');
    Schema::drop('product_tags');
    $migration->up();

    expect(ProductTag::allTenants()->where('tenant_id', $lu->id)->get(['slug', 'name'])->toArray())->toBe([['slug' => 'artesanal', 'name' => 'Artesanal']])
        ->and(ProductTag::allTenants()->where('tenant_id', $other->id)->count())->toBe(0);
});
