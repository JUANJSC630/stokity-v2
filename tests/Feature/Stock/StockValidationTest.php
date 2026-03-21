<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\Client;
use App\Models\PaymentMethod;
use App\Models\Product;

beforeEach(function () {
    $this->branch   = Branch::factory()->create();
    $this->category = Category::factory()->create();
    $this->client   = Client::factory()->create();
    $this->seller   = vendedorUser($this->branch);

    BusinessSetting::factory()->create(['require_cash_session' => false]);
    PaymentMethod::factory()->create(['code' => 'cash']);
});

function stockSalePayload(array $products): array
{
    return [
        'branch_id'      => test()->branch->id,
        'client_id'      => test()->client->id,
        'seller_id'      => test()->seller->id,
        'net'            => collect($products)->sum('subtotal'),
        'total'          => collect($products)->sum('subtotal'),
        'amount_paid'    => collect($products)->sum('subtotal'),
        'change_amount'  => 0,
        'payment_method' => 'cash',
        'date'           => now()->format('Y-m-d H:i'),
        'status'         => 'completed',
        'discount_type'  => 'none',
        'discount_value' => 0,
        'products'       => $products,
    ];
}

describe('Stock Validation', function () {
    it('allows sale when stock equals requested quantity', function () {
        $product = Product::factory()->create([
            'branch_id'   => $this->branch->id,
            'category_id' => $this->category->id,
            'stock'       => 5,
            'sale_price'  => 10000,
            'tax'         => 0,
        ]);

        $response = $this->actingAs($this->seller)
            ->post(route('sales.store'), stockSalePayload([
                ['id' => $product->id, 'quantity' => 5, 'price' => 10000, 'subtotal' => 50000],
            ]));

        $response->assertRedirect(route('sales.index'));
        expect($product->fresh()->stock)->toBe(0);
    });

    it('rejects sale when stock is insufficient', function () {
        $product = Product::factory()->create([
            'branch_id'   => $this->branch->id,
            'category_id' => $this->category->id,
            'stock'       => 4,
            'sale_price'  => 10000,
            'tax'         => 0,
        ]);

        $response = $this->actingAs($this->seller)
            ->post(route('sales.store'), stockSalePayload([
                ['id' => $product->id, 'quantity' => 5, 'price' => 10000, 'subtotal' => 50000],
            ]));

        $response->assertSessionHasErrors();
        expect($product->fresh()->stock)->toBe(4);
    });

    it('rolls back all items when one fails stock check', function () {
        $productA = Product::factory()->create([
            'branch_id'   => $this->branch->id,
            'category_id' => $this->category->id,
            'stock'       => 10,
            'sale_price'  => 10000,
            'tax'         => 0,
        ]);
        $productB = Product::factory()->create([
            'branch_id'   => $this->branch->id,
            'category_id' => $this->category->id,
            'stock'       => 1,
            'sale_price'  => 5000,
            'tax'         => 0,
        ]);

        $response = $this->actingAs($this->seller)
            ->post(route('sales.store'), stockSalePayload([
                ['id' => $productA->id, 'quantity' => 3, 'price' => 10000, 'subtotal' => 30000],
                ['id' => $productB->id, 'quantity' => 5, 'price' => 5000, 'subtotal' => 25000],
            ]));

        $response->assertSessionHasErrors();
        // Stock of product A must NOT have changed (pre-check rejects before transaction)
        expect($productA->fresh()->stock)->toBe(10);
        expect($productB->fresh()->stock)->toBe(1);
    });
});
