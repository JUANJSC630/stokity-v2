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
 * @return array{tenant: Tenant, branch: Branch, plain: string}
 */
function makeCategoryWorld(string $slug): array
{
    $tenant = Tenant::create(['name' => $slug, 'slug' => $slug, 'status' => 'active']);

    return [
        'tenant' => $tenant,
        'branch' => app(TenantManager::class)->runAs($tenant, fn () => Branch::factory()->create()),
        'plain' => TenantApiKey::generate($tenant, 'reader')['plainTextKey'],
    ];
}

function categoryIn(array $world, string $name, array $attributes = []): Category
{
    return app(TenantManager::class)->runAs($world['tenant'], fn () => Category::create(array_merge(['name' => $name, 'status' => true], $attributes)));
}

function visibleProductIn(array $world, Category $category, array $attributes = []): Product
{
    return app(TenantManager::class)->runAs($world['tenant'], fn () => Product::factory()->create(array_merge([
        'branch_id' => $world['branch']->id,
        'category_id' => $category->id,
        'show_in_storefront' => true,
        'status' => true,
    ], $attributes)));
}

function listCategories(array $world): array
{
    return test()->withHeader('Authorization', 'Bearer '.$world['plain'])->getJson('/api/v1/store/categories')->assertOk()->json('data');
}

it('generates a lowercase, accent-free, hyphenated slug on creation', function () {
    $w = makeCategoryWorld('cat-slug');

    expect(categoryIn($w, 'Aretes y Pulseras')->slug)->toBe('aretes-y-pulseras')
        ->and(categoryIn($w, 'Bisutería Ñandú')->slug)->toBe('bisuteria-nandu')
        ->and(categoryIn($w, '¡¡¡')->slug)->toBe('categoria');
});

it('suffixes the slug on collision within a business, but not across businesses', function () {
    $a = makeCategoryWorld('cat-coll-a');
    $b = makeCategoryWorld('cat-coll-b');

    expect(categoryIn($a, 'Collares')->slug)->toBe('collares')
        ->and(categoryIn($a, 'COLLARES')->slug)->toBe('collares-2')
        ->and(categoryIn($a, 'Collares!')->slug)->toBe('collares-3')
        ->and(categoryIn($b, 'Collares')->slug)->toBe('collares');
});

it('keeps the slug when the category is renamed', function () {
    $w = makeCategoryWorld('cat-stable');
    $category = categoryIn($w, 'Anillos');

    app(TenantManager::class)->runAs($w['tenant'], fn () => Category::find($category->id)->update(['name' => 'Anillos de plata']));

    expect($category->fresh()->slug)->toBe('anillos')->and($category->fresh()->name)->toBe('Anillos de plata');
});

it('keeps a soft-deleted category slug reserved so a restore can never collide', function () {
    $w = makeCategoryWorld('cat-trash');
    $old = categoryIn($w, 'Relojes');
    app(TenantManager::class)->runAs($w['tenant'], fn () => Category::find($old->id)->delete());

    $new = categoryIn($w, 'Relojes');
    expect($new->slug)->toBe('relojes-2');

    app(TenantManager::class)->runAs($w['tenant'], fn () => Category::onlyTrashed()->find($old->id)->restore());
    expect(Category::allTenants()->find($old->id)->slug)->toBe('relojes');
});

it('regenerates a slug only when explicitly asked, via the command', function () {
    $w = makeCategoryWorld('cat-regen');
    $category = categoryIn($w, 'Anillos');
    app(TenantManager::class)->runAs($w['tenant'], fn () => Category::find($category->id)->update(['name' => 'Sortijas']));

    expect($category->fresh()->slug)->toBe('anillos');

    expect(Artisan::call('store:categories:regenerate-slug', ['tenant' => 'cat-regen', 'category' => $category->id]))->toBe(0)
        ->and($category->fresh()->slug)->toBe('sortijas')
        ->and(Artisan::call('store:categories:regenerate-slug', ['tenant' => 'cat-regen', 'category' => 999999]))->toBe(1)
        ->and(Artisan::call('store:categories:regenerate-slug', ['tenant' => 'nope', 'category' => $category->id]))->toBe(1);
});

