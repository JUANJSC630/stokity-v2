<?php

use App\Models\Product;
use App\Models\ProductImage;
use App\Tenancy\TenantManager;

const STOREFRONT_BLOB = 'https://storefront.public.blob.vercel-storage.com/stokity/products/pieza';

/**
 * @return array{world: array<string, mixed>, images: list<ProductImage>}
 */
function worldWithGallery(string $slug, int $count = 2): array
{
    $world = makeStoreWorld($slug, canManageMedia: true);

    $images = app(TenantManager::class)->runAs($world['tenant'], fn () => collect(range(0, $count - 1))
        ->map(fn (int $i) => ProductImage::factory()->create([
            'product_id' => $world['visibleProduct']->id,
            'image' => STOREFRONT_BLOB."/{$slug}-{$i}.webp",
            'sort_order' => $i,
        ]))->all());

    return ['world' => $world, 'images' => $images];
}

function freshProduct(array $world): Product
{
    return app(TenantManager::class)->runAs($world['tenant'], fn () => Product::findOrFail($world['visibleProduct']->id));
}

describe('setting the cover', function () {
    it('links the cover to the gallery row when image_url is one of its images', function () {
        ['world' => $world, 'images' => $images] = worldWithGallery('cover-link');
        fakeReachableImageUrl($images[1]->image);

        $this->withToken($world['plainKey'])
            ->patchJson('/api/v1/store/products/'.$world['visibleProduct']->slug, ['image_url' => $images[1]->image])
            ->assertOk()
            ->assertJsonPath('data.cover_image_id', $images[1]->id)
            ->assertJsonPath('data.image_url', $images[1]->image);

        expect(freshProduct($world))
            ->cover_image_id->toBe($images[1]->id)
            ->image_ok->toBeTrue();
    });

    it('sets the cover by cover_image_id', function () {
        ['world' => $world, 'images' => $images] = worldWithGallery('cover-by-id');

        $this->withToken($world['plainKey'])
            ->patchJson('/api/v1/store/products/'.$world['visibleProduct']->slug, ['cover_image_id' => $images[0]->id])
            ->assertOk()
            ->assertJsonPath('data.cover_image_id', $images[0]->id)
            ->assertJsonPath('data.image_url', $images[0]->image);
    });

    it('rejects a cover_image_id from another product', function () {
        ['world' => $world] = worldWithGallery('cover-foreign');
        ['images' => $other] = worldWithGallery('cover-foreign-other');

        $this->withToken($world['plainKey'])
            ->patchJson('/api/v1/store/products/'.$world['visibleProduct']->slug, ['cover_image_id' => $other[0]->id])
            ->assertJsonValidationErrors('cover_image_id');
    });

    it('does not accept image_url and cover_image_id together', function () {
        ['world' => $world, 'images' => $images] = worldWithGallery('cover-both');
        fakeReachableImageUrl($images[0]->image);

        $this->withToken($world['plainKey'])
            ->patchJson('/api/v1/store/products/'.$world['visibleProduct']->slug, [
                'image_url' => $images[0]->image,
                'cover_image_id' => $images[0]->id,
            ])
            ->assertJsonValidationErrors('image_url');
    });

    it('applies nothing when the cover is rejected, not even the visibility sent with it', function () {
        ['world' => $world] = worldWithGallery('cover-atomic');
        ['images' => $other] = worldWithGallery('cover-atomic-other');

        $this->withToken($world['plainKey'])
            ->patchJson('/api/v1/store/products/'.$world['hiddenProduct']->code, [
                'show_in_storefront' => true,
                'cover_image_id' => $other[0]->id,
            ])
            ->assertJsonValidationErrors('cover_image_id');

        expect(app(TenantManager::class)->runAs($world['tenant'], fn () => $world['hiddenProduct']->fresh()->show_in_storefront))->toBeFalse();
    });

    it('keeps the health of a broken gallery image chosen as the cover', function () {
        ['world' => $world, 'images' => $images] = worldWithGallery('cover-broken');
        app(TenantManager::class)->runAs($world['tenant'], fn () => $images[0]->forceFill(['image_ok' => false])->save());

        $this->withToken($world['plainKey'])
            ->patchJson('/api/v1/store/products/'.$world['visibleProduct']->slug, ['cover_image_id' => $images[0]->id])
            ->assertOk()
            ->assertJsonPath('data.image_ok', false);
    });

    it('only links the cover to a gallery image with exactly the same URL', function () {
        ['world' => $world, 'images' => $images] = worldWithGallery('cover-case');
        $differentCase = str_replace('/cover-case-0.webp', '/COVER-CASE-0.webp', $images[0]->image);
        fakeReachableImageUrl($differentCase);

        $this->withToken($world['plainKey'])
            ->patchJson('/api/v1/store/products/'.$world['visibleProduct']->slug, ['image_url' => $differentCase])
            ->assertOk()
            ->assertJsonPath('data.cover_image_id', null)
            ->assertJsonPath('data.image_url', $differentCase);
    });

    it('keeps a cover that is not in the gallery unlinked', function () {
        ['world' => $world] = worldWithGallery('cover-outside');
        fakeReachableImageUrl(STOREFRONT_BLOB.'/solo-portada.webp');

        $this->withToken($world['plainKey'])
            ->patchJson('/api/v1/store/products/'.$world['visibleProduct']->slug, ['image_url' => STOREFRONT_BLOB.'/solo-portada.webp'])
            ->assertOk()
            ->assertJsonPath('data.cover_image_id', null);
    });
});

