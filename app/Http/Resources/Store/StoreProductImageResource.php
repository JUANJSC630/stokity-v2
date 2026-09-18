<?php

namespace App\Http\Resources\Store;

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
            'sort_order' => $this->sort_order,
        ];
    }
}
