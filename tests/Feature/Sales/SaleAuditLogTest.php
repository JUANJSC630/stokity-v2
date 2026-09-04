<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\Client;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleAuditLog;
use App\Models\SaleProduct;

/**
 * F5 of PLAN.md: editing or cancelling a sale leaves an auditable trail —
 * who changed what, from what value to what value, and when.
 */
beforeEach(function () {
    $this->branch = Branch::factory()->create();
    $this->category = Category::factory()->create();
    $this->client = Client::factory()->create();
    $this->admin = adminUser($this->branch);
    $this->seller = vendedorUser($this->branch);

    BusinessSetting::factory()->create();
    PaymentMethod::factory()->create(['code' => 'cash']);
    PaymentMethod::factory()->create(['code' => 'transfer']);

    $this->product = Product::factory()->create([
        'branch_id' => $this->branch->id,
        'category_id' => $this->category->id,
        'sale_price' => 10000,
        'stock' => 15,
        'tax' => 0,
    ]);

    $this->sale = Sale::factory()->create([
        'branch_id' => $this->branch->id,
        'client_id' => $this->client->id,
        'seller_id' => $this->seller->id,
        'status' => 'completed',
        'payment_method' => 'cash',
        'net' => 50000,
        'tax' => 0,
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

function updateSalePayload(Sale $sale, array $overrides = []): array
{
    return array_merge([
        'branch_id' => $sale->branch_id,
        'client_id' => $sale->client_id,
        'seller_id' => $sale->seller_id,
        'tax' => (float) $sale->tax,
        'net' => (float) $sale->net,
        'total' => (float) $sale->total,
        'payment_method' => $sale->payment_method,
        'date' => $sale->date->format('Y-m-d'),
        'status' => $sale->status,
    ], $overrides);
}

it('logs a field change when an admin edits the sale total', function () {
    $this->actingAs($this->admin)
        ->put(route('sales.update', $this->sale), updateSalePayload($this->sale, ['total' => 60000]))
        ->assertRedirect();

    $log = SaleAuditLog::where('sale_id', $this->sale->id)->sole();
    expect($log->action)->toBe('updated');
    expect($log->field_changed)->toBe('total');
    expect($log->old_value)->toBe('50000.00');
    expect($log->new_value)->toBe('60000.00');
    expect($log->user_id)->toBe($this->admin->id);
});

it('logs one row per changed field', function () {
    $this->actingAs($this->admin)
        ->put(route('sales.update', $this->sale), updateSalePayload($this->sale, [
            'total' => 60000, 'status' => 'pending', 'payment_method' => 'transfer',
        ]))
        ->assertRedirect();

    $fields = SaleAuditLog::where('sale_id', $this->sale->id)->pluck('field_changed')->sort()->values();
    expect($fields->all())->toBe(['payment_method', 'status', 'total']);
});

it('does not log a field that was submitted unchanged', function () {
    $this->actingAs($this->admin)
        ->put(route('sales.update', $this->sale), updateSalePayload($this->sale))
        ->assertRedirect();

    expect(SaleAuditLog::where('sale_id', $this->sale->id)->count())->toBe(0);
});

it('logs a cancellation when a sale is deleted', function () {
    $this->actingAs($this->admin)
        ->delete(route('sales.destroy', $this->sale))
        ->assertRedirect();

    $log = SaleAuditLog::where('sale_id', $this->sale->id)->sole();
    expect($log->action)->toBe('cancelled');
    expect($log->field_changed)->toBeNull();
    expect($log->user_id)->toBe($this->admin->id);
});

it('does not expose audit logs to a vendedor viewing the sale', function () {
    $this->actingAs($this->admin)
        ->put(route('sales.update', $this->sale), updateSalePayload($this->sale, ['total' => 60000]));

    $response = $this->actingAs($this->seller)->get(route('sales.show', $this->sale));

    $response->assertOk();
    expect($response->viewData('page')['props']['auditLogs'])->toBe([]);
});

it('refuses to hard-delete a pending sale that already has audit history', function () {
    // Only reachable via completed -> edited (logged) -> reverted to pending.
    $this->actingAs($this->admin)
        ->put(route('sales.update', $this->sale), updateSalePayload($this->sale, ['status' => 'pending']));

    expect(SaleAuditLog::where('sale_id', $this->sale->id)->count())->toBe(1);

    $this->actingAs($this->admin)
        ->delete(route('sales.pending.destroy', $this->sale))
        ->assertStatus(422);

    expect(Sale::withTrashed()->find($this->sale->id))->not->toBeNull();
    expect(SaleAuditLog::where('sale_id', $this->sale->id)->count())->toBe(1);
});

it('exposes audit logs to an admin viewing the sale', function () {
    $this->actingAs($this->admin)
        ->put(route('sales.update', $this->sale), updateSalePayload($this->sale, ['total' => 60000]));

    $response = $this->actingAs($this->admin)->get(route('sales.show', $this->sale));

    $response->assertOk();
    expect($response->viewData('page')['props']['auditLogs'])->toHaveCount(1);
});

it('exposes the cancellation record when viewing a deleted sale', function () {
    $this->actingAs($this->admin)->delete(route('sales.destroy', $this->sale));

    $response = $this->actingAs($this->admin)->get(route('sales.deleted.show', $this->sale->id));

    $response->assertOk();
    $auditLogs = $response->viewData('page')['props']['auditLogs'];
    expect($auditLogs)->toHaveCount(1);
    expect($auditLogs[0]['action'])->toBe('cancelled');
});
