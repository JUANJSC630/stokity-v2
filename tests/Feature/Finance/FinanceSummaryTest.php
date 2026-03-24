<?php

use App\Models\Branch;
use App\Models\Client;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleProduct;
use App\Models\User;

beforeEach(function () {
    $this->branch  = Branch::factory()->create(['status' => true]);
    $this->admin   = adminUser($this->branch);
    $this->seller  = User::factory()->create(['role' => 'vendedor', 'branch_id' => $this->branch->id]);
    $this->client  = Client::factory()->create();
    $this->category = ExpenseCategory::factory()->create();
});

describe('Finance Summary', function () {
    it('vendedor cannot access finances (redirected)', function () {
        $this->actingAs($this->seller)
            ->get(route('finances.summary'))
            ->assertRedirect(); // AdminOrManagerMiddleware redirects to dashboard
    });

    it('returns correct revenue and COGS for the period', function () {
        $product = Product::factory()->create([
            'branch_id'      => $this->branch->id,
            'purchase_price' => 10000,
            'sale_price'     => 20000,
            'stock'          => 100,
        ]);

        $sale = Sale::factory()->create([
            'branch_id' => $this->branch->id,
            'seller_id' => $this->seller->id,
            'client_id' => $this->client->id,
            'status'    => 'completed',
            'total'     => 40000,
            'date'      => now(),
        ]);

        SaleProduct::factory()->create([
            'sale_id'                  => $sale->id,
            'product_id'               => $product->id,
            'quantity'                 => 2,
            'price'                    => 20000,
            'purchase_price_snapshot'  => 10000,
            'subtotal'                 => 40000,
        ]);

        $response = $this->actingAs($this->admin)
            ->get(route('finances.summary', ['period' => 'this_month']))
            ->assertOk();

        $props = $response->original->getData()['page']['props'];

        expect((float) $props['revenue'])->toBe(40000.0);
        expect((float) $props['cogs'])->toBe(20000.0);    // 2 × 10000
        expect((float) $props['grossProfit'])->toBe(20000.0);
    });

    it('uses product purchase_price as COGS fallback when snapshot is null', function () {
        $product = Product::factory()->create([
            'branch_id'      => $this->branch->id,
            'purchase_price' => 8000,
            'sale_price'     => 16000,
            'stock'          => 100,
        ]);

        $sale = Sale::factory()->create([
            'branch_id' => $this->branch->id,
            'seller_id' => $this->seller->id,
            'client_id' => $this->client->id,
            'status'    => 'completed',
            'total'     => 16000,
            'date'      => now(),
        ]);

        SaleProduct::factory()->create([
            'sale_id'                 => $sale->id,
            'product_id'              => $product->id,
            'quantity'                => 1,
            'price'                   => 16000,
            'purchase_price_snapshot' => null, // pre-migration row
            'subtotal'                => 16000,
        ]);

        $props = $this->actingAs($this->admin)
            ->get(route('finances.summary', ['period' => 'this_month']))
            ->assertOk()
            ->original->getData()['page']['props'];

        expect((float) $props['cogs'])->toBe(8000.0);
        expect((bool) $props['hasCOGSWarning'])->toBeTrue();
    });

    it('net profit = gross profit minus expenses', function () {
        $product = Product::factory()->create([
            'branch_id'      => $this->branch->id,
            'purchase_price' => 5000,
            'sale_price'     => 15000,
            'stock'          => 100,
        ]);

        $sale = Sale::factory()->create([
            'branch_id' => $this->branch->id,
            'seller_id' => $this->seller->id,
            'client_id' => $this->client->id,
            'status'    => 'completed',
            'total'     => 15000,
            'date'      => now(),
        ]);

        SaleProduct::factory()->create([
            'sale_id'                 => $sale->id,
            'product_id'              => $product->id,
            'quantity'                => 1,
            'price'                   => 15000,
            'purchase_price_snapshot' => 5000,
            'subtotal'                => 15000,
        ]);

        Expense::factory()->create([
            'branch_id'           => $this->branch->id,
            'expense_category_id' => $this->category->id,
            'amount'              => 3000,
            'expense_date'        => now()->toDateString(),
        ]);

        $props = $this->actingAs($this->admin)
            ->get(route('finances.summary', ['period' => 'this_month']))
            ->assertOk()
            ->original->getData()['page']['props'];

        // grossProfit = 15000 - 5000 = 10000
        // netProfit   = 10000 - 3000 = 7000
        expect((float) $props['grossProfit'])->toBe(10000.0);
        expect((float) $props['totalExpenses'])->toBe(3000.0);
        expect((float) $props['netProfit'])->toBe(7000.0);
    });
});
