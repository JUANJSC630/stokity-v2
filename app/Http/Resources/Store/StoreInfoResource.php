<?php

namespace App\Http\Resources\Store;

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
        ];
    }
}
