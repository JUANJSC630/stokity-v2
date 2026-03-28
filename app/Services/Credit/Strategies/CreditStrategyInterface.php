<?php

namespace App\Services\Credit\Strategies;

use App\Models\CreditSale;
use App\Models\User;

interface CreditStrategyInterface
{
    /**
     * Whether this strategy creates a Sale immediately when the credit is opened.
     */
    public function createsImmediateSale(): bool;

    /**
     * Whether this strategy reserves stock instead of deducting it.
     */
    public function reservesStock(): bool;

    /**
     * Handle stock effects when creating the credit.
     * For layaway/hold: increment reserved_stock.
     * For installments/due_date: deduct stock and record movements.
     */
    public function handleStockOnCreate(CreditSale $credit, User $user): void;

    /**
     * Handle what happens when the credit is fully paid.
     * For layaway/hold: create Sale, deduct stock, release reserved_stock.
     * For installments/due_date: just mark completed (Sale already exists).
     */
    public function handleCompletion(CreditSale $credit, User $user): void;

    /**
     * Handle what happens when the credit is cancelled.
     * For layaway/hold: release reserved_stock.
     * For installments/due_date: no stock reversal (product was delivered).
     */
    public function handleCancellation(CreditSale $credit, User $user): void;
}
