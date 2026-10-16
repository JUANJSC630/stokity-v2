<?php

use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductTag;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia;

uses(RefreshDatabase::class);

afterEach(function () {
    app(TenantManager::class)->forget();
    Carbon::setTestNow();
});

/**
 * @return array{tenant: Tenant, admin: User, seller: User, branch: Branch, category: Category, products: array<int, Product>}
 */
function makeTagWorld(string $slug, int $productCount = 3): array
{
    $tenant = Tenant::create(['name' => $slug, 'slug' => $slug, 'status' => 'active']);

    return app(TenantManager::class)->runAs($tenant, function () use ($tenant, $productCount) {
        $branch = Branch::factory()->create();
        $category = Category::factory()->create();

        return [
            'tenant' => $tenant,
            'admin' => adminUser($branch),
            'seller' => vendedorUser($branch),
            'branch' => $branch,
            'category' => $category,
            'products' => Product::factory()->count($productCount)->create([
                'branch_id' => $branch->id,
                'category_id' => $category->id,
                'show_in_storefront' => true,
                'status' => true,
            ])->all(),
        ];
    });
}

it('creates, renames and deletes a tag; the slug is generated once and never changes', function () {
    $w = makeTagWorld('tags-crud');

    $this->actingAs($w['admin'])->post(route('product-tags.store'), ['name' => 'Hecho a mano'])->assertRedirect();

    $tag = ProductTag::where('name', 'Hecho a mano')->firstOrFail();
    expect($tag->slug)->toBe('hecho-a-mano')->and($tag->tenant_id)->toBe($w['tenant']->id);

    $this->actingAs($w['admin'])->put(route('product-tags.update', $tag), ['name' => 'Artesanía'])->assertRedirect();
    expect($tag->fresh()->name)->toBe('Artesanía')->and($tag->fresh()->slug)->toBe('hecho-a-mano');

    $this->actingAs($w['admin'])->delete(route('product-tags.destroy', $tag))->assertRedirect();
    expect(ProductTag::count())->toBe(0);
});

it('suffixes the slug when two names collapse to the same one', function () {
    $w = makeTagWorld('tags-slug');

    app(TenantManager::class)->runAs($w['tenant'], function () {
        expect(ProductTag::create(['name' => 'Oro'])->slug)->toBe('oro')
            ->and(ProductTag::create(['name' => 'ORO!'])->slug)->toBe('oro-2');
    });
});

it('validates the name: required, max 40, unique per business, same name allowed in another business', function () {
    $a = makeTagWorld('tags-val-a');
    $b = makeTagWorld('tags-val-b');

    $this->actingAs($a['admin'])->post(route('product-tags.store'), ['name' => ''])->assertSessionHasErrors('name');
    $this->actingAs($a['admin'])->post(route('product-tags.store'), ['name' => str_repeat('a', 41)])->assertSessionHasErrors('name');
    $this->actingAs($a['admin'])->post(route('product-tags.store'), ['name' => str_repeat('a', 40)])->assertSessionHasNoErrors();
    $this->actingAs($a['admin'])->post(route('product-tags.store'), ['name' => str_repeat('a', 40)])->assertSessionHasErrors('name');
    $this->actingAs($b['admin'])->post(route('product-tags.store'), ['name' => str_repeat('a', 40)])->assertSessionHasNoErrors();
});

it('forbids a user without products.update from managing tags', function () {
    $w = makeTagWorld('tags-perm');

    $this->actingAs($w['seller'])->get(route('product-tags.index'))->assertForbidden();
    $this->actingAs($w['seller'])->post(route('product-tags.store'), ['name' => 'X'])->assertForbidden();
    expect(ProductTag::count())->toBe(0);
});

