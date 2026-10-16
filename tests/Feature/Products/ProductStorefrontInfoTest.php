<?php

use App\Enums\ProductManufacturing;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Tenant;
use App\Models\TenantApiKey;
use App\Models\User;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

afterEach(fn () => app(TenantManager::class)->forget());

/**
 * @return array{tenant: Tenant, admin: User, branch: Branch, category: Category, product: Product, plain: string}
 */
function makeInfoWorld(string $slug): array
{
    $tenant = Tenant::create(['name' => $slug, 'slug' => $slug, 'status' => 'active']);

    return app(TenantManager::class)->runAs($tenant, function () use ($tenant) {
        $branch = Branch::factory()->create();
        $category = Category::factory()->create();

        return [
            'tenant' => $tenant,
            'admin' => adminUser($branch),
            'branch' => $branch,
            'category' => $category,
            'product' => Product::factory()->create([
                'branch_id' => $branch->id,
                'category_id' => $category->id,
                'show_in_storefront' => true,
                'status' => true,
            ]),
            'plain' => TenantApiKey::generate($tenant, 'reader')['plainTextKey'],
        ];
    });
}

/**
 * @param  array<string, mixed>  $extra
 * @return array<string, mixed>
 */
function infoPayload(array $world, array $extra = []): array
{
    return array_merge([
        'name' => $world['product']->name,
        'code' => $world['product']->code,
        'sale_price' => 45000,
        'purchase_price' => 20000,
        'tax' => 0,
        'min_stock' => 0,
        'category_id' => $world['category']->id,
        'branch_id' => $world['branch']->id,
        'status' => true,
    ], $extra);
}

function publicProduct(array $world): array
{
    return test()->withHeader('Authorization', 'Bearer '.$world['plain'])
        ->getJson('/api/v1/store/products/'.$world['product']->fresh()->slug)->assertOk()->json('data');
}

const INFO_KEYS = ['material', 'dimensions', 'weight_grams', 'origin', 'manufacturing', 'care_instructions', 'color', 'style', 'seo_title', 'seo_description'];

it('fills the storefront fields in the panel and shows them in GET products/{slug}', function () {
    $w = makeInfoWorld('info-fill');

    $this->actingAs($w['admin'])->put(route('products.update', $w['product']), infoPayload($w, [
        'material' => 'Acero inoxidable bañado en oro',
        'dimensions' => 'Largo 18 cm, dije 2 cm',
        'weight_grams' => 12,
        'origin' => 'Hecho a mano en Zarzal, Colombia',
        'manufacturing' => 'handmade',
        'care_instructions' => 'Evita el agua y los perfumes.',
        'color' => 'Dorado',
        'style' => 'Minimalista',
        'seo_title' => 'Pulsera luna dorada',
        'seo_description' => 'Pulsera artesanal con dije de luna.',
    ]))->assertSessionHasNoErrors();

    expect(publicProduct($w))->toMatchArray([
        'material' => 'Acero inoxidable bañado en oro',
        'dimensions' => 'Largo 18 cm, dije 2 cm',
        'weight_grams' => 12,
        'origin' => 'Hecho a mano en Zarzal, Colombia',
        'manufacturing' => 'handmade',
        'care_instructions' => 'Evita el agua y los perfumes.',
        'color' => 'Dorado',
        'style' => 'Minimalista',
        'seo_title' => 'Pulsera luna dorada',
        'seo_description' => 'Pulsera artesanal con dije de luna.',
    ]);
});

it('also saves the fields when creating a product', function () {
    $w = makeInfoWorld('info-create');

    $this->actingAs($w['admin'])->post(route('products.store'), infoPayload($w, [
        'name' => 'Aretes sol',
        'code' => 'ARE-1',
        'stock' => 4,
        'material' => 'Plata 925',
        'manufacturing' => 'mixed',
    ]))->assertSessionHasNoErrors();

    $created = app(TenantManager::class)->runAs($w['tenant'], fn () => Product::where('code', 'ARE-1')->firstOrFail());

    expect($created->material)->toBe('Plata 925')->and($created->manufacturing)->toBe(ProductManufacturing::Mixed);
});

it('returns every new field as null for existing products, never omitting them', function () {
    $w = makeInfoWorld('info-null');

    $product = publicProduct($w);

    foreach (INFO_KEYS as $key) {
        expect($product)->toHaveKey($key)->and($product[$key])->toBeNull();
    }
});

it('clears a field when the form sends it empty', function () {
    $w = makeInfoWorld('info-clear');

    $this->actingAs($w['admin'])->put(route('products.update', $w['product']), infoPayload($w, ['material' => 'Oro', 'weight_grams' => 5, 'manufacturing' => 'supplier']));
    $this->actingAs($w['admin'])->put(route('products.update', $w['product']), infoPayload($w, ['material' => '', 'weight_grams' => '', 'manufacturing' => '']));

    $product = publicProduct($w);
    expect($product['material'])->toBeNull()->and($product['weight_grams'])->toBeNull()->and($product['manufacturing'])->toBeNull();
});

