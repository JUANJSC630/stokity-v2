<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\Client;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;

/**
 * @return array{tenant: Tenant, admin: User, branch: Branch, client: Client, product: Product}
 */
function tenantWithSaleData(string $slug): array
{
    $tenant = Tenant::create(['name' => $slug, 'slug' => $slug, 'status' => 'active']);

    return app(TenantManager::class)->runAs($tenant, function () use ($tenant) {
        $branch = Branch::factory()->create();
        BusinessSetting::factory()->create(['require_cash_session' => false]);
        PaymentMethod::factory()->create(['code' => 'efectivo', 'name' => 'Efectivo', 'is_active' => true]);

        return [
            'tenant' => $tenant,
            'branch' => $branch,
            'client' => Client::factory()->create(),
            'product' => Product::factory()->create([
                'branch_id' => $branch->id,
                'category_id' => Category::factory()->create()->id,
                'stock' => 10,
                'tax' => 0,
                'status' => true,
                'type' => 'producto',
            ]),
            'admin' => User::factory()->create(['role' => 'administrador', 'branch_id' => $branch->id, 'status' => true]),
        ];
    });
}

function salePayloadFor(array $world, array $overrides = []): array
{
    $price = (float) $world['product']->sale_price;

    return array_merge([
        'branch_id' => $world['branch']->id,
        'client_id' => $world['client']->id,
        'seller_id' => $world['admin']->id,
        'net' => $price,
        'total' => $price,
        'amount_paid' => $price,
        'change_amount' => 0,
        'payment_method' => 'efectivo',
        'date' => now()->toDateTimeString(),
        'status' => 'completed',
        'discount_type' => 'none',
        'discount_value' => 0,
        'products' => [['id' => $world['product']->id, 'quantity' => 1, 'price' => $price, 'subtotal' => $price]],
    ], $overrides);
}

beforeEach(function () {
    $this->a = tenantWithSaleData('tenant-a');
    $this->b = tenantWithSaleData('tenant-b');
});

afterEach(fn () => app(TenantManager::class)->forget());

describe('sales.store cannot reference rows of another tenant', function () {
    it('creates the sale when every reference is its own', function () {
        $this->actingAs($this->a['admin'])
            ->post(route('sales.store'), salePayloadFor($this->a))
            ->assertSessionHasNoErrors();

        expect(Sale::withoutGlobalScopes()->count())->toBe(1);
    });

    it('rejects a reference to a row of another tenant', function (string $field) {
        $foreign = ['seller_id' => $this->b['admin']->id, 'client_id' => $this->b['client']->id, 'branch_id' => $this->b['branch']->id];

        $this->actingAs($this->a['admin'])
            ->post(route('sales.store'), salePayloadFor($this->a, [$field => $foreign[$field]]))
            ->assertSessionHasErrors($field);

        expect(Sale::withoutGlobalScopes()->count())->toBe(0);
    })->with([
        'seller' => ['seller_id'],
        'client' => ['client_id'],
        'branch' => ['branch_id'],
    ]);

    it('rejects a product from another tenant', function () {
        $payload = salePayloadFor($this->a, [
            'products' => [['id' => $this->b['product']->id, 'quantity' => 1, 'price' => 100, 'subtotal' => 100]],
        ]);

        $this->actingAs($this->a['admin'])
            ->post(route('sales.store'), $payload)
            ->assertSessionHasErrors('products.0.id');
    });
});
