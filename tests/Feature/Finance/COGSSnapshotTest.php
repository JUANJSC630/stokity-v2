<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Client;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\SaleProduct;
use App\Models\User;

beforeEach(function () {
    $this->branch = Branch::factory()->create(['status' => true]);
    $this->seller = vendedorUser($this->branch);
    $this->client = Client::factory()->create();

    BusinessSetting::factory()->create(['require_cash_session' => false]);
    PaymentMethod::factory()->create(['code' => 'cash', 'is_active' => true]);
});

function cogsSalePayload(int $productId, float $price): array
{
    return [
        'branch_id'      => test()->branch->id,
        'client_id'      => test()->client->id,
        'seller_id'      => test()->seller->id,
        'payment_method' => 'cash',
        'amount_paid'    => $price,
        'change_amount'  => 0,
        'net'            => $price,
        'total'          => $price,
        'discount_type'  => 'none',
        'discount_value' => 0,
        'status'         => 'completed',
        'date'           => now()->format('Y-m-d H:i'),
        'products'       => [
            ['id' => $productId, 'quantity' => 1, 'price' => $price, 'subtotal' => $price],
        ],
    ];
}

describe('COGS Snapshot in SaleController', function () {
    it('saves purchase_price_snapshot when creating a sale', function () {
        $product = Product::factory()->create([
            'branch_id'      => $this->branch->id,
            'purchase_price' => 12000,
            'sale_price'     => 25000,
            'stock'          => 50,
            'status'         => true,
            'tax'            => 0,
        ]);

        $this->actingAs($this->seller)
            ->post(route('sales.store'), cogsSalePayload($product->id, 25000))
            ->assertRedirect();

        $sp = SaleProduct::where('product_id', $product->id)->latest()->first();

        expect($sp)->not->toBeNull();
        expect((float) $sp->purchase_price_snapshot)->toBe(12000.0);
    });

    it('snapshot is not affected by later price changes', function () {
        $product = Product::factory()->create([
            'branch_id'      => $this->branch->id,
            'purchase_price' => 5000,
            'sale_price'     => 10000,
            'stock'          => 50,
            'status'         => true,
            'tax'            => 0,
        ]);

        $this->actingAs($this->seller)
            ->post(route('sales.store'), cogsSalePayload($product->id, 10000));

        // Simulate purchase price change after the sale
        $product->update(['purchase_price' => 9000]);

        $sp = SaleProduct::where('product_id', $product->id)->latest()->first();

        // Snapshot must still reflect the price at time of sale, not the updated price
        expect($sp)->not->toBeNull();
        expect((float) $sp->purchase_price_snapshot)->toBe(5000.0);
    });
});
