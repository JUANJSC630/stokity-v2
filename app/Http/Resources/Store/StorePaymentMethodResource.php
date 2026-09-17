<?php

namespace App\Http\Resources\Store;

use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\PaymentMethod */
class StorePaymentMethodResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'code' => $this->code,
            'name' => $this->name,
        ];
    }
}
