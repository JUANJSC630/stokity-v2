<?php

use App\Authorization\DefaultRoleProvisioner;
use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Client;
use App\Models\PaymentMethod;
use App\Models\Sale;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WholesaleSale;
use App\Models\WholesaleSaleItem;
use App\Tenancy\TenantManager;

beforeEach(function () {
    $this->branch = Branch::factory()->create();
    $this->client = Client::factory()->create();
    $this->seller = vendedorUser($this->branch);
    $this->manager = managerUser($this->branch);
    $this->admin = adminUser($this->branch);

    BusinessSetting::factory()->create(['require_cash_session' => false]);
    PaymentMethod::factory()->create(['code' => 'efectivo', 'name' => 'Efectivo', 'is_active' => true]);
});

function wholesalePayload(array $overrides = []): array
{
    return array_merge([
        'branch_id' => test()->branch->id,
        'client_id' => test()->client->id,
        'payment_method' => 'efectivo',
        'date' => now()->format('Y-m-d'),
        'notes' => null,
        'estimated_cost' => null,
        'items' => [
            ['description' => '40 manillas negras, pepas custom color verde', 'quantity' => 40, 'unit_price' => 5000],
            ['description' => '10 llaveros custom', 'quantity' => 10, 'unit_price' => 3000],
        ],
    ], $overrides);
}

describe('Creating a wholesale order', function () {
    it('creates the order, its items, and a mirror Sale row without SaleProducts', function () {
        $this->actingAs($this->admin)->post(route('wholesale.store'), wholesalePayload());

        expect(WholesaleSale::count())->toBe(1);
        expect(WholesaleSaleItem::count())->toBe(2);
        expect(Sale::count())->toBe(1);
        expect(\App\Models\SaleProduct::count())->toBe(0);

        $order = WholesaleSale::first();
        $sale = Sale::first();

        expect((float) $order->total)->toBe(230000.0); // 40*5000 + 10*3000
        expect($sale->wholesale_sale_id)->toBe($order->id);
        expect($order->sale_id)->toBe($sale->id);
        expect((float) $sale->total)->toBe((float) $order->total);
        expect($sale->status)->toBe('completed');
        expect((float) $sale->tax)->toBe(0.0);
    });

    it('recalculates totals server-side, ignoring any manipulated subtotal', function () {
        $this->actingAs($this->admin)->post(route('wholesale.store'), wholesalePayload([
            'items' => [
                ['description' => 'Pedido custom', 'quantity' => 3, 'unit_price' => 1000, 'subtotal' => 999999],
            ],
        ]));

        expect((float) WholesaleSale::first()->total)->toBe(3000.0);
    });
});

describe('Authorization', function () {
    it('forbids vendedor from viewing or creating wholesale orders', function () {
        $this->actingAs($this->seller)->get(route('wholesale.index'))->assertForbidden();
        $this->actingAs($this->seller)->get(route('wholesale.create'))->assertForbidden();
        $this->actingAs($this->seller)->post(route('wholesale.store'), wholesalePayload())->assertForbidden();
    });

    it('forbids encargado from viewing or creating wholesale orders', function () {
        $this->actingAs($this->manager)->get(route('wholesale.index'))->assertForbidden();
        $this->actingAs($this->manager)->post(route('wholesale.store'), wholesalePayload())->assertForbidden();
    });

    it('allows admin full access', function () {
        $this->actingAs($this->admin)->get(route('wholesale.index'))->assertOk();
        $this->actingAs($this->admin)->post(route('wholesale.store'), wholesalePayload())->assertRedirect();
    });
});

describe('Exclusion from the normal Sales listing', function () {
    it('does not include the mirror row in GET /sales', function () {
        $this->actingAs($this->admin)->post(route('wholesale.store'), wholesalePayload());
        $order = WholesaleSale::first();

        $response = $this->actingAs($this->admin)->get(route('sales.index'));

        $response->assertInertia(fn ($page) => $page->where('sales.total', 0));
        expect(Sale::whereNull('wholesale_sale_id')->count())->toBe(0);
        expect($order->sale->code)->toBe($order->code);
    });

    it('redirects a direct visit to the mirror Sale to wholesale.show', function () {
        $this->actingAs($this->admin)->post(route('wholesale.store'), wholesalePayload());
        $order = WholesaleSale::first();

        $response = $this->actingAs($this->admin)->get(route('sales.show', $order->sale_id));

        $response->assertRedirect(route('wholesale.show', $order->id));
    });
});

describe('Editing', function () {
    it('recalculates the total and syncs the mirror sale', function () {
        $this->actingAs($this->admin)->post(route('wholesale.store'), wholesalePayload());
        $order = WholesaleSale::first();

        $this->actingAs($this->admin)->put(route('wholesale.update', $order), wholesalePayload([
            'items' => [
                ['description' => 'Corregido: 50 manillas negras', 'quantity' => 50, 'unit_price' => 5000],
            ],
        ]));

        $order->refresh();
        expect((float) $order->total)->toBe(250000.0);
        expect($order->items()->count())->toBe(1);
        expect((float) $order->sale->fresh()->total)->toBe(250000.0);
    });

    it('refuses to edit a cancelled order', function () {
        $this->actingAs($this->admin)->post(route('wholesale.store'), wholesalePayload());
        $order = WholesaleSale::first();

        $this->actingAs($this->admin)->post(route('wholesale.cancel', $order));

        $response = $this->actingAs($this->admin)->put(route('wholesale.update', $order), wholesalePayload());
        $response->assertSessionHasErrors('status');
    });
});

