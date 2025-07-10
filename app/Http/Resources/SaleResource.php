<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class SaleResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'branch_id' => $this->branch_id,
            'code' => $this->code,
            'client_id' => $this->client_id,
            'seller_id' => $this->seller_id,
            'tax' => $this->tax,
            'net' => $this->net,
            'total' => $this->total,
            'payment_method' => $this->payment_method,
            'date' => $this->date,
            'status' => $this->status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'branch' => $this->whenLoaded('branch'),
            'client' => $this->whenLoaded('client'),
            'seller' => $this->whenLoaded('seller'),
            // Asegurarnos de que siempre devuelve un array, incluso si no hay productos
            'saleProducts' => $this->whenLoaded('saleProducts', function () {
                return SaleProductResource::collection($this->saleProducts);
            }, []),
        ];
    }
}
