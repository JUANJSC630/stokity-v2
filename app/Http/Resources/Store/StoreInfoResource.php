<?php

namespace App\Http\Resources\Store;

use App\Services\StoreImageSummary;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Public "storefront look" of the business — never financial/operational
 * data (nit, module_config, ticket_config stay internal to the panel).
 *
 * @mixin \App\Models\BusinessSetting
 */
class StoreInfoResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'name' => $this->name,
            'logo_url' => $this->logo_url,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'social_media' => $this->social_media,
            'currency_symbol' => $this->currency_symbol,
            'brand_color' => $this->brand_color,
            'brand_color_secondary' => $this->brand_color_secondary,
            'images' => [
                // Every host this business's photos are served from (Stokity's
                // Blob store, the storefront's own, ...). Build CSP img-src and
                // image-optimizer allow lists from this, not by hand.
                'hosts' => app(StoreImageSummary::class)->hosts(),
                // Covers and gallery images that answered 404 at the last
                // nightly `images:check-links` run.
                'broken_count' => app(StoreImageSummary::class)->brokenCount(),
            ],
        ];
    }
}
