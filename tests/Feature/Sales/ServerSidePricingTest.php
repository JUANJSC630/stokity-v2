<?php

use App\Authorization\DefaultRoleProvisioner;
use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\Client;
use App\Models\CreditSale;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use Database\Seeders\PermissionSeeder;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed(PermissionSeeder::class);
    $this->tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme', 'status' => 'active']);
    app(DefaultRoleProvisioner::class)->seedFor($this->tenant);

    app(TenantManager::class)->runAs($this->tenant, function () {
        $this->branch = Branch::factory()->create();
        $this->client = Client::factory()->create();
        BusinessSetting::factory()->create(['require_cash_session' => false]);
        PaymentMethod::factory()->create(['code' => 'efectivo', 'name' => 'Efectivo', 'is_active' => true]);
        $category = Category::factory()->create();

        $this->product = Product::factory()->create([
            'branch_id' => $this->branch->id, 'category_id' => $category->id,
            'sale_price' => 50000, 'purchase_price' => 30000, 'stock' => 10, 'tax' => 0,
            'status' => true, 'type' => 'producto', 'variable_price' => false,
        ]);
        $this->service = Product::factory()->create([
            'branch_id' => $this->branch->id, 'category_id' => $category->id,
            'sale_price' => 0, 'purchase_price' => 0, 'stock' => 0, 'tax' => 0,
            'status' => true, 'type' => 'servicio', 'variable_price' => true,
        ]);
    });

    $this->admin = pricingUser($this->tenant, $this->branch, DefaultRoleProvisioner::ADMINISTRADOR);
    $this->seller = pricingUser($this->tenant, $this->branch, DefaultRoleProvisioner::VENDEDOR);
    $this->limited = pricingUser($this->tenant, $this->branch, null, ['pos.access', 'sales.create', 'sales.manage_pending', 'credits.view', 'credits.create', 'products.view', 'clients.view', 'payment_methods.view']);
});

afterEach(fn () => app(TenantManager::class)->forget());

function pricingUser(Tenant $tenant, Branch $branch, ?string $roleName, array $permissions = []): User
{
    return app(TenantManager::class)->runAs($tenant, function () use ($branch, $roleName, $permissions) {
        $user = User::create([
            'name' => 'U', 'email' => uniqid().'@acme.test', 'password' => bcrypt('x'),
            'role' => 'vendedor', 'branch_id' => $branch->id, 'status' => true, 'email_verified_at' => now(),
        ]);
        $role = $roleName
            ? Role::where('name', $roleName)->firstOrFail()
            : Role::create(['name' => 'Limited '.uniqid(), 'guard_name' => 'web'])->syncPermissions($permissions);
        $user->assignRole($role);

        return $user;
    });
}

function posSale(array $overrides = [], ?array $lines = null): array
{
    $lines ??= [['id' => test()->product->id, 'quantity' => 2, 'price' => 50000, 'subtotal' => 100000]];

    return array_merge([
        'source' => 'pos',
        'branch_id' => test()->branch->id,
        'client_id' => test()->client->id,
        'seller_id' => test()->seller->id,
        'net' => 100000, 'total' => 100000, 'amount_paid' => 100000, 'change_amount' => 0,
        'payment_method' => 'efectivo', 'status' => 'completed',
        'date' => now('America/Bogota')->format('Y-m-d\TH:i'),
        'discount_type' => 'none', 'discount_value' => 0,
        'products' => $lines,
    ], $overrides);
}

function salesCount(): int
{
    return app(TenantManager::class)->runAs(test()->tenant, fn () => Sale::count());
}

