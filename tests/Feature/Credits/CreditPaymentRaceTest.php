<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\Client;
use App\Models\CreditPayment;
use App\Models\CreditSale;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Sale;
use App\Services\Credit\CreditPaymentService;

beforeEach(function () {
    $this->branch = Branch::factory()->create();
    $this->seller = vendedorUser($this->branch);

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

    $this->actingAs($this->seller)->post(route('credits.store'), [
        'type' => 'layaway',
        'client_id' => Client::factory()->create()->id,
        'branch_id' => $this->branch->id,
        'items' => [[
            'product_id' => $this->product->id,
            'quantity' => 2,
            'unit_price' => 50000,
            'subtotal' => 100000,
        ]],
    ]);

    $this->credit = CreditSale::firstOrFail();
});

describe('Credit payment race guards', function () {
    it('rejects a second full payment made with a stale credit model', function () {
        $staleCopy = CreditSale::find($this->credit->id);
        $service = app(CreditPaymentService::class);

        $service->register($this->credit, 100000, 'efectivo', $this->seller);

        expect(fn () => $service->register($staleCopy, 100000, 'efectivo', $this->seller))
            ->toThrow(RuntimeException::class);

        expect(CreditPayment::count())->toBe(1);
        expect(Sale::count())->toBe(1);
        expect($this->product->fresh()->stock)->toBe(8);
        expect($this->credit->fresh()->status)->toBe(CreditSale::STATUS_COMPLETED);
    });

    it('applies two partial payments on top of each other instead of losing one', function () {
        $staleCopy = CreditSale::find($this->credit->id);
        $service = app(CreditPaymentService::class);

        $service->register($this->credit, 30000, 'efectivo', $this->seller);
        $service->register($staleCopy, 30000, 'efectivo', $this->seller);

        $fresh = $this->credit->fresh();
        expect((float) $fresh->amount_paid)->toBe(60000.0);
        expect((float) $fresh->balance)->toBe(40000.0);
        expect(CreditPayment::count())->toBe(2);
    });

    it('rejects a payment that exceeds the balance left by a concurrent payment', function () {
        $staleCopy = CreditSale::find($this->credit->id);
        $service = app(CreditPaymentService::class);

        $service->register($this->credit, 70000, 'efectivo', $this->seller);

        expect(fn () => $service->register($staleCopy, 50000, 'efectivo', $this->seller))
            ->toThrow(RuntimeException::class);

        expect((float) $this->credit->fresh()->balance)->toBe(30000.0);
        expect(CreditPayment::count())->toBe(1);
    });

    it('keeps the caller instance in sync after registering a payment', function () {
        app(CreditPaymentService::class)->register($this->credit, 30000, 'efectivo', $this->seller);

        expect((float) $this->credit->balance)->toBe(70000.0);
        expect((float) $this->credit->amount_paid)->toBe(30000.0);
    });
});
