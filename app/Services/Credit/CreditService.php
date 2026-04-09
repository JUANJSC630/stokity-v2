<?php

namespace App\Services\Credit;

use App\Models\CreditSale;
use App\Models\Product;
use App\Models\User;
use App\Services\Credit\Strategies\CreditStrategyInterface;
use App\Services\Credit\Strategies\DeferredSaleStrategy;
use App\Services\Credit\Strategies\ImmediateSaleStrategy;
use Illuminate\Support\Facades\DB;

class CreditService
{
    public function __construct(
        private DeferredSaleStrategy $deferredStrategy,
        private ImmediateSaleStrategy $immediateStrategy,
    ) {}

    public function resolveStrategy(string $type): CreditStrategyInterface
    {
        return match ($type) {
            CreditSale::TYPE_LAYAWAY, CreditSale::TYPE_HOLD => $this->deferredStrategy,
            CreditSale::TYPE_INSTALLMENTS, CreditSale::TYPE_DUE_DATE => $this->immediateStrategy,
            default => throw new \InvalidArgumentException("Tipo de crédito no soportado: {$type}"),
        };
    }

    /**
     * Create a new credit sale.
     *
     * @param  array  $data  Credit data (type, client_id, branch_id, notes, due_date, installments_count, initial_payment)
     * @param  array  $items  Array of ['product_id', 'quantity', 'unit_price', 'subtotal']
     * @param  User  $user  The user creating the credit
     *
     * @throws \RuntimeException
     */
    public function create(array $data, array $items, User $user): CreditSale
    {
        $strategy = $this->resolveStrategy($data['type']);

        return DB::transaction(function () use ($data, $items, $user, $strategy) {
            // Validate stock availability
            $this->validateStock($items, $strategy->reservesStock());

            // Calculate total
            $totalAmount = collect($items)->sum('subtotal');

            // Generate code
            $code = CreditSale::generateCode($data['branch_id']);

            // Calculate installment amount if applicable
            $installmentAmount = null;
            if ($data['type'] === CreditSale::TYPE_INSTALLMENTS && ! empty($data['installments_count'])) {
                $installmentAmount = round($totalAmount / $data['installments_count'], 2);
            }

            $credit = CreditSale::create([
                'client_id' => $data['client_id'],
                'branch_id' => $data['branch_id'],
                'seller_id' => $user->id,
                'code' => $code,
                'type' => $data['type'],
                'total_amount' => $totalAmount,
                'amount_paid' => 0,
                'balance' => $totalAmount,
                'installments_count' => $data['installments_count'] ?? null,
                'installment_amount' => $installmentAmount,
                'due_date' => $data['due_date'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => CreditSale::STATUS_ACTIVE,
            ]);

            // Snapshot products with purchase price
            $purchasePrices = Product::whereIn('id', collect($items)->pluck('product_id'))
                ->pluck('purchase_price', 'id');

            foreach ($items as $item) {
                $product = Product::find($item['product_id']);
                $credit->items()->create([
                    'product_id' => $item['product_id'],
                    'product_name' => $product->name,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'subtotal' => $item['subtotal'],
                    'purchase_price_snapshot' => $purchasePrices->get($item['product_id']),
                ]);
            }

            $credit->load('items');

            // Apply stock effects
            $strategy->handleStockOnCreate($credit, $user);

            // For immediate sale types, create the Sale now
            if ($strategy instanceof ImmediateSaleStrategy) {
                $sale = $strategy->createSaleForCredit($credit, $user);
                $credit->sale_id = $sale->id;
                $credit->save();
            }

            return $credit;
        });
    }

    /**
     * Cancel a credit sale. Only admin/encargado can do this.
     */
    public function cancel(CreditSale $credit, User $user): void
    {
        if ($credit->status !== CreditSale::STATUS_ACTIVE) {
            throw new \RuntimeException('Solo se pueden cancelar créditos activos.');
        }

        $strategy = $this->resolveStrategy($credit->type);

        DB::transaction(function () use ($credit, $user, $strategy) {
            $credit->load('items');
            $strategy->handleCancellation($credit, $user);
        });
    }

    /**
     * Validate that there is enough stock for the requested items.
     */
    private function validateStock(array $items, bool $checkReserved): void
    {
        foreach ($items as $item) {
            $product = Product::find($item['product_id']);
            if (! $product || $product->isService()) {
                continue;
            }

            $available = $checkReserved ? $product->availableStock() : $product->stock;

            if ($available < $item['quantity']) {
                throw new \RuntimeException(
                    "Stock insuficiente para {$product->name}. Disponible: {$available}"
                );
            }
        }
    }
}
