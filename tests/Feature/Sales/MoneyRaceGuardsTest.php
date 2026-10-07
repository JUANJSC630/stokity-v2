<?php

use App\Http\Controllers\ProductController;
use App\Http\Controllers\SaleController;
use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\Client;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use Illuminate\Http\Request;

function callController(object $user, string $uri, array $data, callable $action): mixed
{
    $request = Request::create($uri, 'POST', $data);
    $request->setLaravelSession(app('session')->driver());
    $request->setUserResolver(fn () => $user);
    app()->instance('request', $request);
    test()->actingAs($user);

    return $action($request);
}

beforeEach(function () {
    $this->branch = Branch::factory()->create();
    $this->admin = adminUser($this->branch);

    BusinessSetting::factory()->create(['require_cash_session' => false]);
    PaymentMethod::factory()->create(['code' => 'efectivo', 'name' => 'Efectivo', 'is_active' => true]);

    $this->product = Product::factory()->create([
        'branch_id' => $this->branch->id,
        'category_id' => Category::factory()->create()->id,
        'sale_price' => 50000,
        'purchase_price' => 30000,
        'stock' => 10,
        'reserved_stock' => 0,
        'tax' => 0,
        'status' => true,
        'type' => 'producto',
    ]);
});

describe('completePending race guard', function () {
    beforeEach(function () {
        $this->pending = Sale::factory()->create([
            'branch_id' => $this->branch->id,
            'client_id' => Client::factory()->create()->id,
            'seller_id' => $this->admin->id,
            'status' => 'pending',
            'net' => 100000,
            'tax' => 0,
            'total' => 100000,
        ]);

        $this->completePayload = [
            'payment_method' => 'efectivo',
            'amount_paid' => 100000,
            'change_amount' => 0,
            'net' => 100000,
            'total' => 100000,
            'products' => [[
                'id' => $this->product->id,
                'quantity' => 2,
                'price' => 50000,
                'subtotal' => 100000,
            ]],
        ];
    });

    it('completes a pending sale once and deducts stock once', function () {
        $this->actingAs($this->admin)
            ->post(route('sales.complete', $this->pending), $this->completePayload)
            ->assertRedirect();

        expect($this->pending->fresh()->status)->toBe('completed');
        expect($this->product->fresh()->stock)->toBe(8);
    });

    it('does not deduct stock twice when a stale pending model is completed again', function () {
        $staleCopy = Sale::find($this->pending->id);

        $this->actingAs($this->admin)
            ->post(route('sales.complete', $this->pending), $this->completePayload);

        callController(
            $this->admin,
            route('sales.complete', $staleCopy),
            $this->completePayload,
            fn (Request $request) => app(SaleController::class)->completePending($request, $staleCopy),
        );

        expect($this->product->fresh()->stock)->toBe(8);
        expect(StockMovement::where('type', 'out')->count())->toBe(1);
        expect($this->pending->fresh()->status)->toBe('completed');
    });
});

describe('updateStock race guard', function () {
    it('adds on top of the stock committed by a concurrent sale', function () {
        $staleCopy = Product::find($this->product->id);

        Product::whereKey($this->product->id)->update(['stock' => 7]);

        callController(
            $this->admin,
            route('products.update-stock', $staleCopy),
            ['stock' => 5, 'operation' => 'add'],
            fn (Request $request) => app(ProductController::class)->updateStock($request, $staleCopy),
        );

        expect($this->product->fresh()->stock)->toBe(12);

        $movement = StockMovement::where('product_id', $this->product->id)->latest('id')->first();
        expect($movement->previous_stock)->toBe(7);
        expect($movement->new_stock)->toBe(12);
    });

    it('subtracts from the stock committed by a concurrent sale', function () {
        $staleCopy = Product::find($this->product->id);

        Product::whereKey($this->product->id)->update(['stock' => 4]);

        callController(
            $this->admin,
            route('products.update-stock', $staleCopy),
            ['stock' => 3, 'operation' => 'subtract'],
            fn (Request $request) => app(ProductController::class)->updateStock($request, $staleCopy),
        );

        expect($this->product->fresh()->stock)->toBe(1);
    });

    it('still sets an absolute stock value', function () {
        $this->actingAs($this->admin)
            ->post(route('products.update-stock', $this->product), ['stock' => 3, 'operation' => 'set'])
            ->assertRedirect();

        expect($this->product->fresh()->stock)->toBe(3);
    });
});