it('refuses to regenerate the slug of a category of another business', function () {
    $a = makeCategoryWorld('cat-regen-a');
    $b = makeCategoryWorld('cat-regen-b');
    $foreign = categoryIn($b, 'Ajena');
    DB::table('categories')->where('id', $foreign->id)->update(['name' => 'Renombrada']);

    expect(Artisan::call('store:categories:regenerate-slug', ['tenant' => 'cat-regen-a', 'category' => $foreign->id]))->toBe(1)
        ->and($foreign->fresh()->slug)->toBe('ajena');
});

it('exposes slug, description, image_url, updated_at and products_count in GET categories', function () {
    $w = makeCategoryWorld('cat-api');
    $category = categoryIn($w, 'Collares', ['description' => 'Collares artesanales']);
    visibleProductIn($w, $category);
    visibleProductIn($w, $category);

    $row = listCategories($w)[0];

    expect($row)->toMatchArray([
        'id' => $category->id,
        'name' => 'Collares',
        'slug' => 'collares',
        'description' => 'Collares artesanales',
        'image_url' => null,
        'products_count' => 2,
    ])->and($row['updated_at'])->toBe($category->fresh()->updated_at->toIso8601String());
});

it('counts only visible products and still hides categories with none', function () {
    $w = makeCategoryWorld('cat-count');
    $mixed = categoryIn($w, 'Mixta');
    $empty = categoryIn($w, 'Vacía');
    visibleProductIn($w, $mixed);
    visibleProductIn($w, $mixed, ['show_in_storefront' => false]);
    visibleProductIn($w, $mixed, ['status' => false]);
    visibleProductIn($w, $empty, ['show_in_storefront' => false]);
    $deleted = visibleProductIn($w, $mixed);
    app(TenantManager::class)->runAs($w['tenant'], fn () => Product::find($deleted->id)->delete());

    $rows = listCategories($w);

    expect($rows)->toHaveCount(1)->and($rows[0]['slug'])->toBe('mixta')->and($rows[0]['products_count'])->toBe(1);
});

it('includes the slug in the category embedded in a product, without products_count', function () {
    $w = makeCategoryWorld('cat-embedded');
    $category = categoryIn($w, 'Aretes');
    $product = visibleProductIn($w, $category);

    $embedded = $this->withHeader('Authorization', 'Bearer '.$w['plain'])->getJson('/api/v1/store/products/'.$product->fresh()->slug)->json('data.category');

    expect($embedded['slug'])->toBe('aretes')->and($embedded)->not->toHaveKey('products_count');
});

it('never lists categories of another business', function () {
    $a = makeCategoryWorld('cat-iso-a');
    $b = makeCategoryWorld('cat-iso-b');
    visibleProductIn($a, categoryIn($a, 'Solo A'));
    visibleProductIn($b, categoryIn($b, 'Solo B'));

    expect(collect(listCategories($a))->pluck('slug')->all())->toBe(['solo-a'])
        ->and(collect(listCategories($b))->pluck('slug')->all())->toBe(['solo-b']);
});

it('backfills existing categories oldest first, leaving existing slugs alone, and is safe to run twice', function () {
    $w = makeCategoryWorld('cat-backfill');
    $other = makeCategoryWorld('cat-backfill-other');
    $migration = require glob(database_path('migrations/*_add_slug_to_categories_table.php'))[0];

    $first = categoryIn($w, 'Ropa');
    $second = categoryIn($w, 'ropa');
    $kept = categoryIn($w, 'Zapatos');
    $foreign = categoryIn($other, 'Ropa');
    DB::table('categories')->whereIn('id', [$first->id, $second->id, $foreign->id])->update(['slug' => null]);
    DB::table('categories')->where('id', $kept->id)->update(['slug' => 'calzado-publicado']);

    $migration->up();
    $migration->up();

    expect(Category::allTenants()->find($first->id)->slug)->toBe('ropa')
        ->and(Category::allTenants()->find($second->id)->slug)->toBe('ropa-2')
        ->and(Category::allTenants()->find($kept->id)->slug)->toBe('calzado-publicado')
        ->and(Category::allTenants()->find($foreign->id)->slug)->toBe('ropa');
});

it('enforces slug uniqueness per business at the database level', function () {
    $w = makeCategoryWorld('cat-unique');
    $a = categoryIn($w, 'Uno');
    $b = categoryIn($w, 'Dos');

    expect(fn () => DB::table('categories')->where('id', $b->id)->update(['slug' => $a->slug]))->toThrow(\Illuminate\Database\QueryException::class);
});
