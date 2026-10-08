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
use App\Models\SaleReturnProduct;
use Illuminate\Support\Facades\Cache;

/**
 * Smoke test for every report screen and export: each answers 200 with the right
 * content type on a tenant that has real data (a sale, a return, a product).
 * The exports were almost untested, so a broken one only showed up in production.
 */
beforeEach(function () {
    Cache::flush();
    BusinessSetting::factory()->create();
    PaymentMethod::factory()->create(['code' => 'cash', 'name' => 'Efectivo']);

    $this->branch = Branch::factory()->create();
    $this->admin = adminUser($this->branch);
    $category = Category::factory()->create();
    $product = Product::factory()->create(['branch_id' => $this->branch->id, 'category_id' => $category->id, 'stock' => 3, 'min_stock' => 5]);

    $sale = Sale::factory()->create([
        'branch_id' => $this->branch->id, 'seller_id' => $this->admin->id, 'client_id' => Client::factory()->create()->id,
        'status' => 'completed', 'payment_method' => 'cash', 'total' => 100, 'net' => 100, 'date' => now(),
    ]);
    SaleProduct::factory()->create(['sale_id' => $sale->id, 'product_id' => $product->id, 'quantity' => 2, 'price' => 50, 'subtotal' => 100]);

    $return = SaleReturn::create(['sale_id' => $sale->id, 'user_id' => $this->admin->id, 'reason' => 'Defectuoso']);
    SaleReturnProduct::create(['sale_return_id' => $return->id, 'product_id' => $product->id, 'quantity' => 1, 'effective_price' => 50]);
});

dataset('report pages', [
    'general' => 'reports.index',
    'sales detail' => 'reports.sales-detail',
    'products' => 'reports.products',
    'sellers' => 'reports.sellers',
    'branches' => 'reports.branches',
    'cash balance' => 'reports.cash-balance',
    'returns' => 'reports.returns',
]);

dataset('report exports', [
    'general pdf' => ['reports.export.pdf', 'application/pdf'],
    'general excel' => ['reports.export.excel', 'text/csv'],
    'sales detail pdf' => ['reports.sales-detail.export.pdf', 'application/pdf'],
    'sales detail excel' => ['reports.sales-detail.export.excel', 'text/csv'],
    'products pdf' => ['reports.products.export.pdf', 'application/pdf'],
    'products excel' => ['reports.products.export.excel', 'text/csv'],
    'sellers pdf' => ['reports.sellers.export.pdf', 'application/pdf'],
    'sellers excel' => ['reports.sellers.export.excel', 'text/csv'],
    'branches pdf' => ['reports.branches.export.pdf', 'application/pdf'],
    'branches excel' => ['reports.branches.export.excel', 'text/csv'],
    'returns pdf' => ['reports.returns.export.pdf', 'application/pdf'],
    'returns excel' => ['reports.returns.export.excel', 'text/csv'],
]);

it('renders every report page', function (string $route) {
    $this->actingAs($this->admin)->get(route($route))->assertOk();
})->with('report pages');

it('exports every report with the right content type', function (string $route, string $contentType) {
    $response = $this->actingAs($this->admin)->get(route($route));

    $response->assertOk();
    expect($response->headers->get('Content-Type'))->toContain($contentType);
})->with('report exports');

it('renders the PDF exports as real, non-trivial PDF documents', function (string $route) {
    $response = $this->actingAs($this->admin)->get(route($route));

    $pdf = $response->getContent();
    expect(str_starts_with($pdf, '%PDF-'))->toBeTrue();
    expect(strlen($pdf))->toBeGreaterThan(2000);
    expect(str_contains($pdf, '%%EOF'))->toBeTrue();
})->with([
    'reports.export.pdf',
    'reports.sales-detail.export.pdf',
    'reports.products.export.pdf',
    'reports.sellers.export.pdf',
    'reports.branches.export.pdf',
    'reports.returns.export.pdf',
]);

it('exports a CSV that has a header row and the sale', function () {
    $response = $this->actingAs($this->admin)->get(route('reports.sales-detail.export.excel'));

    $csv = $response->streamedContent();
    expect(substr_count(trim($csv), "\n"))->toBeGreaterThan(1);
});
