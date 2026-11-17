<?php

use App\Models\BlobDeletion;
use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Tenant;
use App\Services\BlobStorageService;
use App\Tenancy\TenantManager;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;

const OWN_BLOB = 'https://own123.public.blob.vercel-storage.com';

beforeEach(function () {
    config(['services.vercel_blob.token' => 'test-token-not-real']);
    $this->tenant = Tenant::create(['name' => 'Lu', 'slug' => 'lu-blobs', 'status' => 'active']);
    app(TenantManager::class)->set($this->tenant);
    $this->ownUrl = fn (string $name) => OWN_BLOB."/stokity/t{$this->tenant->id}/products/{$name}.webp";
});

afterEach(fn () => app(TenantManager::class)->forget());

function blobDeleteRequests(): array
{
    return Http::recorded(fn (Request $request) => $request->method() === 'DELETE')
        ->map(fn ($pair) => $pair[0]->data()['urls'] ?? [])
        ->flatten()
        ->all();
}

function lifecycleProduct(array $attributes = []): Product
{
    return Product::factory()->create([
        'branch_id' => Branch::factory()->create()->id,
        'category_id' => Category::factory()->create()->id,
        ...$attributes,
    ]);
}

describe('scheduleDelete', function () {
    it('queues the files this tenant owns, with a grace period, and never deletes on the spot', function () {
        Http::fake();
        $own = ($this->ownUrl)('a');

        app(BlobStorageService::class)->scheduleDelete([$own, 'https://storefront.public.blob.vercel-storage.com/stokity/products/x.webp', null]);

        expect(BlobDeletion::pluck('url')->all())->toBe([$own])
            ->and(BlobDeletion::first()->delete_after->isAfter(now()->addDays(BlobStorageService::DELETE_GRACE_DAYS - 1)))->toBeTrue();
        Http::assertNothingSent();
    });

    it('gives an exhausted row a fresh set of attempts when it is scheduled again', function () {
        $url = ($this->ownUrl)('retry');
        BlobDeletion::create(['tenant_id' => $this->tenant->id, 'url' => $url, 'url_hash' => hash('sha256', $url), 'delete_after' => now(), 'attempts' => 5]);

        app(BlobStorageService::class)->scheduleDelete($url);

        expect(BlobDeletion::first()->attempts)->toBe(0);
    });

    it('takes a file out of the queue when it is referenced again', function () {
        Http::fake();
        $url = ($this->ownUrl)('back-again');
        app(BlobStorageService::class)->scheduleDelete($url);

        app(BlobStorageService::class)->unscheduleDelete($url);

        expect(BlobDeletion::count())->toBe(0);
    });

    it('queues the same file only once', function () {
        app(BlobStorageService::class)->scheduleDelete(($this->ownUrl)('a'));
        app(BlobStorageService::class)->scheduleDelete(($this->ownUrl)('a'));

        expect(BlobDeletion::count())->toBe(1);
    });
});

