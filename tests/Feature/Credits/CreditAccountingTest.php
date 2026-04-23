<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\CashSession;
use App\Models\Category;
use App\Models\Client;
use App\Models\CreditPayment;
use App\Models\CreditSale;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Sale;

beforeEach(function () {
    $this->branch = Branch::factory()->create();
    $this->category = Category::factory()->create();
    $this->client = Client::factory()->create();
    $this->seller = vendedorUser($this->branch);
    $this->admin = adminUser($this->branch);

    BusinessSetting::factory()->create(['require_cash_session' => false]);
    PaymentMethod::factory()->create(['code' => 'efectivo', 'name' => 'Efectivo', 'is_active' => true]);

    $this->product = Product::factory()->create([
        'branch_id' => $this->branch->id,
        'category_id' => $this->category->id,
        'sale_price' => 50000,
        'purchase_price' => 30000,
        'stock' => 10,
        'reserved_stock' => 0,
        'tax' => 0,
        'status' => true,
        'type' => 'producto',
    ]);

    $this->serviceProduct = Product::factory()->create([
        'branch_id' => $this->branch->id,
        'category_id' => $this->category->id,
        'sale_price' => 20000,
        'purchase_price' => 0,
        'stock' => 0,
        'reserved_stock' => 0,
        'tax' => 0,
        'status' => true,
        'type' => 'servicio',
    ]);
});

function creditPayload(string $type, array $overrides = []): array
{
    return array_merge([
        'type' => $type,
        'client_id' => test()->client->id,
        'branch_id' => test()->branch->id,
        'notes' => null,
        'due_date' => null,
        'installments_count' => null,
        'initial_payment' => null,
        'initial_payment_method' => null,
        'items' => [
            [
                'product_id' => test()->product->id,
                'quantity' => 2,
                'unit_price' => 50000,
                'subtotal' => 100000,
            ],
        ],
    ], $overrides);
}

// ─── Layaway (Separado) ─────────────────────────────────────────────────────

describe('Layaway (Separado) — deferred sale, reserved stock', function () {
    it('creates a credit without creating a Sale', function () {
        $this->actingAs($this->seller)
            ->post(route('credits.store'), creditPayload('layaway'));

        expect(CreditSale::count())->toBe(1);
        expect(Sale::count())->toBe(0); // No sale yet

        $credit = CreditSale::first();
        expect($credit->type)->toBe('layaway');
        expect($credit->status)->toBe('active');
        expect((float) $credit->total_amount)->toBe(100000.0);
        expect((float) $credit->balance)->toBe(100000.0);
        expect($credit->sale_id)->toBeNull();
    });

    it('reserves stock instead of deducting it', function () {
        $this->actingAs($this->seller)
            ->post(route('credits.store'), creditPayload('layaway'));

        $product = $this->product->fresh();
        expect($product->stock)->toBe(10); // Stock unchanged
        expect($product->reserved_stock)->toBe(2); // Reserved
        expect($product->availableStock())->toBe(8); // Available = 10 - 2
    });

    it('creates Sale and deducts stock when fully paid', function () {
        $this->actingAs($this->seller)
            ->post(route('credits.store'), creditPayload('layaway'));

        $credit = CreditSale::first();

        // Pay full amount
        $this->actingAs($this->seller)
            ->post(route('credits.payments.store', $credit), [
                'amount' => 100000,
                'payment_method' => 'efectivo',
            ]);

        $credit->refresh();
        expect($credit->status)->toBe('completed');
        expect($credit->sale_id)->not->toBeNull();
        expect(Sale::count())->toBe(1);

        $product = $this->product->fresh();
        expect($product->stock)->toBe(8); // Deducted
        expect($product->reserved_stock)->toBe(0); // Released
    });

    it('releases reserved stock on cancellation', function () {
        $this->actingAs($this->seller)
            ->post(route('credits.store'), creditPayload('layaway'));

        $credit = CreditSale::first();

        $this->actingAs($this->admin)
            ->post(route('credits.cancel', $credit));

        $credit->refresh();
        expect($credit->status)->toBe('cancelled');

        $product = $this->product->fresh();
        expect($product->stock)->toBe(10);
        expect($product->reserved_stock)->toBe(0);
    });
});

// ─── Installments (Cuotas) ──────────────────────────────────────────────────

