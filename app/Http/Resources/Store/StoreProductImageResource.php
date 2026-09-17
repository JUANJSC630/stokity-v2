<?php

namespace App\Http\Resources\Store;

use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\ProductImage */
class StoreProductImageResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'url' => $this->image_url,
            'sort_order' => $this->sort_order,
        ];
    }
}
