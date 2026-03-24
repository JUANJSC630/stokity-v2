<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Client;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\StockMovement;

beforeEach(function () {
    $this->branch = Branch::factory()->create(['status' => true]);
    $this->seller = vendedorUser($this->branch);
    $this->admin = adminUser($this->branch);
    $this->client = Client::factory()->create();

    BusinessSetting::factory()->create(['require_cash_session' => false]);
    PaymentMethod::factory()->create(['code' => 'cash', 'is_active' => true]);
});

describe('Service type products', function () {
    it('can create a service without stock fields', function () {
        $this->actingAs($this->admin)
            ->post('/products', [
                'name' => 'Restauración pulsera',
                'code' => 'SVC-001',
                'type' => 'servicio',
                'variable_price' => true,
                'sale_price' => 30000,
                'purchase_price' => 0,
                'tax' => 0,
                'category_id' => \App\Models\Category::factory()->create()->id,
                'branch_id' => $this->branch->id,
                'status' => true,
            ])
            ->assertRedirect();

        $product = Product::where('code', 'SVC-001')->first();
        expect($product)->not->toBeNull();
        expect($product->type)->toBe('servicio');
        expect($product->variable_price)->toBeTrue();
    });

    it('selling a service does not deduct stock', function () {
        $service = Product::factory()->create([
            'branch_id' => $this->branch->id,
            'type' => 'servicio',
            'variable_price' => false,
            'sale_price' => 25000,
            'purchase_price' => 0,
            'stock' => 0, // services have no stock
            'status' => true,
            'tax' => 0,
        ]);

        $this->actingAs($this->seller)
            ->post(route('sales.store'), [
                'branch_id' => $this->branch->id,
                'client_id' => $this->client->id,
                'seller_id' => $this->seller->id,
                'payment_method' => 'cash',
                'amount_paid' => 25000,
                'change_amount' => 0,
                'net' => 25000,
                'total' => 25000,
                'discount_type' => 'none',
                'discount_value' => 0,
                'status' => 'completed',
                'date' => now()->format('Y-m-d H:i'),
                'products' => [
                    ['id' => $service->id, 'quantity' => 1, 'price' => 25000, 'subtotal' => 25000],
                ],
            ])
            ->assertRedirect();

        // Stock unchanged
        expect($service->fresh()->stock)->toBe(0);

        // No stock movement created
        expect(StockMovement::where('product_id', $service->id)->count())->toBe(0);
    });

    it('selling a service with zero stock does not fail validation', function () {
        $service = Product::factory()->create([
            'branch_id' => $this->branch->id,
            'type' => 'servicio',
            'sale_price' => 50000,
            'stock' => 0,
            'status' => true,
            'tax' => 0,
        ]);

        $response = $this->actingAs($this->seller)
            ->post(route('sales.store'), [
                'branch_id' => $this->branch->id,
                'client_id' => $this->client->id,
                'seller_id' => $this->seller->id,
                'payment_method' => 'cash',
                'amount_paid' => 50000,
                'change_amount' => 0,
                'net' => 50000,
                'total' => 50000,
                'discount_type' => 'none',
                'discount_value' => 0,
                'status' => 'completed',
                'date' => now()->format('Y-m-d H:i'),
                'products' => [
                    ['id' => $service->id, 'quantity' => 1, 'price' => 50000, 'subtotal' => 50000],
                ],
            ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();
    });
});