describe('sales.store prices come from the server', function () {
    it('accepts a sale at the catalog price', function () {
        $this->actingAs($this->seller)->post(route('sales.store'), posSale())->assertSessionHasNoErrors();

        expect(salesCount())->toBe(1);
    });

    it('rejects a price below the catalog and creates nothing', function () {
        $lines = [['id' => $this->product->id, 'quantity' => 2, 'price' => 1, 'subtotal' => 2]];

        $this->actingAs($this->seller)
            ->post(route('sales.store'), posSale(['net' => 2, 'total' => 2, 'amount_paid' => 2], $lines))
            ->assertSessionHasErrors('products.0.price');

        expect(salesCount())->toBe(0);
        expect($this->product->fresh()->stock)->toBe(10);
    });

    it('recomputes subtotal, net and total instead of trusting the request', function () {
        $lines = [['id' => $this->product->id, 'quantity' => 2, 'price' => 50000, 'subtotal' => 1]];

        $this->actingAs($this->seller)->post(route('sales.store'), posSale(['net' => 1, 'total' => 1], $lines));

        $sale = app(TenantManager::class)->runAs($this->tenant, fn () => Sale::with('saleProducts')->firstOrFail());
        expect((float) $sale->net)->toBe(100000.0);
        expect((float) $sale->total)->toBe(100000.0);
        expect((float) $sale->saleProducts->first()->subtotal)->toBe(100000.0);
    });
});

describe('variable price (pos.sell_variable_price)', function () {
    $serviceLine = fn () => [['id' => test()->service->id, 'quantity' => 1, 'price' => 12345, 'subtotal' => 12345]];

    it('lets a user with the permission set the price of a variable-price service', function () use ($serviceLine) {
        $this->actingAs($this->seller)
            ->post(route('sales.store'), posSale(['net' => 12345, 'total' => 12345, 'amount_paid' => 12345], $serviceLine()))
            ->assertSessionHasNoErrors();

        $sale = app(TenantManager::class)->runAs($this->tenant, fn () => Sale::firstOrFail());
        expect((float) $sale->total)->toBe(12345.0);
    });

    it('rejects it for a user without the permission', function () use ($serviceLine) {
        $this->actingAs($this->limited)
            ->post(route('sales.store'), posSale(['net' => 12345, 'total' => 12345, 'amount_paid' => 12345], $serviceLine()))
            ->assertSessionHasErrors('products.0.price');

        expect(salesCount())->toBe(0);
    });
});

describe('discounts (pos.apply_discount)', function () {
    it('rejects a discount for a user without the permission', function () {
        $this->actingAs($this->limited)
            ->post(route('sales.store'), posSale(['discount_type' => 'percentage', 'discount_value' => 50]))
            ->assertSessionHasErrors('discount_type');

        expect(salesCount())->toBe(0);
    });

    it('applies a discount for a user with the permission', function () {
        $this->actingAs($this->seller)
            ->post(route('sales.store'), posSale(['discount_type' => 'percentage', 'discount_value' => 10]))
            ->assertSessionHasNoErrors();

        $sale = app(TenantManager::class)->runAs($this->tenant, fn () => Sale::firstOrFail());
        expect((float) $sale->total)->toBe(90000.0);
    });

    it('rejects a percentage above 100', function () {
        $this->actingAs($this->seller)
            ->post(route('sales.store'), posSale(['discount_type' => 'percentage', 'discount_value' => 150]))
            ->assertSessionHasErrors('discount_value');

        expect(salesCount())->toBe(0);
    });
});

describe('sale date', function () {
    it('rejects a backdated date from a user who cannot edit sales', function () {
        $this->actingAs($this->seller)
            ->post(route('sales.store'), posSale(['date' => '2020-01-01T10:00']))
            ->assertSessionHasErrors('date');

        expect(salesCount())->toBe(0);
    });

    it('accepts any time of today from a user who cannot edit sales', function () {
        $this->actingAs($this->seller)
            ->post(route('sales.store'), posSale(['date' => now('America/Bogota')->subMinutes(20)->format('Y-m-d\TH:i')]))
            ->assertSessionHasNoErrors();

        expect(salesCount())->toBe(1);
    });

    it('keeps the date chosen by a user who can edit sales', function () {
        $this->actingAs($this->admin)
            ->post(route('sales.store'), posSale(['date' => '2020-01-01T10:00', 'seller_id' => $this->admin->id]))
            ->assertSessionHasNoErrors();

        $sale = app(TenantManager::class)->runAs($this->tenant, fn () => Sale::firstOrFail());
        expect($sale->date->format('Y-m-d'))->toBe('2020-01-01');
    });

    it('rejects a future date even for admins', function () {
        $this->actingAs($this->admin)
            ->post(route('sales.store'), posSale(['date' => now()->addDays(3)->format('Y-m-d\TH:i'), 'seller_id' => $this->admin->id]))
            ->assertSessionHasErrors('date');
    });
});

