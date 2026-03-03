<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockMovement;

class StockMovementService
{
    /**
     * Record a stock movement for a product.
     */
    public function record(
        Product $product,
        string $type,
        int $quantity,
        int $previousStock,
        int $newStock,
        int $branchId,
        int $userId,
        ?string $reference = null,
        ?string $notes = null,
    ): StockMovement {
        return StockMovement::create([
            'product_id'     => $product->id,
            'user_id'        => $userId,
            'branch_id'      => $branchId,
            'type'           => $type,
            'quantity'       => $quantity,
            'previous_stock' => $previousStock,
            'new_stock'      => $newStock,
            'unit_cost'      => $product->purchase_price,
            'reference'      => $reference,
            'notes'          => $notes,
            'movement_date'  => now(),
        ]);
    }
}
