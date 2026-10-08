<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\CashSession;
use App\Models\Category;
use App\Models\Client;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;

/**
 * Isolation was only tested for products. For every module with a detail/edit
 * screen, a user of tenant A asks for a record that belongs to tenant B: it must
 * never be served (404 from the scoped route binding, or 403).
 */
beforeEach(function () {
    $manager = app(TenantManager::class);
    $this->tenantA = Tenant::create(['name' => 'A', 'slug' => 'tenant-a', 'status' => 'active']);
    $this->tenantB = Tenant::create(['name' => 'B', 'slug' => 'tenant-b', 'status' => 'active']);

    $this->admin = $manager->runAs($this->tenantA, function () {
        BusinessSetting::factory()->create();

        return User::factory()->create(['role' => 'administrador', 'branch_id' => Branch::factory()->create()->id, 'status' => true]);
    });

    $this->foreign = $manager->runAs($this->tenantB, function () {
        BusinessSetting::factory()->create();
        $branch = Branch::factory()->create();
        $seller = User::factory()->create(['role' => 'administrador', 'branch_id' => $branch->id, 'status' => true]);
        $category = Category::factory()->create();
        $client = Client::factory()->create();
        $product = Product::factory()->create(['branch_id' => $branch->id, 'category_id' => $category->id]);

        return [
            'branch' => $branch,
            'seller' => $seller,
            'category' => $category,
            'client' => $client,
            'product' => $product,
            'payment_method' => PaymentMethod::factory()->create(),
            'supplier' => Supplier::factory()->create(),
            'sale' => Sale::factory()->create(['branch_id' => $branch->id, 'seller_id' => $seller->id, 'client_id' => $client->id, 'status' => 'completed']),
            'cash_session' => CashSession::factory()->create(['branch_id' => $branch->id, 'opened_by_user_id' => $seller->id, 'status' => 'open']),
            'stock_movement' => StockMovement::factory()->create(['product_id' => $product->id, 'branch_id' => $branch->id, 'user_id' => $seller->id]),
        ];
    });
});

afterEach(fn () => app(TenantManager::class)->forget());

dataset('detail routes', [
    'branch show' => ['branches.show', 'branch', 'branch'],
    'branch edit' => ['branches.edit', 'branch', 'branch'],
    'category show' => ['categories.show', 'category', 'category'],
    'category edit' => ['categories.edit', 'category', 'category'],
    'client show' => ['clients.show', 'client', 'client'],
    'client edit' => ['clients.edit', 'client', 'client'],
    'payment method edit' => ['payment-methods.edit', 'payment_method', 'payment_method'],
    'product show' => ['products.show', 'product', 'product'],
    'product edit' => ['products.edit', 'product', 'product'],
    'sale show' => ['sales.show', 'sale', 'sale'],
    'sale edit' => ['sales.edit', 'sale', 'sale'],
    'supplier show' => ['suppliers.show', 'supplier', 'supplier'],
    'supplier edit' => ['suppliers.edit', 'supplier', 'supplier'],
    'user show' => ['users.show', 'seller', 'user'],
    'user edit' => ['users.edit', 'seller', 'user'],
    'cash session show' => ['cash-sessions.show', 'cash_session', 'session'],
    'stock movement show' => ['stock-movements.show', 'stock_movement', 'stockMovement'],
]);

it('never serves a record of another tenant', function (string $route, string $key, string $parameter) {
    $status = $this->actingAs($this->admin)
        ->get(route($route, [$parameter => $this->foreign[$key]->getKey()]))
        ->status();

    expect($status)->toBeIn([403, 404]);
})->with('detail routes');

it('serves the same screens to the owner of the record', function () {
    $own = app(TenantManager::class)->runAs($this->tenantA, fn () => Product::factory()->create([
        'branch_id' => Branch::factory()->create()->id, 'category_id' => Category::factory()->create()->id,
    ]));

    $this->actingAs($this->admin)->get(route('products.show', $own))->assertOk();
});

it('does not blow up on the payment method detail URL, which has no screen', function () {
    $foreignId = $this->foreign['payment_method']->getKey();

    $status = $this->actingAs($this->admin)->get("/payment-methods/{$foreignId}")->status();

    expect($status)->toBeIn([404, 405]);
});
