<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\Client;
use App\Models\CreditSale;
use App\Models\PaymentMethod;
use App\Models\Product;

beforeEach(function () {
    $this->branch = Branch::factory()->create();
    $this->category = Category::factory()->create();
    $this->client = Client::factory()->create();
    $this->seller = vendedorUser($this->branch);

    BusinessSetting::factory()->create(['require_cash_session' => false]);
    PaymentMethod::factory()->create(['code' => 'efectivo', 'name' => 'Efectivo', 'is_active' => true]);

    $this->product = Product::factory()->create([
        'branch_id' => $this->branch->id,
        'category_id' => $this->category->id,
        'sale_price' => 100000,
        'purchase_price' => 50000,
        'stock' => 10,
        'reserved_stock' => 0,
        'tax' => 0,
        'status' => true,
        'type' => 'producto',
    ]);
});

function storeInstallmentsCredit(int $count, ?float $initialPayment = null, int $quantity = 3): CreditSale
{
    $payload = [
        'type' => 'installments',
        'client_id' => test()->client->id,
        'branch_id' => test()->branch->id,
        'installments_count' => $count,
        'due_date' => now()->addMonths($count)->format('Y-m-d'),
        'items' => [
            ['product_id' => test()->product->id, 'quantity' => $quantity, 'unit_price' => 100000, 'subtotal' => 100000 * $quantity],
        ],
    ];

    if ($initialPayment !== null) {
        $payload['initial_payment'] = $initialPayment;
        $payload['initial_payment_method'] = 'efectivo';
    }

    test()->actingAs(test()->seller)->post(route('credits.store'), $payload);

    return CreditSale::first();
}

it('splits the whole total in installments when there is no down payment', function () {
    $credit = storeInstallmentsCredit(3);

    expect((float) $credit->total_amount)->toBe(300000.0)
        ->and((float) $credit->installment_amount)->toBe(100000.0);
});

it('splits only what is still owed after the down payment', function () {
    $credit = storeInstallmentsCredit(3, 60000);

    expect((float) $credit->total_amount)->toBe(300000.0)
        ->and((float) $credit->amount_paid)->toBe(60000.0)
        ->and((float) $credit->balance)->toBe(240000.0)
        ->and((float) $credit->installment_amount)->toBe(80000.0);
});

it('keeps the installments adding up to the balance', function () {
    $credit = storeInstallmentsCredit(4, 50000);

    expect((float) $credit->installment_amount * (int) $credit->installments_count)->toBe((float) $credit->balance);
});

it('does not change a credit that has no installments', function () {
    test()->actingAs($this->seller)->post(route('credits.store'), [
        'type' => 'due_date',
        'client_id' => $this->client->id,
        'branch_id' => $this->branch->id,
        'due_date' => now()->addMonth()->format('Y-m-d'),
        'initial_payment' => 10000,
        'initial_payment_method' => 'efectivo',
        'items' => [['product_id' => $this->product->id, 'quantity' => 1, 'unit_price' => 100000, 'subtotal' => 100000]],
    ]);

    expect(CreditSale::first()->installment_amount)->toBeNull();
});