describe('Cancellation', function () {
    it('marks both the order and its mirror sale as cancelled, staying visible in the list', function () {
        $this->actingAs($this->admin)->post(route('wholesale.store'), wholesalePayload());
        $order = WholesaleSale::first();

        $this->actingAs($this->admin)->post(route('wholesale.cancel', $order));

        $order->refresh();
        expect($order->status)->toBe('cancelled');
        expect($order->sale->fresh()->status)->toBe('cancelled');
        expect($order->trashed())->toBeFalse();

        $response = $this->actingAs($this->admin)->get(route('wholesale.index'));
        $response->assertInertia(fn ($page) => $page->where('wholesaleSales.total', 1));
    });
});

describe('Archiving (delete)', function () {
    it('refuses to archive an order that is still active', function () {
        $this->actingAs($this->admin)->post(route('wholesale.store'), wholesalePayload());
        $order = WholesaleSale::first();

        $response = $this->actingAs($this->admin)->delete(route('wholesale.destroy', $order));

        $response->assertSessionHasErrors('status');
        expect($order->fresh()->trashed())->toBeFalse();
    });

    it('archives a cancelled order and its mirror sale, hiding it from the default list', function () {
        $this->actingAs($this->admin)->post(route('wholesale.store'), wholesalePayload());
        $order = WholesaleSale::first();

        $this->actingAs($this->admin)->post(route('wholesale.cancel', $order));
        $this->actingAs($this->admin)->delete(route('wholesale.destroy', $order));

        expect(WholesaleSale::count())->toBe(0); // hidden from default queries
        expect(WholesaleSale::withTrashed()->count())->toBe(1);
        expect($order->fresh()->trashed())->toBeTrue();
        expect(Sale::withTrashed()->find($order->sale_id)->trashed())->toBeTrue();

        $response = $this->actingAs($this->admin)->get(route('wholesale.index'));
        $response->assertInertia(fn ($page) => $page->where('wholesaleSales.total', 0));
    });

    it('lists and shows archived orders in the trash view', function () {
        $this->actingAs($this->admin)->post(route('wholesale.store'), wholesalePayload());
        $order = WholesaleSale::first();
        $this->actingAs($this->admin)->post(route('wholesale.cancel', $order));
        $this->actingAs($this->admin)->delete(route('wholesale.destroy', $order));

        $indexResponse = $this->actingAs($this->admin)->get(route('wholesale.deleted.index'));
        $indexResponse->assertOk();
        $indexResponse->assertInertia(fn ($page) => $page->where('wholesaleSales.data.0.code', $order->code));

        $showResponse = $this->actingAs($this->admin)->get(route('wholesale.deleted.show', $order->id));
        $showResponse->assertOk();

        // The active show route no longer resolves the archived model.
        $this->actingAs($this->admin)->get(route('wholesale.show', $order->id))->assertNotFound();
    });

    it('forbids vendedor and encargado from the trash listing', function () {
        $this->actingAs($this->seller)->get(route('wholesale.deleted.index'))->assertForbidden();
        $this->actingAs($this->manager)->get(route('wholesale.deleted.index'))->assertForbidden();
    });

    it('regression: creating a new order after archiving one does not collide on the reused sequence number', function () {
        // This reproduces the production 500: generateCode() used to count()
        // active rows only, so after archiving #1 the next create recomputed
        // "1" again and hit the (tenant_id, code) unique constraint.
        $this->actingAs($this->admin)->post(route('wholesale.store'), wholesalePayload());
        $first = WholesaleSale::first();
        $this->actingAs($this->admin)->post(route('wholesale.cancel', $first));
        $this->actingAs($this->admin)->delete(route('wholesale.destroy', $first));

        $response = $this->actingAs($this->admin)->post(route('wholesale.store'), wholesalePayload());

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();
        expect(WholesaleSale::withTrashed()->count())->toBe(2);
        $second = WholesaleSale::first(); // only non-trashed row
        expect($second->code)->not->toBe($first->code);
    });
});

describe('Finance/Dashboard aggregation', function () {
    it('counts the wholesale total in Finanzas revenue for the period', function () {
        $this->actingAs($this->admin)->post(route('wholesale.store'), wholesalePayload());
        $order = WholesaleSale::first();

        $response = $this->actingAs($this->admin)->get(route('finances.summary', ['branch' => $this->branch->id]));

        $response->assertInertia(fn ($page) => $page->where('revenue', (int) $order->total));

        $order->refresh();
        $this->actingAs($this->admin)->post(route('wholesale.cancel', $order));

        $response = $this->actingAs($this->admin)->get(route('finances.summary', ['branch' => $this->branch->id]));
        $response->assertInertia(fn ($page) => $page->where('revenue', 0));
    });
});

describe('Module toggle', function () {
    it('returns 404 for all wholesale routes when the module is disabled', function () {
        // Module toggles are tenant-scoped and cached per tenant (BusinessSetting::getSettings()),
        // so this needs a real Tenant + tenant-bound user rather than the plain adminUser() helper.
        $tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme-wholesale', 'status' => 'active']);
        app(DefaultRoleProvisioner::class)->seedFor($tenant);

        $tenantAdmin = app(TenantManager::class)->runAs($tenant, function () {
            $user = User::create([
                'name' => 'Admin', 'email' => 'admin@acme-wholesale.test', 'password' => bcrypt('x'),
                'role' => 'administrador', 'status' => true, 'email_verified_at' => now(),
            ]);
            $user->assignRole(DefaultRoleProvisioner::ADMINISTRADOR);

            return $user;
        });

        $this->actingAs($tenantAdmin)->post(route('settings.modules.update'), [
            'modules' => ['wholesale' => false],
        ]);

        $this->actingAs($tenantAdmin)->get(route('wholesale.index'))->assertNotFound();
    });
});
