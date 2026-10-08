<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\Client;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleProduct;
use App\Services\ReportQueryService;
use Illuminate\Support\Facades\Cache;
use Inertia\Testing\AssertableInertia;

/**
 * A deleted (soft-deleted) sale must not count anywhere. Most queries already
 * filtered it out; the dashboard branch/day figures and the top-products and
 * sales-by-category reports did not, so screens disagreed with each other.
 */
beforeEach(function () {
    Cache::flush();
    BusinessSetting::factory()->create();

    $this->branch = Branch::factory()->create();
    $this->admin = adminUser($this->branch);
    $category = Category::factory()->create();
    $this->product = Product::factory()->create(['branch_id' => $this->branch->id, 'category_id' => $category->id]);
    $client = Client::factory()->create();

    $makeSale = fn (float $total) => tap(Sale::factory()->create([
        'branch_id' => $this->branch->id, 'seller_id' => $this->admin->id, 'client_id' => $client->id,
        'status' => 'completed', 'total' => $total, 'date' => now(),
    ]), fn (Sale $sale) => SaleProduct::factory()->create([
        'sale_id' => $sale->id, 'product_id' => $this->product->id, 'quantity' => 2, 'price' => $total / 2, 'subtotal' => $total,
    ]));

    $this->kept = $makeSale(100);
    $this->deleted = $makeSale(200);
    $this->deleted->delete();

    $this->filters = [
        'date_from' => null, 'date_to' => null, 'branch_id' => null, 'seller_id' => null,
        'category_id' => null, 'status' => 'completed', 'tenant_id' => null,
    ];
});

describe('dashboard', function () {
    it('leaves a deleted sale out of the branch totals', function () {
        $this->actingAs($this->admin)->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('salesByBranch.0.total_sales', 1)
                ->where('salesByBranch.0.total_amount', fn ($amount) => (float) $amount === 100.0));
    });

    it('leaves a deleted sale out of the last-7-days chart', function () {
        $this->actingAs($this->admin)->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('dailySales.6.total_sales', 1)
                ->where('dailySales.6.total_amount', 100));
    });
});

describe('reports', function () {
    it('leaves a deleted sale out of the top products', function () {
        $top = app(ReportQueryService::class)->getTopProducts($this->filters);

        expect((int) $top->first()->total_quantity)->toBe(2);
    });

    it('leaves a deleted sale out of the sales by category', function () {
        $categories = app(ReportQueryService::class)->getProductsByCategory($this->filters);

        expect((float) collect($categories)->sum('total_amount'))->toBe(100.0);
    });
});
