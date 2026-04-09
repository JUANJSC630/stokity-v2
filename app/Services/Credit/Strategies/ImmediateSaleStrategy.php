<?php

namespace App\Services\Credit\Strategies;

use App\Models\CashSession;
use App\Models\CreditSale;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use App\Services\StockMovementService;

/**
 * Strategy for Installments and Due Date credit types.
 *
 * - Sale is created IMMEDIATELY when the credit is opened.
 * - Stock is DEDUCTED on creation (product delivered).
 * - Completion only marks the credit as completed (Sale already exists).
 * - Cancellation does NOT reverse stock (product was already delivered).
 */
class ImmediateSaleStrategy implements CreditStrategyInterface
{
    public function __construct(private StockMovementService $stockMovements) {}

    public function createsImmediateSale(): bool
    {
        return true;
    }

    public function reservesStock(): bool
    {
        return false;
    }

    public function handleStockOnCreate(CreditSale $credit, User $user): void
    {
        // Stock is deducted when creating the immediate sale (handled in createSaleForCredit)
    }

    /**
     * Create the Sale record immediately and deduct stock.
     * Called by CreditService during credit creation.
     */
    public function createSaleForCredit(CreditSale $credit, User $user): Sale
    {
        do {
            $code = now()->format('YmdHis').rand(1000, 9999);
        } while (Sale::withTrashed()->where('code', $code)->exists());

        $session = CashSession::getOpenForUser($user->id, $credit->branch_id);

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
            'amount_paid' => $credit->amount_paid,
            'change_amount' => 0,
            'payment_method' => 'credito',
            'date' => now(),
            'status' => 'completed',
            'notes' => "Venta a crédito #{$credit->code}",
        ]);

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

            // Deduct stock immediately (product is delivered)
            if ($product && ! $product->isService()) {
                if ($product->stock < $item->quantity) {
                    throw new \RuntimeException(
                        "Stock insuficiente para {$product->name}. Disponible: {$product->stock}"
                    );
                }

                $previousStock = $product->stock;
                $product->stock -= $item->quantity;
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
                    notes: "Crédito #{$credit->code} — Venta #{$sale->code}",
                );
            }
        }

        $gross = $credit->total_amount + $totalTax;
        $sale->update([
            'tax' => $totalTax,
            'total' => $gross,
            'amount_paid' => $credit->amount_paid,
        ]);

        return $sale;
    }

    public function handleCompletion(CreditSale $credit, User $user): void
    {
        // Sale already exists — just mark credit as completed
        $credit->status = CreditSale::STATUS_COMPLETED;
        $credit->save();
    }

    public function handleCancellation(CreditSale $credit, User $user): void
    {
        // Product was already delivered — no stock reversal
        // Business must handle physical return manually
        $credit->status = CreditSale::STATUS_CANCELLED;
        $credit->save();
    }
}