describe('pending sales (quotes)', function () {
    function makeQuote(array $lines): Sale
    {
        test()->actingAs(test()->seller)->post(route('sales.store'), posSale(['status' => 'pending'], $lines))->assertSessionHasNoErrors();

        return app(TenantManager::class)->runAs(test()->tenant, fn () => Sale::firstOrFail());
    }

    function completionPayload(array $lines): array
    {
        return [
            'payment_method' => 'efectivo', 'amount_paid' => 100000, 'change_amount' => 0,
            'net' => 100000, 'total' => 100000, 'products' => $lines,
        ];
    }

    it('rejects completing a quote with a manipulated price', function () {
        $quote = makeQuote([['id' => $this->product->id, 'quantity' => 2, 'price' => 50000, 'subtotal' => 100000]]);

        $this->actingAs($this->seller)
            ->post(route('sales.complete', $quote), completionPayload([['id' => $this->product->id, 'quantity' => 2, 'price' => 1, 'subtotal' => 2]]))
            ->assertSessionHasErrors('products.0.price');

        expect($quote->fresh()->status)->toBe('pending');
        expect($this->product->fresh()->stock)->toBe(10);
    });

    it('still completes a quote at the price it was saved with after the catalog changed', function () {
        $quote = makeQuote([['id' => $this->product->id, 'quantity' => 2, 'price' => 50000, 'subtotal' => 100000]]);
        Product::withoutGlobalScopes()->whereKey($this->product->id)->update(['sale_price' => 60000]);

        $this->actingAs($this->seller)
            ->post(route('sales.complete', $quote), completionPayload([['id' => $this->product->id, 'quantity' => 2, 'price' => 50000, 'subtotal' => 100000]]))
            ->assertSessionHasNoErrors();

        expect($quote->fresh()->status)->toBe('completed');
        expect((float) $quote->fresh()->total)->toBe(100000.0);
    });

    it('recomputes the total when a quote is edited', function () {
        $quote = makeQuote([['id' => $this->product->id, 'quantity' => 2, 'price' => 50000, 'subtotal' => 100000]]);

        $this->actingAs($this->seller)
            ->patch(route('sales.pending.update', $quote), [
                'net' => 1, 'total' => 1, 'discount_type' => 'none', 'discount_value' => 0,
                'products' => [['id' => $this->product->id, 'quantity' => 3, 'price' => 50000, 'subtotal' => 1]],
            ])
            ->assertSessionHasNoErrors();

        expect((float) $quote->fresh()->net)->toBe(150000.0);
        expect((float) $quote->fresh()->total)->toBe(150000.0);
    });
});

describe('credits.store', function () {
    function creditItems(int $price, int $subtotal): array
    {
        return [['product_id' => test()->product->id, 'quantity' => 2, 'unit_price' => $price, 'subtotal' => $subtotal]];
    }

    function creditPayloadFor(array $items): array
    {
        return ['type' => 'layaway', 'client_id' => test()->client->id, 'branch_id' => test()->branch->id, 'items' => $items];
    }

    it('rejects a manipulated unit price', function () {
        $this->actingAs($this->seller)
            ->post(route('credits.store'), creditPayloadFor(creditItems(1, 2)))
            ->assertSessionHasErrors('items.0.unit_price');

        expect(app(TenantManager::class)->runAs($this->tenant, fn () => CreditSale::count()))->toBe(0);
    });

    it('computes the credit total from catalog prices', function () {
        $this->actingAs($this->seller)
            ->post(route('credits.store'), creditPayloadFor(creditItems(50000, 1)))
            ->assertSessionHasNoErrors();

        $credit = app(TenantManager::class)->runAs($this->tenant, fn () => CreditSale::firstOrFail());
        expect((float) $credit->total_amount)->toBe(100000.0);
    });
});