it('lists the tags of the business with their product counts', function () {
    $this->withoutVite();
    $w = makeTagWorld('tags-index');

    app(TenantManager::class)->runAs($w['tenant'], function () use ($w) {
        $tag = ProductTag::create(['name' => 'Artesanal']);
        $tag->products()->attach([$w['products'][0]->id, $w['products'][1]->id]);
    });

    $this->actingAs($w['admin'])->get(route('product-tags.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('product-tags/index')
            ->has('tags', 1)
            ->where('tags.0.name', 'Artesanal')
            ->where('tags.0.products_count', 2));
});

it('assigns a tag to three products at once and removes it again', function () {
    $w = makeTagWorld('tags-bulk');
    $tag = app(TenantManager::class)->runAs($w['tenant'], fn () => ProductTag::create(['name' => 'Artesanal']));
    $ids = collect($w['products'])->pluck('id')->all();

    Carbon::setTestNow('2030-01-01 10:00:00');
    $this->actingAs($w['admin'])->post(route('product-tags.assign'), ['product_ids' => $ids, 'tag_id' => $tag->id, 'action' => 'add'])
        ->assertRedirect()->assertSessionHas('success', 'Etiqueta agregada a 3 productos');

    app(TenantManager::class)->runAs($w['tenant'], function () use ($tag, $ids) {
        expect($tag->products()->count())->toBe(3)
            ->and(Product::whereIn('id', $ids)->pluck('updated_at')->every(fn ($d) => $d->toDateTimeString() === '2030-01-01 10:00:00'))->toBeTrue();
    });

    // Adding again changes nothing.
    $this->actingAs($w['admin'])->post(route('product-tags.assign'), ['product_ids' => $ids, 'tag_id' => $tag->id, 'action' => 'add'])
        ->assertSessionHas('success', 'Etiqueta agregada a 0 productos');

    $this->actingAs($w['admin'])->post(route('product-tags.assign'), ['product_ids' => [$ids[0], $ids[1]], 'tag_id' => $tag->id, 'action' => 'remove'])
        ->assertSessionHas('success', 'Etiqueta quitada de 2 productos');

    app(TenantManager::class)->runAs($w['tenant'], fn () => expect($tag->products()->pluck('products.id')->all())->toBe([$ids[2]]));
});

it('refuses the whole bulk add when a product would exceed 10 tags, changing nothing', function () {
    $w = makeTagWorld('tags-limit');

    [$tag, $full] = app(TenantManager::class)->runAs($w['tenant'], function () use ($w) {
        $tags = collect(range(1, 10))->map(fn ($i) => ProductTag::create(['name' => "Etiqueta {$i}"]));
        $w['products'][0]->tags()->attach($tags->pluck('id'));

        return [ProductTag::create(['name' => 'Once']), $w['products'][0]];
    });

    $this->actingAs($w['admin'])->post(route('product-tags.assign'), [
        'product_ids' => [$full->id, $w['products'][1]->id],
        'tag_id' => $tag->id,
        'action' => 'add',
    ])->assertSessionHasErrors('product_ids');

    app(TenantManager::class)->runAs($w['tenant'], fn () => expect($tag->products()->count())->toBe(0));
});

it('never assigns tags across businesses', function () {
    $a = makeTagWorld('tags-iso-a');
    $b = makeTagWorld('tags-iso-b');
    $tagA = app(TenantManager::class)->runAs($a['tenant'], fn () => ProductTag::create(['name' => 'Solo A']));
    $tagB = app(TenantManager::class)->runAs($b['tenant'], fn () => ProductTag::create(['name' => 'Solo B']));

    $this->actingAs($a['admin'])->post(route('product-tags.assign'), ['product_ids' => [$b['products'][0]->id], 'tag_id' => $tagA->id, 'action' => 'add'])
        ->assertSessionHasErrors('product_ids.0');
    $this->actingAs($a['admin'])->post(route('product-tags.assign'), ['product_ids' => [$a['products'][0]->id], 'tag_id' => $tagB->id, 'action' => 'add'])
        ->assertSessionHasErrors('tag_id');
    $this->actingAs($a['admin'])->put(route('product-tags.update', $tagB), ['name' => 'Hackeada'])->assertNotFound();
    $this->actingAs($a['admin'])->delete(route('product-tags.destroy', $tagB))->assertNotFound();

    expect(ProductTag::allTenants()->find($tagB->id)->name)->toBe('Solo B')
        ->and(ProductTag::allTenants()->find($tagA->id)->products()->count())->toBe(0);
});

it('deleting a tag only detaches it: the products stay intact and are marked as changed', function () {
    $w = makeTagWorld('tags-delete');
    $tag = app(TenantManager::class)->runAs($w['tenant'], function () use ($w) {
        $tag = ProductTag::create(['name' => 'Temporal']);
        $tag->products()->attach(collect($w['products'])->pluck('id'));

        return $tag;
    });

    Carbon::setTestNow('2031-02-03 04:05:06');
    $this->actingAs($w['admin'])->delete(route('product-tags.destroy', $tag))->assertRedirect();

    app(TenantManager::class)->runAs($w['tenant'], function () use ($w) {
        foreach ($w['products'] as $product) {
            $fresh = Product::find($product->id);
            expect($fresh)->not->toBeNull()
                ->and($fresh->name)->toBe($product->name)
                ->and($fresh->tags()->count())->toBe(0)
                ->and($fresh->updated_at->toDateTimeString())->toBe('2031-02-03 04:05:06');
        }
    });
});

it('sets tags from the product edit form, caps them at 10 and rejects foreign tags', function () {
    $w = makeTagWorld('tags-form', 1);
    $other = makeTagWorld('tags-form-other', 1);
    $product = $w['products'][0];

    [$one, $two, $foreign] = [
        app(TenantManager::class)->runAs($w['tenant'], fn () => ProductTag::create(['name' => 'Uno'])),
        app(TenantManager::class)->runAs($w['tenant'], fn () => ProductTag::create(['name' => 'Dos'])),
        app(TenantManager::class)->runAs($other['tenant'], fn () => ProductTag::create(['name' => 'Ajena'])),
    ];

    $payload = fn (array $tagIds) => [
        'name' => $product->name,
        'code' => $product->code,
        'sale_price' => $product->sale_price,
        'purchase_price' => $product->purchase_price,
        'tax' => 0,
        'min_stock' => 0,
        'category_id' => $w['category']->id,
        'branch_id' => $w['branch']->id,
        'status' => true,
        'tag_ids' => $tagIds,
    ];

    $this->actingAs($w['admin'])->put(route('products.update', $product), $payload([$one->id, $two->id]))->assertSessionHasNoErrors();
    app(TenantManager::class)->runAs($w['tenant'], fn () => expect(Product::find($product->id)->tags->pluck('name')->all())->toBe(['Dos', 'Uno']));

    $this->actingAs($w['admin'])->put(route('products.update', $product), $payload([$foreign->id]))->assertSessionHasErrors('tag_ids.0');
    $this->actingAs($w['admin'])->put(route('products.update', $product), $payload(range(1, 11)))->assertSessionHasErrors('tag_ids');

    $this->actingAs($w['admin'])->put(route('products.update', $product), $payload([]))->assertSessionHasNoErrors();
    app(TenantManager::class)->runAs($w['tenant'], fn () => expect(Product::find($product->id)->tags()->count())->toBe(0));
});

it('shares the business tags with the product list, create and edit pages', function () {
    $this->withoutVite();
    $w = makeTagWorld('tags-pages', 1);
    app(TenantManager::class)->runAs($w['tenant'], fn () => ProductTag::create(['name' => 'Artesanal']));

    foreach (['products.index' => [], 'products.create' => [], 'products.edit' => [$w['products'][0]]] as $routeName => $params) {
        $this->actingAs($w['admin'])->get(route($routeName, $params))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->has('tags', 1)->where('tags.0.name', 'Artesanal'));
    }
});