describe('deleting a gallery image', function () {
    it('moves the cover to the next gallery image when the deleted one was the cover', function () {
        ['world' => $world, 'images' => $images] = worldWithGallery('delete-cover', 3);
        app(TenantManager::class)->runAs($world['tenant'], fn () => $world['visibleProduct']->forceFill([
            'image' => $images[0]->image,
            'cover_image_id' => $images[0]->id,
        ])->save());

        $this->withToken($world['plainKey'])
            ->deleteJson('/api/v1/store/products/'.$world['visibleProduct']->slug.'/images/'.$images[0]->id)
            ->assertOk()
            ->assertJsonPath('data.was_cover', true)
            ->assertJsonPath('data.url_still_referenced', false)
            ->assertJsonPath('data.cover.image_id', $images[1]->id)
            ->assertJsonPath('data.cover.url', $images[1]->image)
            ->assertJsonPath('data.cover.is_default', false);

        expect(freshProduct($world))
            ->image->toBe($images[1]->image)
            ->cover_image_id->toBe($images[1]->id);
    });

    it('falls back to the default image when the last gallery image was the cover', function () {
        ['world' => $world, 'images' => $images] = worldWithGallery('delete-last-cover', 1);
        app(TenantManager::class)->runAs($world['tenant'], fn () => $world['visibleProduct']->forceFill([
            'image' => $images[0]->image,
            'cover_image_id' => $images[0]->id,
        ])->save());

        $this->withToken($world['plainKey'])
            ->deleteJson('/api/v1/store/products/'.$world['visibleProduct']->slug.'/images/'.$images[0]->id)
            ->assertOk()
            ->assertJsonPath('data.was_cover', true)
            ->assertJsonPath('data.cover.image_id', null)
            ->assertJsonPath('data.cover.is_default', true);

        expect(freshProduct($world))->image->toBeNull()->cover_image_id->toBeNull();
    });

    it('treats a cover that only shares the URL (set before cover_image_id existed) as the cover', function () {
        ['world' => $world, 'images' => $images] = worldWithGallery('delete-legacy-cover');
        app(TenantManager::class)->runAs($world['tenant'], fn () => $world['visibleProduct']->forceFill([
            'image' => $images[0]->image,
            'cover_image_id' => null,
        ])->save());

        $this->withToken($world['plainKey'])
            ->deleteJson('/api/v1/store/products/'.$world['visibleProduct']->slug.'/images/'.$images[0]->id)
            ->assertOk()
            ->assertJsonPath('data.was_cover', true);

        expect(freshProduct($world)->image)->toBe($images[1]->image);
    });

    it('leaves the cover alone when the deleted image was not the cover', function () {
        ['world' => $world, 'images' => $images] = worldWithGallery('delete-not-cover');
        app(TenantManager::class)->runAs($world['tenant'], fn () => $world['visibleProduct']->forceFill([
            'image' => $images[0]->image,
            'cover_image_id' => $images[0]->id,
        ])->save());

        $this->withToken($world['plainKey'])
            ->deleteJson('/api/v1/store/products/'.$world['visibleProduct']->slug.'/images/'.$images[1]->id)
            ->assertOk()
            ->assertJsonPath('data.was_cover', false)
            ->assertJsonPath('data.cover.image_id', $images[0]->id);
    });

    it('says the file is still referenced when another product uses the same URL', function () {
        ['world' => $world, 'images' => $images] = worldWithGallery('delete-shared');
        app(TenantManager::class)->runAs($world['tenant'], fn () => $world['hiddenProduct']->forceFill(['image' => $images[1]->image])->save());

        $this->withToken($world['plainKey'])
            ->deleteJson('/api/v1/store/products/'.$world['visibleProduct']->slug.'/images/'.$images[1]->id)
            ->assertOk()
            ->assertJsonPath('data.url_still_referenced', true);
    });
});

describe('image metadata in responses', function () {
    it('tells who stores each file and whether it was found at the last check', function () {
        ['world' => $world, 'images' => $images] = worldWithGallery('owner-meta', 1);
        app(TenantManager::class)->runAs($world['tenant'], function () use ($world, $images) {
            $images[0]->forceFill(['image_ok' => false])->save();
            $world['visibleProduct']->forceFill([
                'image' => 'https://own.public.blob.vercel-storage.com/stokity/t'.$world['tenant']->id.'/products/a.webp',
                'image_ok' => true,
            ])->save();
        });

        $this->withToken($world['plainKey'])
            ->getJson('/api/v1/store/products/'.$world['visibleProduct']->slug)
            ->assertOk()
            ->assertJsonPath('data.image_storage_owner', 'stokity')
            ->assertJsonPath('data.image_ok', true)
            ->assertJsonPath('data.gallery.0.storage_owner', 'storefront')
            ->assertJsonPath('data.gallery.0.image_ok', false);
    });

    it('lists the image hosts and the broken count on /store/info', function () {
        ['world' => $world, 'images' => $images] = worldWithGallery('info-hosts', 1);
        app(TenantManager::class)->runAs($world['tenant'], function () use ($world, $images) {
            $images[0]->forceFill(['image_ok' => false])->save();
            $world['visibleProduct']->forceFill(['image' => 'https://own.public.blob.vercel-storage.com/stokity/t1/products/a.webp'])->save();
        });

        $images = $this->withToken($world['plainKey'])
            ->getJson('/api/v1/store/info')
            ->assertOk()
            ->json('data.images');

        expect($images['hosts'])->toContain('own.public.blob.vercel-storage.com', 'storefront.public.blob.vercel-storage.com')
            ->and($images['broken_count'])->toBe(1);
    });
});
