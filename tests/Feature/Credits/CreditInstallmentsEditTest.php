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
    $this->manager = managerUser($this->branch);
    $this->admin = adminUser($this->branch);

    BusinessSetting::factory()->create(['require_cash_session' => false]);
    PaymentMethod::factory()->create(['code' => 'efectivo', 'name' => 'Efectivo', 'is_active' => true]);

    $this->product = Product::factory()->create([
        'branch_id' => $this->branch->id,
        'category_id' => $this->category->id,
        'sale_price' => 60000,
        'purchase_price' => 30000,
        'stock' => 10,
        'reserved_stock' => 0,
        'tax' => 0,
        'status' => true,
        'type' => 'producto',
    ]);
});

function createInstallmentsCredit(int $count = 2): CreditSale
{
    test()->actingAs(test()->seller)->post(route('credits.store'), [
        'type' => 'installments',
        'client_id' => test()->client->id,
        'branch_id' => test()->branch->id,
        'installments_count' => $count,
        'due_date' => now()->addMonths($count)->format('Y-m-d'),
        'items' => [
            ['product_id' => test()->product->id, 'quantity' => 2, 'unit_price' => 60000, 'subtotal' => 120000],
        ],
    ]);

    return CreditSale::first();
}

it('lets an admin edit the installment count and due date before any payment', function () {
    $credit = createInstallmentsCredit(2);
    $newDueDate = now()->addMonths(4)->format('Y-m-d');

    $response = $this->actingAs($this->admin)->patch(route('credits.installments.update', $credit), [
        'installments_count' => 4,
        'due_date' => $newDueDate,
    ]);

    $response->assertSessionDoesntHaveErrors();
    $credit->refresh();
    expect((int) $credit->installments_count)->toBe(4);
    expect((float) $credit->installment_amount)->toBe(30000.0); // 120000 / 4
    expect($credit->due_date->format('Y-m-d'))->toBe($newDueDate);
    // Untouched by the edit:
    expect((float) $credit->total_amount)->toBe(120000.0);
    expect((float) $credit->balance)->toBe(120000.0);
});

it('allows a single installment, matching the global cuotas fix', function () {
    $credit = createInstallmentsCredit(3);

    $this->actingAs($this->admin)->patch(route('credits.installments.update', $credit), [
        'installments_count' => 1,
        'due_date' => now()->addMonth()->format('Y-m-d'),
    ]);

    expect((int) $credit->fresh()->installments_count)->toBe(1);
});

it('refuses to edit once a payment has been registered', function () {
    $credit = createInstallmentsCredit(2);

    $this->actingAs($this->seller)->post(route('credits.payments.store', $credit), [
        'amount' => 10000,
        'payment_method' => 'efectivo',
    ]);

    $response = $this->actingAs($this->admin)->patch(route('credits.installments.update', $credit), [
        'installments_count' => 5,
        'due_date' => now()->addMonths(5)->format('Y-m-d'),
    ]);

    $response->assertSessionHasErrors('installments');
    expect((int) $credit->fresh()->installments_count)->toBe(2); // unchanged
});

it('refuses to edit a cancelled credit', function () {
    $credit = createInstallmentsCredit(2);
    $this->actingAs($this->admin)->post(route('credits.cancel', $credit));

    $response = $this->actingAs($this->admin)->patch(route('credits.installments.update', $credit), [
        'installments_count' => 3,
        'due_date' => now()->addMonths(3)->format('Y-m-d'),
    ]);

    $response->assertSessionHasErrors('installments');
});

it('refuses to edit a non-installments credit type', function () {
    $this->actingAs($this->seller)->post(route('credits.store'), [
        'type' => 'layaway',
        'client_id' => $this->client->id,
        'branch_id' => $this->branch->id,
        'items' => [
            ['product_id' => $this->product->id, 'quantity' => 1, 'unit_price' => 60000, 'subtotal' => 60000],
        ],
    ]);
    $credit = CreditSale::first();

    $response = $this->actingAs($this->admin)->patch(route('credits.installments.update', $credit), [
        'installments_count' => 3,
        'due_date' => now()->addMonths(3)->format('Y-m-d'),
    ]);

    $response->assertSessionHasErrors('installments');
});

it('forbids vendedor from editing the installment plan', function () {
    $credit = createInstallmentsCredit(2);

    $response = $this->actingAs($this->seller)->patch(route('credits.installments.update', $credit), [
        'installments_count' => 3,
        'due_date' => now()->addMonths(3)->format('Y-m-d'),
    ]);

    $response->assertForbidden();
});

it('allows encargado to edit the installment plan', function () {
    $credit = createInstallmentsCredit(2);

    $response = $this->actingAs($this->manager)->patch(route('credits.installments.update', $credit), [
        'installments_count' => 6,
        'due_date' => now()->addMonths(6)->format('Y-m-d'),
    ]);

    $response->assertSessionDoesntHaveErrors();
    expect((int) $credit->fresh()->installments_count)->toBe(6);
});

it('exposes canUpdateInstallments only when every guardrail is met', function () {
    $credit = createInstallmentsCredit(2);

    $response = $this->actingAs($this->admin)->get(route('credits.show', $credit));
    $response->assertInertia(fn ($page) => $page->where('canUpdateInstallments', true));

    $this->actingAs($this->seller)->post(route('credits.payments.store', $credit), [
        'amount' => 10000,
        'payment_method' => 'efectivo',
    ]);

    $response = $this->actingAs($this->admin)->get(route('credits.show', $credit));
    $response->assertInertia(fn ($page) => $page->where('canUpdateInstallments', false));
});