describe('Installments (Cuotas) — immediate sale, deducted stock', function () {
    it('creates a Sale immediately with credit_pending status when credit is created', function () {
        $this->actingAs($this->seller)
            ->post(route('credits.store'), creditPayload('installments', [
                'installments_count' => 3,
                'due_date' => now()->addMonths(3)->format('Y-m-d'),
            ]));

        expect(CreditSale::count())->toBe(1);
        expect(Sale::count())->toBe(1); // Sale created immediately

        $credit = CreditSale::first();
        expect($credit->sale_id)->not->toBeNull();
        expect($credit->status)->toBe('active');
        expect((int) $credit->installments_count)->toBe(3);

        $sale = Sale::first();
        expect($sale->status)->toBe('credit_pending');
        expect((float) $sale->amount_paid)->toBe(0.0);
    });

    it('deducts stock immediately instead of reserving', function () {
        $this->actingAs($this->seller)
            ->post(route('credits.store'), creditPayload('installments', [
                'installments_count' => 3,
            ]));

        $product = $this->product->fresh();
        expect($product->stock)->toBe(8); // Deducted
        expect($product->reserved_stock)->toBe(0); // Not reserved
    });

    it('marks credit as completed and sale as completed when fully paid', function () {
        $this->actingAs($this->seller)
            ->post(route('credits.store'), creditPayload('installments', [
                'installments_count' => 2,
            ]));

        $credit = CreditSale::first();
        $saleId = $credit->sale_id;

        // Sale starts as credit_pending
        expect(Sale::find($saleId)->status)->toBe('credit_pending');

        // Pay in two installments
        $this->actingAs($this->seller)
            ->post(route('credits.payments.store', $credit), [
                'amount' => 50000,
                'payment_method' => 'efectivo',
            ]);

        // After partial payment, sale amount_paid is synced but status still credit_pending
        $sale = Sale::find($saleId);
        expect($sale->status)->toBe('credit_pending');
        expect((float) $sale->amount_paid)->toBe(50000.0);

        $this->actingAs($this->seller)
            ->post(route('credits.payments.store', $credit), [
                'amount' => 50000,
                'payment_method' => 'efectivo',
            ]);

        $credit->refresh();
        expect($credit->status)->toBe('completed');
        expect($credit->sale_id)->toBe($saleId); // Same sale, no new one
        expect(Sale::count())->toBe(1); // Still just one sale

        // Sale is now completed
        $sale = Sale::find($saleId);
        expect($sale->status)->toBe('completed');
        expect((float) $sale->amount_paid)->toBe(100000.0);
    });
});

// ─── Due Date (Fecha acordada) ──────────────────────────────────────────────

describe('Due Date — same as installments but single payment date', function () {
    it('creates Sale immediately with credit_pending status, deducts stock', function () {
        $this->actingAs($this->seller)
            ->post(route('credits.store'), creditPayload('due_date', [
                'due_date' => now()->addDays(30)->format('Y-m-d'),
            ]));

        expect(Sale::count())->toBe(1);
        expect(Sale::first()->status)->toBe('credit_pending');
        expect($this->product->fresh()->stock)->toBe(8);
    });
});

// ─── Hold (Reservado) ───────────────────────────────────────────────────────

describe('Hold (Reservado) — like layaway but without initial payment', function () {
    it('reserves stock without creating a Sale', function () {
        $this->actingAs($this->seller)
            ->post(route('credits.store'), creditPayload('hold'));

        expect(Sale::count())->toBe(0);
        expect($this->product->fresh()->reserved_stock)->toBe(2);
    });
});

// ─── Payment Validation ─────────────────────────────────────────────────────

describe('Payment validation', function () {
    it('rejects payment exceeding balance', function () {
        $this->actingAs($this->seller)
            ->post(route('credits.store'), creditPayload('layaway'));

        $credit = CreditSale::first();

        $response = $this->actingAs($this->seller)
            ->post(route('credits.payments.store', $credit), [
                'amount' => 200000, // More than 100000 balance
                'payment_method' => 'efectivo',
            ]);

        $response->assertSessionHasErrors('amount');
    });

    it('each payment creates a cash_movement when session is open', function () {
        // Open cash session
        CashSession::create([
            'branch_id' => $this->branch->id,
            'opened_by_user_id' => $this->seller->id,
            'status' => 'open',
            'opening_amount' => 0,
            'opened_at' => now(),
        ]);

        $this->actingAs($this->seller)
            ->post(route('credits.store'), creditPayload('layaway'));

        $credit = CreditSale::first();

        $this->actingAs($this->seller)
            ->post(route('credits.payments.store', $credit), [
                'amount' => 30000,
                'payment_method' => 'efectivo',
            ]);

        $this->assertDatabaseHas('cash_movements', [
            'type' => 'cash_in',
            'amount' => 30000,
            'reference_type' => 'credit_payment',
        ]);
    });

    it('records initial payment on layaway creation', function () {
        $this->actingAs($this->seller)
            ->post(route('credits.store'), creditPayload('layaway', [
                'initial_payment' => 25000,
                'initial_payment_method' => 'efectivo',
            ]));

        $credit = CreditSale::first();
        expect((float) $credit->amount_paid)->toBe(25000.0);
        expect((float) $credit->balance)->toBe(75000.0);
        expect(CreditPayment::count())->toBe(1);
    });
});

// ─── Authorization ──────────────────────────────────────────────────────────

describe('Authorization', function () {
    it('vendedor cannot cancel a credit', function () {
        $this->actingAs($this->seller)
            ->post(route('credits.store'), creditPayload('layaway'));

        $credit = CreditSale::first();

        $response = $this->actingAs($this->seller)
            ->post(route('credits.cancel', $credit));

        $response->assertForbidden();
    });

    it('admin can cancel a credit', function () {
        $this->actingAs($this->seller)
            ->post(route('credits.store'), creditPayload('layaway'));

        $credit = CreditSale::first();

        $this->actingAs($this->admin)
            ->post(route('credits.cancel', $credit));

        expect($credit->fresh()->status)->toBe('cancelled');
    });
});

// ─── Services ───────────────────────────────────────────────────────────────

describe('Service products in credits', function () {
    it('allows service products without reserving stock', function () {
        $this->actingAs($this->seller)
            ->post(route('credits.store'), creditPayload('layaway', [
                'items' => [
                    [
                        'product_id' => $this->serviceProduct->id,
                        'quantity' => 1,
                        'unit_price' => 20000,
                        'subtotal' => 20000,
                    ],
                ],
            ]));

        $credit = CreditSale::first();
        expect($credit)->not->toBeNull();
        expect($this->serviceProduct->fresh()->reserved_stock)->toBe(0);
    });
});
