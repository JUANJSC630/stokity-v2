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
 */
class ProductCoverService
{
    public function __construct(private BlobStorageService $blob) {}

    /**
     * Point the cover at a URL that was just verified to exist. When the URL is
     * one of the product's gallery images, the cover references that row.
     */
    public function setFromUrl(Product $product, string $url): void
    {
        $galleryImage = $product->images()->where('image', $url)->first();

        if ($galleryImage) {
            $this->setFromGalleryImage($product, $galleryImage);

            return;
        }

        $this->replace($product, $url, null);
    }

    public function setFromGalleryImage(Product $product, ProductImage $image): void
    {
        $this->replace($product, $image->image, $image->id);
    }

    /**
     * Cover uploaded from Stokity itself (not part of the gallery).
     */
    public function setUploaded(Product $product, string $url): void
    {
        $this->replace($product, $url, null);
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
                $locked->forceFill([
                    'image' => $next?->image,
                    'cover_image_id' => $next?->id,
                    'image_ok' => $next?->image_ok,
                    'image_checked_at' => $next?->image_checked_at,
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

    private function replace(Product $product, string $url, ?int $coverImageId): void
    {
        $previousUrl = $product->image;

        $product->forceFill([
            'image' => $url,
            'cover_image_id' => $coverImageId,
            'image_ok' => true,
            'image_checked_at' => now(),
        ])->save();

        if ($previousUrl && $previousUrl !== $url) {
            $this->blob->scheduleDelete($previousUrl);
        }
    }
}