describe('blobs:purge', function () {
    it('deletes files past their grace period that nothing references', function () {
        Http::fake();
        $url = ($this->ownUrl)('orphan');
        BlobDeletion::create(['tenant_id' => $this->tenant->id, 'url' => $url, 'url_hash' => hash('sha256', $url), 'delete_after' => now()->subMinute()]);
        app(TenantManager::class)->forget();

        $this->artisan('blobs:purge')->assertSuccessful();

        expect(blobDeleteRequests())->toBe([$url])->and(BlobDeletion::count())->toBe(0);
    });

    it('keeps a file that is still referenced and drops it from the queue', function () {
        Http::fake();
        $url = ($this->ownUrl)('shared');
        $product = lifecycleProduct();
        ProductImage::factory()->create(['product_id' => $product->id, 'image' => $url]);
        BlobDeletion::create(['tenant_id' => $this->tenant->id, 'url' => $url, 'url_hash' => hash('sha256', $url), 'delete_after' => now()->subMinute()]);

        $this->artisan('blobs:purge')->assertSuccessful();

        expect(blobDeleteRequests())->toBe([])->and(BlobDeletion::count())->toBe(0);
    });

    it('leaves files whose grace period has not passed', function () {
        Http::fake();
        app(BlobStorageService::class)->scheduleDelete(($this->ownUrl)('recent'));

        $this->artisan('blobs:purge')->assertSuccessful();

        expect(blobDeleteRequests())->toBe([])->and(BlobDeletion::count())->toBe(1);
    });

    it('keeps the queue row and counts the attempt when Vercel refuses the delete', function () {
        Http::fake(['*' => Http::response('nope', 500)]);
        $url = ($this->ownUrl)('stubborn');
        BlobDeletion::create(['tenant_id' => $this->tenant->id, 'url' => $url, 'url_hash' => hash('sha256', $url), 'delete_after' => now()->subMinute()]);

        $this->artisan('blobs:purge')->assertSuccessful();

        expect(BlobDeletion::first()->attempts)->toBe(1);
    });

    it('only reports in dry-run mode', function () {
        Http::fake();
        $url = ($this->ownUrl)('dry');
        BlobDeletion::create(['tenant_id' => $this->tenant->id, 'url' => $url, 'url_hash' => hash('sha256', $url), 'delete_after' => now()->subMinute()]);

        $this->artisan('blobs:purge --dry-run')->expectsOutputToContain($url)->assertSuccessful();

        expect(blobDeleteRequests())->toBe([])->and(BlobDeletion::count())->toBe(1);
    });
});

describe('replacing and removing photos from the panel', function () {
    beforeEach(function () {
        BusinessSetting::factory()->create();
        $this->admin = adminUser();
    });

    it('queues the old cover instead of deleting it, and purge keeps it while the gallery still uses it', function () {
        $old = ($this->ownUrl)('old-cover');
        $product = lifecycleProduct(['image' => $old, 'branch_id' => $this->admin->branch_id]);
        ProductImage::factory()->create(['product_id' => $product->id, 'image' => $old]);
        Http::fake(['blob.vercel-storage.com/*' => Http::response(['url' => ($this->ownUrl)('new-cover')])]);

        $this->actingAs($this->admin)
            ->post(route('products.update', $product), [
                '_method' => 'PUT',
                'name' => $product->name,
                'code' => $product->code,
                'purchase_price' => 1000,
                'sale_price' => 2000,
                'tax' => 19,
                'min_stock' => 1,
                'category_id' => $product->category_id,
                'branch_id' => $product->branch_id,
                'image' => UploadedFile::fake()->image('nueva.jpg', 40, 40),
            ])
            ->assertSessionHasNoErrors();

        expect($product->fresh())->image->toBe(($this->ownUrl)('new-cover'))->cover_image_id->toBeNull()
            ->and(blobDeleteRequests())->toBe([])
            ->and(BlobDeletion::pluck('url')->all())->toBe([$old]);

        $this->travel(BlobStorageService::DELETE_GRACE_DAYS + 1)->days();
        $this->artisan('blobs:purge')->assertSuccessful();

        expect(blobDeleteRequests())->toBe([]);
    });

    it('queues the cover and gallery files of a product deleted for good', function () {
        $cover = ($this->ownUrl)('cover');
        $gallery = ($this->ownUrl)('gallery');
        $product = lifecycleProduct(['image' => $cover, 'branch_id' => $this->admin->branch_id]);
        ProductImage::factory()->create(['product_id' => $product->id, 'image' => $gallery]);
        $product->delete();
        Http::fake();

        $this->actingAs($this->admin)->delete(route('products.force-delete', $product->id));

        expect(Product::withTrashed()->find($product->id))->toBeNull()
            ->and(BlobDeletion::pluck('url')->sort()->values()->all())->toBe([$cover, $gallery])
            ->and(blobDeleteRequests())->toBe([]);
    });
});

