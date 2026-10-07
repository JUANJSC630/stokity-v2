<?php

use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use App\Services\BlobStorageService;
use App\Tenancy\TenantManager;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;

const BLOB_HOST = 'https://abc123.public.blob.vercel-storage.com';

beforeEach(function () {
    config(['services.vercel_blob.token' => 'test-token-not-real']);
    $this->tenantA = Tenant::create(['name' => 'A', 'slug' => 'tenant-a', 'status' => 'active']);
    $this->tenantB = Tenant::create(['name' => 'B', 'slug' => 'tenant-b', 'status' => 'active']);
    app(TenantManager::class)->set($this->tenantA);
});

afterEach(fn () => app(TenantManager::class)->forget());

function deletedUrls(): array
{
    $urls = [];
    Http::recorded(function (Request $request) use (&$urls) {
        if ($request->method() === 'DELETE') {
            $urls = array_merge($urls, $request->data()['urls'] ?? []);
        }
    });

    return $urls;
}

describe('BlobStorageService::delete', function () {
    it('deletes blobs that live under the current tenant prefix', function () {
        Http::fake();
        $own = BLOB_HOST."/stokity/t{$this->tenantA->id}/products/a.webp";

        app(BlobStorageService::class)->delete($own);

        expect(deletedUrls())->toBe([$own]);
    });

    it('never deletes a blob that belongs to another tenant', function () {
        Http::fake();
        $foreign = BLOB_HOST."/stokity/t{$this->tenantB->id}/products/b.webp";

        app(BlobStorageService::class)->delete($foreign);

        Http::assertNothingSent();
    });

    it('only sends the owned urls when given a mix', function () {
        Http::fake();
        $own = BLOB_HOST."/stokity/t{$this->tenantA->id}/settings/logo.webp";
        $foreign = BLOB_HOST."/stokity/t{$this->tenantB->id}/settings/logo.webp";

        app(BlobStorageService::class)->delete([$foreign, $own]);

        expect(deletedUrls())->toBe([$own]);
    });

    it('skips legacy blobs without a tenant prefix', function () {
        Http::fake();

        app(BlobStorageService::class)->delete(BLOB_HOST.'/stokity/products/legacy.webp');

        Http::assertNothingSent();
    });

    it('rejects look-alike hosts and non-https urls', function (string $url) {
        Http::fake();

        app(BlobStorageService::class)->delete($url);

        Http::assertNothingSent();
    })->with(fn () => [
        'substring only' => ['https://evil.example/?x=vercel-storage.com'],
        'suffix trick' => ['https://abc.blob.vercel-storage.com.evil.example/stokity/t1/a.webp'],
        'no dot boundary' => ['https://evilblob.vercel-storage.com/stokity/t1/a.webp'],
        'plain http' => ['http://abc123.public.blob.vercel-storage.com/stokity/t1/a.webp'],
        'path traversal' => ['https://abc123.public.blob.vercel-storage.com/stokity/t1/../t2/a.webp'],
        'local path' => ['/uploads/products/a.jpg'],
    ]);

    it('deletes nothing when there is no tenant context', function () {
        Http::fake();
        app(TenantManager::class)->forget();

        app(BlobStorageService::class)->delete(BLOB_HOST."/stokity/t{$this->tenantA->id}/products/a.webp");

        Http::assertNothingSent();
    });
});

describe('BlobStorageService::upload', function () {
    it('stores new blobs under the tenant prefix', function () {
        Http::fake(fn () => Http::response(['url' => BLOB_HOST.'/ok.webp']));

        app(BlobStorageService::class)->upload(UploadedFile::fake()->image('p.png', 20, 20), 'products');

        Http::assertSent(fn (Request $request) => $request->method() === 'PUT'
            && str_contains($request->url(), "/stokity/t{$this->tenantA->id}/products/"));
    });
});

describe('permanently deleting a product', function () {
    it('does not delete the blob of another tenant that was saved as its image', function () {
        Http::fake();
        $foreign = BLOB_HOST."/stokity/t{$this->tenantB->id}/products/victim.webp";

        [$admin, $product] = app(TenantManager::class)->runAs($this->tenantA, function () use ($foreign) {
            $branch = Branch::factory()->create();
            $product = Product::factory()->create([
                'branch_id' => $branch->id,
                'category_id' => Category::factory()->create()->id,
                'image' => $foreign,
            ]);
            $product->delete();

            return [User::factory()->create(['role' => 'administrador', 'branch_id' => $branch->id, 'status' => true]), $product];
        });

        $this->actingAs($admin)
            ->delete(route('products.force-delete', $product->id))
            ->assertRedirect();

        expect(Product::withoutGlobalScopes()->withTrashed()->find($product->id))->toBeNull();
        Http::assertNothingSent();
    });
});
