<?php

namespace App\Http\Resources\Store;

use App\Services\BlobStorageService;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\ProductImage */
class StoreProductImageResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            // Exposed so the storefront can address this image in a later
            // DELETE /products/{slug}/images/{imageId} call — the gallery
            // entries in StoreProductResource need it for the same reason.
            'id' => $this->id,
            'url' => $this->image_url,
            'alt_text' => $this->alt_text,
            'sort_order' => $this->sort_order,
            // `stokity` or `storefront`: which Blob store holds the file, so the
            // storefront only ever tries to clean up files that are its own.
            'storage_owner' => BlobStorageService::storageOwner($this->image),
            // null = not checked yet; false = the file answered 404 at the last
            // `images:check-links` run.
            'image_ok' => $this->image_ok,
        ];
    }
}