describe('storage owner', function () {
    it('tells files apart by the real host of Stokity\'s store, not by the path', function () {
        config(['services.vercel_blob.token' => 'vercel_blob_rw_Own123Store_abcDEF456']);

        expect(BlobStorageService::ownPublicHost())->toBe('own123store.public.blob.vercel-storage.com')
            ->and(BlobStorageService::storageOwner('https://own123store.public.blob.vercel-storage.com/stokity/t1/products/a.webp'))->toBe('stokity')
            ->and(BlobStorageService::storageOwner('https://other.public.blob.vercel-storage.com/stokity/t1/products/a.webp'))->toBe('storefront');
    });

    it('never queues a file from another store, even with a Stokity-looking path', function () {
        config(['services.vercel_blob.token' => 'vercel_blob_rw_Own123Store_abcDEF456']);

        app(BlobStorageService::class)->scheduleDelete("https://other.public.blob.vercel-storage.com/stokity/t{$this->tenant->id}/products/a.webp");

        expect(BlobDeletion::count())->toBe(0);
    });
});

describe('images:check-links', function () {
    it('marks found images ok and gone ones broken, leaving unknown answers alone', function () {
        $found = ($this->ownUrl)('found');
        $gone = 'https://storefront.public.blob.vercel-storage.com/stokity/products/gone.webp';
        $flaky = 'https://storefront.public.blob.vercel-storage.com/stokity/products/flaky.webp';
        $product = lifecycleProduct(['image' => $gone]);
        $okImage = ProductImage::factory()->create(['product_id' => $product->id, 'image' => $found]);
        $flakyImage = ProductImage::factory()->create(['product_id' => $product->id, 'image' => $flaky, 'image_ok' => true]);
        Http::fake([$found => Http::response('', 200), $gone => Http::response('', 404), $flaky => Http::response('', 503)]);
        app(TenantManager::class)->forget();

        $this->artisan('images:check-links')->assertSuccessful();

        expect(Product::withoutGlobalScopes()->find($product->id)->image_ok)->toBeFalse()
            ->and(ProductImage::withoutGlobalScopes()->find($okImage->id)->image_ok)->toBeTrue()
            ->and(ProductImage::withoutGlobalScopes()->find($flakyImage->id))
            ->image_ok->toBeTrue()
            ->image_checked_at->toBeNull();
    });

    it('only moves updated_at when the state changes, so storefront sync sees real changes', function () {
        $url = ($this->ownUrl)('steady');
        $product = lifecycleProduct(['image' => $url, 'image_ok' => true]);
        $before = $product->fresh()->updated_at;
        Http::fake([$url => Http::response('', 200)]);
        $this->travel(1)->hours();

        $this->artisan('images:check-links')->assertSuccessful();

        expect($product->fresh())
            ->updated_at->toEqual($before)
            ->image_checked_at->not->toBeNull();
    });

    it('does not move the product\'s updated_at for an unchanged gallery image, but does when it breaks', function () {
        $url = ($this->ownUrl)('gallery-steady');
        $product = lifecycleProduct();
        $image = ProductImage::factory()->create(['product_id' => $product->id, 'image' => $url, 'image_ok' => true]);
        $before = $product->fresh()->updated_at;
        app(TenantManager::class)->forget();
        $this->travel(1)->hours();
        Http::fake([$url => Http::sequence()->push('', 200)->push('', 404)]);

        $this->artisan('images:check-links')->assertSuccessful();
        expect(Product::withoutGlobalScopes()->find($product->id)->updated_at)->toEqual($before);

        $this->travel(1)->hours();
        $this->artisan('images:check-links')->assertSuccessful();

        expect(ProductImage::withoutGlobalScopes()->find($image->id)->image_ok)->toBeFalse()
            ->and(Product::withoutGlobalScopes()->find($product->id)->updated_at->isAfter($before))->toBeTrue();
    });

    it('drops the answer for a cover that was replaced while it was being checked', function () {
        $old = 'https://storefront.public.blob.vercel-storage.com/stokity/products/old.webp';
        $new = 'https://storefront.public.blob.vercel-storage.com/stokity/products/new.webp';
        $product = lifecycleProduct(['image' => $old, 'image_ok' => true]);
        app(TenantManager::class)->forget();
        Http::fake(function () use ($product, $new) {
            Product::withoutGlobalScopes()->whereKey($product->id)->update(['image' => $new, 'image_ok' => true]);

            return Http::response('', 404);
        });

        $this->artisan('images:check-links')->assertSuccessful();

        expect(Product::withoutGlobalScopes()->find($product->id))->image->toBe($new)->image_ok->toBeTrue();
    });
});
