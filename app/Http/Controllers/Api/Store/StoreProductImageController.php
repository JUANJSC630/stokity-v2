<?php

namespace App\Http\Controllers\Api\Store;

use App\Http\Controllers\Controller;
use App\Http\Resources\Store\StoreProductImageResource;
use App\Http\Resources\Store\StoreProductResource;
use App\Models\Product;
use App\Models\ProductImage;
use App\Rules\ExistingHttpsBlobUrl;
use App\Services\ProductCoverService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Mutating counterpart to StoreProductController — deliberately its own
 * controller/route pair rather than extra methods bolted onto that
 * read-only one (see routes/api.php's docblock on why writes here are a
 * separate, explicit carve-out).
 *
 * Never uploads to Vercel Blob itself: the storefront has already uploaded
 * the file to its OWN Blob store before calling here. This only records or
 * removes the resulting URL against a product. Deleting a row never deletes a
 * storefront file (that store is the storefront's to clean up, guided by
 * `url_still_referenced`); a Stokity-owned file is only queued for deferred
 * deletion (BlobStorageService::scheduleDelete()).
 */
class StoreProductImageController extends Controller
{
    public function store(Request $request, string $identifier): JsonResponse
    {
        // Resolved once, outside the transaction, so a bad identifier 404s
        // immediately rather than opening a transaction for nothing.
        $product = Product::findActiveForStoreApi($identifier);

        $validated = $request->validate([
            'image_url' => [
                'required',
                'string',
                'max:2048',
                'url',
                new ExistingHttpsBlobUrl,
            ],
            'alt_text' => ['nullable', 'string', 'max:255'],
        ]);

        // lockForUpdate() on the product row serializes two concurrent
        // uploads for the SAME product — without it, both requests could
        // read the same images()->count() before either commits its
        // create(), letting the gallery exceed MAX_PER_PRODUCT or land two
        // images on the same sort_order.
        $image = DB::transaction(function () use ($product, $validated) {
            $lockedProduct = Product::whereKey($product->id)->lockForUpdate()->firstOrFail();

            $currentCount = $lockedProduct->images()->count();

            if ($currentCount >= ProductImage::MAX_PER_PRODUCT) {
                throw ValidationException::withMessages([
                    'image_url' => 'Este producto ya alcanzó el máximo de '.ProductImage::MAX_PER_PRODUCT.' imágenes.',
                ]);
            }

            return $lockedProduct->images()->create([
                'image' => $validated['image_url'],
                'alt_text' => $validated['alt_text'] ?? null,
                'sort_order' => $currentCount,
                // ExistingHttpsBlobUrl just fetched it successfully.
                'image_ok' => true,
                'image_checked_at' => now(),
            ]);
        });

        return (new StoreProductImageResource($image))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Removes a gallery image. If it was the cover, the cover moves to the next
     * gallery image (or the business default when none is left) instead of
     * keeping a URL that nobody tracks any more.
     *
     * `url_still_referenced` tells the storefront whether the file behind the
     * deleted image is still used by another product, cover or setting: it must
     * only delete the file from its own Blob store when this is false.
     */
    public function destroy(string $identifier, int $imageId, ProductCoverService $covers): JsonResponse
    {
        $product = Product::findActiveForStoreApi($identifier);
        $image = $product->images()->findOrFail($imageId);

        $result = $covers->removeGalleryImage($product, $image);

        return response()->json([
            'data' => [
                'deleted_image_id' => $image->id,
                'deleted_url' => $image->image,
                'was_cover' => $result['was_cover'],
                'url_still_referenced' => $result['url_still_referenced'],
                'cover' => [
                    'image_id' => $result['cover_image_id'],
                    'url' => $product->image_url,
                    'is_default' => $product->image === null,
                ],
            ],
        ]);
    }

    /**
     * Reassigns sort_order for a product's entire gallery in one call —
     * `image_ids` must be exactly the full set of that product's image ids,
     * in the desired final order, never a partial list: `size` (matching
     * the product's current image count) plus `distinct` plus `Rule::in()`
     * together rule out every way a partial/foreign list could sneak
     * through (missing an id, repeating one to mask a missing one, or
     * including one that belongs to a different product/tenant).
     */
    public function updateOrder(Request $request, string $identifier): StoreProductResource
    {
        $product = Product::findActiveForStoreApi($identifier);

        $imageIds = $product->images()->pluck('id');

        $validated = $request->validate([
            'image_ids' => ['required', 'array', 'size:'.$imageIds->count()],
            'image_ids.*' => ['integer', 'distinct', Rule::in($imageIds)],
        ]);

        // Transaction so a failure partway through (deadlock, lock timeout)
        // rolls back every reassignment instead of leaving the gallery with
        // some images already moved to their new position and others not.
        DB::transaction(function () use ($validated, $product) {
            foreach ($validated['image_ids'] as $position => $imageId) {
                ProductImage::whereKey($imageId)->update(['sort_order' => $position]);
            }

            // Query-level updates fire no model events, so the product's
            // updated_at (what `updated_since` sync reads) is bumped here.
            $product->touch();
        });

        return new StoreProductResource($product->load(Product::STORE_RELATIONS));
    }
}
