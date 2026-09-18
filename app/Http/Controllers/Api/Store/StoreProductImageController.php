<?php

namespace App\Http\Controllers\Api\Store;

use App\Http\Controllers\Controller;
use App\Http\Resources\Store\StoreProductImageResource;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Mutating counterpart to StoreProductController — deliberately its own
 * controller/route pair rather than extra methods bolted onto that
 * read-only one (see routes/api.php's docblock on why writes here are a
 * separate, explicit carve-out).
 *
 * Never touches BlobStorageService or Vercel Blob itself: the storefront
 * has already uploaded the file to its OWN Blob store before calling here.
 * This only records/removes the resulting URL against a product — deleting
 * a row here never deletes the underlying blob, which lives outside
 * Stokity's storage and is the storefront's own responsibility to clean up.
 */
class StoreProductImageController extends Controller
{
    public function store(Request $request, string $identifier): JsonResponse
    {
        $product = Product::findActiveForStoreApi($identifier);

        $validated = $request->validate([
            'image_url' => [
                'required',
                'string',
                'max:2048',
                'url',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! str_starts_with($value, 'https://')) {
                        $fail('image_url debe ser una URL https.');
                    }
                },
            ],
        ]);

        $currentCount = $product->images()->count();

        if ($currentCount >= ProductImage::MAX_PER_PRODUCT) {
            throw ValidationException::withMessages([
                'image_url' => 'Este producto ya alcanzó el máximo de '.ProductImage::MAX_PER_PRODUCT.' imágenes.',
            ]);
        }

        $image = $product->images()->create([
            'image' => $validated['image_url'],
            'sort_order' => $currentCount,
        ]);

        return (new StoreProductImageResource($image))
            ->response()
            ->setStatusCode(201);
    }

    public function destroy(string $identifier, int $imageId): JsonResponse
    {
        $product = Product::findActiveForStoreApi($identifier);

        $product->images()->findOrFail($imageId)->delete();

        return response()->json(null, 204);
    }
}