it('enforces the field limits', function (string $field, mixed $value, bool $valid) {
    $w = makeInfoWorld('info-limits');

    $response = $this->actingAs($w['admin'])->put(route('products.update', $w['product']), infoPayload($w, [$field => $value]));

    $valid ? $response->assertSessionHasNoErrors() : $response->assertSessionHasErrors($field);
})->with([
    'material 255' => ['material', str_repeat('a', 255), true],
    'material 256' => ['material', str_repeat('a', 256), false],
    'dimensions 256' => ['dimensions', str_repeat('a', 256), false],
    'origin 256' => ['origin', str_repeat('a', 256), false],
    'weight 100000' => ['weight_grams', 100000, true],
    'weight 100001' => ['weight_grams', 100001, false],
    'weight negative' => ['weight_grams', -1, false],
    'weight text' => ['weight_grams', 'pesado', false],
    'manufacturing unknown' => ['manufacturing', 'robots', false],
    'manufacturing mixed' => ['manufacturing', 'mixed', true],
    'care 1000' => ['care_instructions', str_repeat('a', 1000), true],
    'care 1001' => ['care_instructions', str_repeat('a', 1001), false],
    'color 61' => ['color', str_repeat('a', 61), false],
    'style 61' => ['style', str_repeat('a', 61), false],
    'seo title 70' => ['seo_title', str_repeat('a', 70), true],
    'seo title 71' => ['seo_title', str_repeat('a', 71), false],
    'seo description 160' => ['seo_description', str_repeat('a', 160), true],
    'seo description 161' => ['seo_description', str_repeat('a', 161), false],
]);

it('never exposes internal fields alongside the new ones', function () {
    $w = makeInfoWorld('info-whitelist');

    expect(publicProduct($w))->not->toHaveKeys(['purchase_price', 'reserved_stock', 'min_stock', 'stock', 'tenant_id', 'branch_id']);
});

it('keeps tenants apart: A cannot read or change the information of B', function () {
    $a = makeInfoWorld('info-iso-a');
    $b = makeInfoWorld('info-iso-b');

    $this->actingAs($b['admin'])->put(route('products.update', $b['product']), infoPayload($b, ['material' => 'Solo B']));

    $this->actingAs($a['admin'])->put(route('products.update', $b['product']), infoPayload($a, ['material' => 'Hackeado']))->assertNotFound();

    expect(app(TenantManager::class)->runAs($b['tenant'], fn () => Product::find($b['product']->id)->material))->toBe('Solo B')
        ->and(publicProduct($a)['material'])->toBeNull();
});

it('saves the alt text of gallery images and exposes it in gallery[]', function () {
    $w = makeInfoWorld('info-alt');

    [$one, $two] = app(TenantManager::class)->runAs($w['tenant'], fn () => [
        ProductImage::create(['product_id' => $w['product']->id, 'image' => 'https://x.public.blob.vercel-storage.com/a.webp', 'sort_order' => 0]),
        ProductImage::create(['product_id' => $w['product']->id, 'image' => 'https://x.public.blob.vercel-storage.com/b.webp', 'sort_order' => 1]),
    ]);

    expect(publicProduct($w)['gallery'][0])->toHaveKey('alt_text')->and(publicProduct($w)['gallery'][0]['alt_text'])->toBeNull();

    $this->actingAs($w['admin'])->put(route('products.images.alt-text', $w['product']), [
        'images' => [['id' => $one->id, 'alt_text' => 'Pulsera dorada con dije de luna'], ['id' => $two->id, 'alt_text' => null]],
    ])->assertSessionHasNoErrors();

    $gallery = publicProduct($w)['gallery'];
    expect($gallery[0]['alt_text'])->toBe('Pulsera dorada con dije de luna')->and($gallery[1]['alt_text'])->toBeNull();
});

it('rejects alt text for an image of another product or business, or longer than 255', function () {
    $a = makeInfoWorld('info-alt-a');
    $b = makeInfoWorld('info-alt-b');

    $foreign = app(TenantManager::class)->runAs($b['tenant'], fn () => ProductImage::create(['product_id' => $b['product']->id, 'image' => 'https://x.public.blob.vercel-storage.com/z.webp', 'sort_order' => 0]));
    $own = app(TenantManager::class)->runAs($a['tenant'], fn () => ProductImage::create(['product_id' => $a['product']->id, 'image' => 'https://x.public.blob.vercel-storage.com/a.webp', 'sort_order' => 0]));

    $this->actingAs($a['admin'])->put(route('products.images.alt-text', $a['product']), ['images' => [['id' => $foreign->id, 'alt_text' => 'Intruso']]])
        ->assertSessionHasErrors('images.0.id');
    $this->actingAs($a['admin'])->put(route('products.images.alt-text', $a['product']), ['images' => [['id' => $own->id, 'alt_text' => str_repeat('a', 256)]]])
        ->assertSessionHasErrors('images.0.alt_text');
    $this->actingAs($a['admin'])->put(route('products.images.alt-text', $b['product']), ['images' => [['id' => $foreign->id, 'alt_text' => 'Intruso']]])
        ->assertNotFound();

    expect(ProductImage::allTenants()->find($foreign->id)->alt_text)->toBeNull();
});

it('marks the product as changed when an alt text changes, so updated_since syncs it', function () {
    $w = makeInfoWorld('info-alt-sync');
    $image = app(TenantManager::class)->runAs($w['tenant'], fn () => ProductImage::create(['product_id' => $w['product']->id, 'image' => 'https://x.public.blob.vercel-storage.com/a.webp', 'sort_order' => 0]));

    $this->travelTo(now()->addHour());
    $this->actingAs($w['admin'])->put(route('products.images.alt-text', $w['product']), ['images' => [['id' => $image->id, 'alt_text' => 'Nuevo']]]);

    expect($w['product']->fresh()->updated_at->isSameHour(now()))->toBeTrue();
});

it('sends the gallery with its alt texts to the edit page', function () {
    $this->withoutVite();
    $w = makeInfoWorld('info-edit');
    app(TenantManager::class)->runAs($w['tenant'], fn () => ProductImage::create(['product_id' => $w['product']->id, 'image' => 'https://x.public.blob.vercel-storage.com/a.webp', 'alt_text' => 'Texto', 'sort_order' => 0]));

    $this->actingAs($w['admin'])->get(route('products.edit', $w['product']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('product.images.0.alt_text', 'Texto'));
});
