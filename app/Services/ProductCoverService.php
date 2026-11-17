<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Support\Facades\DB;

/**
 * Keeps a product's cover and its gallery consistent.
 *
 * `products.image` is the URL every screen shows; `products.cover_image_id`
 * says which gallery row that URL came from, when it came from one. Every
 * cover change goes through here so the two never drift apart, and removing
 * the gallery image that is the cover moves the cover instead of leaving it
 * pointing at a file that is about to be deleted.
 *
 * Every write locks and re-reads the product row inside a transaction, so two
 * concurrent cover changes (or a change racing a gallery delete) serialize
 * instead of mixing one request's URL with the other's cover_image_id.
 */
class ProductCoverService
{
    public function __construct(private BlobStorageService $blob) {}

    /**
     * Point the cover at a URL that was just verified to exist. When the URL is
     * one of the product's gallery images (exact match), the cover references
     * that row; either way it is healthy, since it was fetched a moment ago.
     */
    public function setFromUrl(Product $product, string $url): void
    {
        $this->write($product, function (Product $locked) use ($url): array {
            $galleryImage = $locked->images()->get()->first(fn (ProductImage $image) => $image->image === $url);

            return ['image' => $url, 'cover_image_id' => $galleryImage?->id, 'image_ok' => true, 'image_checked_at' => now()];
        });
    }

    public function setFromGalleryImage(Product $product, ProductImage $image): void
    {
        $this->write($product, fn () => $this->fieldsFromGalleryImage($image));
    }

    /**
     * Cover uploaded from Stokity itself (not part of the gallery).
     */
    public function setUploaded(Product $product, string $url): void
    {
        $this->write($product, fn () => ['image' => $url, 'cover_image_id' => null, 'image_ok' => true, 'image_checked_at' => now()]);
    }

    /**
     * Delete a gallery image. When it is the cover, the next image in gallery
     * order becomes the cover, or the business default when none is left.
     *
     * @return array{was_cover: bool, cover_image_id: int|null, url_still_referenced: bool}
     */
    public function removeGalleryImage(Product $product, ProductImage $image): array
    {
        $wasCover = DB::transaction(function () use ($product, $image): bool {
            $locked = Product::query()->whereKey($product->id)->lockForUpdate()->firstOrFail();
            $wasCover = $locked->cover_image_id === $image->id || $locked->image === $image->image;

            $image->delete();

            if ($wasCover) {
                $next = $locked->images()->first();
                $locked->forceFill($next ? $this->fieldsFromGalleryImage($next) : [
                    'image' => null,
                    'cover_image_id' => null,
                    'image_ok' => null,
                    'image_checked_at' => null,
                ])->save();
            }

            return $wasCover;
        });

        $product->refresh();
        $stillReferenced = app(BlobReferences::class)->isReferenced($image->image);

        if (! $stillReferenced) {
            $this->blob->scheduleDelete($image->image);
        }

        return [
            'was_cover' => $wasCover,
            'cover_image_id' => $product->cover_image_id,
            'url_still_referenced' => $stillReferenced,
        ];
    }

    /**
     * A gallery image keeps its own last check: choosing a broken photo as the
     * cover must not report the cover as healthy.
     *
     * @return array<string, mixed>
     */
    private function fieldsFromGalleryImage(ProductImage $image): array
    {
        return [
            'image' => $image->image,
            'cover_image_id' => $image->id,
            'image_ok' => $image->image_ok,
            'image_checked_at' => $image->image_checked_at,
        ];
    }

    /**
     * @param  callable(Product): array<string, mixed>  $fields
     */
    private function write(Product $product, callable $fields): void
    {
        $previousUrl = DB::transaction(function () use ($product, $fields): ?string {
            $locked = Product::query()->whereKey($product->id)->lockForUpdate()->firstOrFail();
            $previousUrl = $locked->image;
            $newFields = $fields($locked);

            $locked->forceFill($newFields)->save();
            $this->blob->unscheduleDelete($newFields['image']);

            return $previousUrl !== $newFields['image'] ? $previousUrl : null;
        });

        $product->refresh();
        $this->blob->scheduleDelete($previousUrl);
    }
}
