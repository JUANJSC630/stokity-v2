<?php

namespace App\Http\Resources\Store;

use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Category */
class StoreCategoryResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            // Categories have no image yet; the field is part of the contract so
            // storefronts can code against it today.
            'image_url' => null,
            // Visible products only (see StoreCategoryController); absent where
            // a category is embedded in a product.
            'products_count' => $this->whenCounted('products'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
