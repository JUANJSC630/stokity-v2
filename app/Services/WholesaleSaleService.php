<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\User;
use App\Models\WholesaleSale;
use Illuminate\Support\Facades\DB;

class WholesaleSaleService
{
    /**
     * Create a new wholesale order and its mirror Sale row, in one transaction.
     *
     * @param  array  $data  branch_id, client_id, payment_method, date, notes, estimated_cost
     * @param  array  $items  list of ['description', 'quantity', 'unit_price']
     */
    public function create(array $data, array $items, User $user): WholesaleSale
    {
        return DB::transaction(function () use ($data, $items, $user) {
            $total = $this->sumItems($items);
            $code = WholesaleSale::generateCode((int) $data['branch_id']);

            $wholesaleSale = WholesaleSale::create([
                'branch_id' => $data['branch_id'],
                'client_id' => $data['client_id'],
                'seller_id' => $user->id,
                'code' => $code,
                'total' => $total,
                'estimated_cost' => $data['estimated_cost'] ?? null,
                'payment_method' => $data['payment_method'],
                'date' => $data['date'],
                'status' => WholesaleSale::STATUS_COMPLETED,
                'notes' => $data['notes'] ?? null,
            ]);

            $this->syncItems($wholesaleSale, $items);

            $sale = $this->createMirrorSale($wholesaleSale, $data);
            $wholesaleSale->update(['sale_id' => $sale->id]);

            return $wholesaleSale->fresh(['items', 'client', 'seller', 'branch', 'sale']);
        });
    }

    /**
     * Update an existing (non-cancelled) wholesale order and keep its mirror Sale in sync.
     *
     * @param  array  $data  branch_id, client_id, payment_method, date, notes, estimated_cost
     * @param  array  $items  list of ['description', 'quantity', 'unit_price']
     */
    public function update(WholesaleSale $wholesaleSale, array $data, array $items): WholesaleSale
    {
        if ($wholesaleSale->status === WholesaleSale::STATUS_CANCELLED) {
            throw new \RuntimeException('No se puede editar un pedido mayorista cancelado.');
        }

        return DB::transaction(function () use ($wholesaleSale, $data, $items) {
            $total = $this->sumItems($items);

            $wholesaleSale->update([
                'branch_id' => $data['branch_id'],
                'client_id' => $data['client_id'],
                'total' => $total,
                'estimated_cost' => $data['estimated_cost'] ?? null,
                'payment_method' => $data['payment_method'],
                'date' => $data['date'],
                'notes' => $data['notes'] ?? null,
            ]);

            $wholesaleSale->items()->delete();
            $this->syncItems($wholesaleSale, $items);

            $wholesaleSale->sale?->update([
                'branch_id' => $data['branch_id'],
                'client_id' => $data['client_id'],
                'net' => $total,
                'total' => $total,
                'amount_paid' => $total,
                'payment_method' => $data['payment_method'],
                'date' => $data['date'],
            ]);

            return $wholesaleSale->fresh(['items', 'client', 'seller', 'branch', 'sale']);
        });
    }

    /**
     * Cancel a wholesale order: marks both the order and its mirror Sale as
     * cancelled so it stops counting in Dashboard/Finance/Report aggregates
     * (all of which filter status='completed'), without deleting anything.
     */
    public function cancel(WholesaleSale $wholesaleSale): void
    {
        DB::transaction(function () use ($wholesaleSale) {
            $wholesaleSale->update(['status' => WholesaleSale::STATUS_CANCELLED]);
            $wholesaleSale->sale?->update(['status' => 'cancelled']);
        });
    }

    /**
     * Archive (soft-delete) an already-cancelled order so it stops cluttering
     * the default list — the record and its mirror Sale are kept, just hidden,
     * and remain reachable from the "Pedidos eliminados" trash view.
     */
    public function delete(WholesaleSale $wholesaleSale): void
    {
        if ($wholesaleSale->status !== WholesaleSale::STATUS_CANCELLED) {
            throw new \RuntimeException('Solo se pueden eliminar pedidos ya cancelados.');
        }

        DB::transaction(function () use ($wholesaleSale) {
            $wholesaleSale->sale?->delete();
            $wholesaleSale->delete();
        });
    }

    private function sumItems(array $items): float
    {
        return round(collect($items)->sum(fn ($item) => $item['quantity'] * $item['unit_price']), 2);
    }

    private function syncItems(WholesaleSale $wholesaleSale, array $items): void
    {
        foreach ($items as $item) {
            $wholesaleSale->items()->create([
                'description' => $item['description'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'subtotal' => round($item['quantity'] * $item['unit_price'], 2),
            ]);
        }
    }

    private function createMirrorSale(WholesaleSale $wholesaleSale, array $data): Sale
    {
        return Sale::create([
            'branch_id' => $wholesaleSale->branch_id,
            'session_id' => null,
            'wholesale_sale_id' => $wholesaleSale->id,
            'code' => $wholesaleSale->code,
            'client_id' => $wholesaleSale->client_id,
            'seller_id' => $wholesaleSale->seller_id,
            'tax' => 0,
            'discount_type' => 'none',
            'discount_value' => 0,
            'discount_amount' => 0,
            'net' => $wholesaleSale->total,
            'total' => $wholesaleSale->total,
            'amount_paid' => $wholesaleSale->total,
            'change_amount' => 0,
            'payment_method' => $wholesaleSale->payment_method,
            'date' => $data['date'],
            'status' => 'completed',
            'notes' => "Venta mayorista #{$wholesaleSale->code}",
        ]);
    }
}
