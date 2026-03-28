<?php

namespace App\Services\Credit\Strategies;

use App\Models\CashSession;
use App\Models\CreditSale;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use App\Services\StockMovementService;

/**
 * Strategy for Layaway and Hold credit types.
 *
 * - Stock is RESERVED (not deducted) on creation.
 * - Sale is created only when the credit is fully paid.
 * - Cancellation releases reserved stock.
 */
class DeferredSaleStrategy implements CreditStrategyInterface
{
    public function __construct(private StockMovementService $stockMovements) {}

    public function createsImmediateSale(): bool
    {
        return false;
    }

    public function reservesStock(): bool
    {
        return true;
    }

    public function handleStockOnCreate(CreditSale $credit, User $user): void
    {
        foreach ($credit->items as $item) {
            $product = Product::lockForUpdate()->find($item->product_id);
            if ($product && !$product->isService()) {
                $product->reserved_stock += $item->quantity;
                $product->save();
            }
        }
    }

    public function handleCompletion(CreditSale $credit, User $user): void
    {
        // Generate sale code
        do {
            $code = now()->format('YmdHis') . rand(1000, 9999);
        } while (Sale::withTrashed()->where('code', $code)->exists());

        // Find open cash session
        $session = CashSession::getOpenForUser($user->id, $credit->branch_id);

        // Create the sale
        $sale = Sale::create([
            'branch_id' => $credit->branch_id,
            'session_id' => $session?->id,
            'credit_sale_id' => $credit->id,
            'code' => $code,
            'client_id' => $credit->client_id,
            'seller_id' => $credit->seller_id,
            'tax' => 0,
            'discount_type' => 'none',
            'discount_value' => 0,
            'discount_amount' => 0,
            'net' => $credit->total_amount,
            'total' => $credit->total_amount,
            'amount_paid' => $credit->total_amount,
            'change_amount' => 0,
            'payment_method' => 'credito',
            'date' => now(),
            'status' => 'completed',
            'notes' => "Crédito #{$credit->code} completado",
        ]);

        // Recalculate tax and create sale products
        $totalTax = 0;
        foreach ($credit->items as $item) {
            $product = Product::lockForUpdate()->find($item->product_id);
            $productTax = $product ? ($product->tax ?? 0) : 0;
            $itemTax = $item->subtotal * ($productTax / 100);
            $totalTax += $itemTax;

            $sale->saleProducts()->create([
                'product_id' => $item->product_id,
                'quantity' => $item->quantity,
                'price' => $item->unit_price,
                'purchase_price_snapshot' => $item->purchase_price_snapshot,
                'subtotal' => $item->subtotal,
            ]);

            // Deduct real stock and release reservation
            if ($product && !$product->isService()) {
                $previousStock = $product->stock;
                $product->stock -= $item->quantity;
                $product->reserved_stock = max(0, $product->reserved_stock - $item->quantity);
                $product->save();

                $this->stockMovements->record(
                    product: $product,
                    type: 'out',
                    quantity: $item->quantity,
                    previousStock: $previousStock,
                    newStock: $product->stock,
                    branchId: $credit->branch_id,
                    userId: $user->id,
                    reference: $sale->code,
                    notes: "Crédito #{$credit->code} completado — Venta #{$sale->code}",
                );
            }
        }

        // Update sale tax and total
        $gross = $credit->total_amount + $totalTax;
        $sale->update([
            'tax' => $totalTax,
            'total' => $gross,
            'amount_paid' => $gross,
        ]);

        // Link credit to sale
        $credit->sale_id = $sale->id;
        $credit->status = CreditSale::STATUS_COMPLETED;
        $credit->save();
    }

    public function handleCancellation(CreditSale $credit, User $user): void
    {
        // Release reserved stock
        foreach ($credit->items as $item) {
            $product = Product::lockForUpdate()->find($item->product_id);
            if ($product && !$product->isService()) {
                $product->reserved_stock = max(0, $product->reserved_stock - $item->quantity);
                $product->save();
            }
        }

        $credit->status = CreditSale::STATUS_CANCELLED;
        $credit->save();
    }
}
