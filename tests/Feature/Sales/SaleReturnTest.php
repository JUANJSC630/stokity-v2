<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\Client;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleProduct;
use App\Models\SaleReturn;
use App\Models\StockMovement;

beforeEach(function () {
    $this->branch = Branch::factory()->create();
    $this->category = Category::factory()->create();
    $this->client = Client::factory()->create();
    $this->admin = adminUser($this->branch);
    $this->seller = vendedorUser($this->branch);

    BusinessSetting::factory()->create();
    PaymentMethod::factory()->create(['code' => 'cash']);

    $this->product = Product::factory()->create([
        'branch_id' => $this->branch->id,
        'category_id' => $this->category->id,
        'sale_price' => 10000,
        'stock' => 15,
        'tax' => 0,
    ]);

    // Create a completed sale with 5 units
    $this->sale = Sale::factory()->create([
        'branch_id' => $this->branch->id,
        'client_id' => $this->client->id,
        'seller_id' => $this->seller->id,
        'status' => 'completed',
        'payment_method' => 'cash',
        'net' => 50000,
        'total' => 50000,
        'amount_paid' => 50000,
        'change_amount' => 0,
        'date' => now(),
    ]);

    SaleProduct::create([
        'sale_id' => $this->sale->id,
        'product_id' => $this->product->id,
        'quantity' => 5,
        'price' => 10000,
        'subtotal' => 50000,
    ]);
});

describe('Sale Returns', function () {
    it('can return a partial quantity', function () {
        $response = $this->actingAs($this->admin)
            ->post(route('sales.returns.store', $this->sale), [
                'products' => [
                    ['product_id' => $this->product->id, 'quantity' => 2],
                ],
                'reason' => 'Producto defectuoso',
            ]);

        $response->assertRedirect();
        expect(SaleReturn::where('sale_id', $this->sale->id)->count())->toBe(1);
    });

    it('increases product stock on return', function () {
        $stockBefore = $this->product->stock;

        $this->actingAs($this->admin)
            ->post(route('sales.returns.store', $this->sale), [
                'products' => [
                    ['product_id' => $this->product->id, 'quantity' => 3],
                ],
                'reason' => 'Cambio de talla',
            ]);

        expect($this->product->fresh()->stock)->toBe($stockBefore + 3);
    });

    it('creates a StockMovement of type in for return', function () {
        $this->actingAs($this->admin)
            ->post(route('sales.returns.store', $this->sale), [
                'products' => [
                    ['product_id' => $this->product->id, 'quantity' => 1],
                ],
                'reason' => 'Error en pedido',
            ]);

        $movement = StockMovement::where('product_id', $this->product->id)
            ->where('type', 'in')
            ->latest()
            ->first();

        expect($movement)->not->toBeNull();
        expect($movement->quantity)->toBe(1);
    });

    it('cannot return more than purchased quantity', function () {
        $response = $this->actingAs($this->admin)
            ->post(route('sales.returns.store', $this->sale), [
                'products' => [
                    ['product_id' => $this->product->id, 'quantity' => 10],
                ],
                'reason' => 'Exceso',
            ]);

        // Controller throws RuntimeException caught as JSON 422
        $response->assertStatus(422);
    });

    it('return is linked to the correct sale', function () {
        $this->actingAs($this->admin)
            ->post(route('sales.returns.store', $this->sale), [
                'products' => [
                    ['product_id' => $this->product->id, 'quantity' => 1],
                ],
            ]);

        $return = SaleReturn::where('sale_id', $this->sale->id)->first();
        expect($return)->not->toBeNull();
        expect($return->sale_id)->toBe($this->sale->id);
    });

    it('cannot return from a pending sale', function () {
        $this->sale->update(['status' => 'pending']);

        $response = $this->actingAs($this->admin)
            ->post(route('sales.returns.store', $this->sale), [
                'products' => [
                    ['product_id' => $this->product->id, 'quantity' => 1],
                ],
            ]);

        $response->assertSessionHasErrors('sale');
    });
});
