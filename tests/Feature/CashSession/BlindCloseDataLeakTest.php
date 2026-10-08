<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\CashMovement;
use App\Models\CashSession;
use App\Models\PaymentMethod;
use App\Models\Sale;
use Inertia\Testing\AssertableInertia;

/**
 * The blind close exists so the cashier counts the drawer without knowing what
 * it should hold. Hiding only `expectedCash` is not enough: the same page used
 * to ship cash sales, movement amounts and credit payments, from which the
 * expected cash is trivial to compute.
 */
beforeEach(function () {
    $this->branch = Branch::factory()->create();
    BusinessSetting::factory()->create();
    PaymentMethod::factory()->create(['code' => 'cash', 'name' => 'Efectivo']);

    $this->vendedor = vendedorUser($this->branch);
    $this->session = CashSession::factory()->create([
        'branch_id' => $this->branch->id,
        'opened_by_user_id' => $this->vendedor->id,
        'status' => 'open',
        'opening_amount' => 100000,
    ]);

    Sale::factory()->count(2)->create([
        'branch_id' => $this->branch->id,
        'session_id' => $this->session->id,
        'seller_id' => $this->vendedor->id,
        'status' => 'completed',
        'payment_method' => 'cash',
        'total' => 50000,
    ]);

    CashMovement::factory()->create(['session_id' => $this->session->id, 'user_id' => $this->vendedor->id, 'type' => 'cash_in', 'amount' => 20000, 'concept' => 'Abono crédito #1', 'reference_type' => 'credit_payment']);
    CashMovement::factory()->create(['session_id' => $this->session->id, 'user_id' => $this->vendedor->id, 'type' => 'cash_out', 'amount' => 7000, 'concept' => 'Domicilio']);
});

describe('close form for a blind user', function () {
    it('does not ship totals, movement amounts or credit payment totals', function () {
        $this->actingAs($this->vendedor)
            ->get(route('cash-sessions.close.form', $this->session))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('cash-sessions/close')
                ->where('isBlind', true)
                ->where('expectedCash', null)
                ->where('totalSales', null)
                ->where('creditPaymentsTotal', null)
                ->where('creditPaymentsCount', 1)
                ->has('salesSummary.0', fn ($row) => $row->where('count', 2)->missing('total')->etc())
                ->has('movements', 2)
                ->missing('movements.0.amount')
                ->missing('movements.1.amount')
                ->where('movements.1.concept', 'Domicilio')
            );
    });

    it('still ships everything to a user who can see the expected cash', function () {
        $this->actingAs(adminUser($this->branch))
            ->get(route('cash-sessions.close.form', $this->session))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('isBlind', false)
                ->where('totalSales', 100000)
                ->where('creditPaymentsTotal', 20000)
                ->where('salesSummary.0.total', 100000)
                ->where('movements.0.amount', '20000.00')
                ->where('expectedCash', 213000)
            );
    });

    it('still lets the blind user close with a declared amount and computes the discrepancy on the server', function () {
        $this->actingAs($this->vendedor)
            ->post(route('cash-sessions.close', $this->session), ['closing_amount_declared' => 210000])
            ->assertRedirect();

        $session = $this->session->fresh();
        expect($session->status)->toBe('closed');
        expect((float) $session->expected_cash)->toBe(213000.0);
        expect((float) $session->discrepancy)->toBe(-3000.0);
    });
});

describe('session detail of a still-open turn for a blind user', function () {
    it('hides totals and movement amounts', function () {
        $this->actingAs($this->vendedor)
            ->get(route('cash-sessions.show', $this->session))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('cash-sessions/show')
                ->where('isBlind', true)
                ->has('salesDetail.0', fn ($row) => $row->where('count', 2)->missing('total')->etc())
                ->missing('movements.0.amount')
            );
    });

    it('shows the full detail once the session is closed', function () {
        $this->session->update(['status' => 'closed', 'closed_by_user_id' => $this->vendedor->id, 'closed_at' => now(), 'closing_amount_declared' => 213000, 'expected_cash' => 213000, 'discrepancy' => 0]);

        $this->actingAs($this->vendedor)
            ->get(route('cash-sessions.show', $this->session))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('isBlind', false)
                ->where('salesDetail.0.total', 100000)
                ->where('movements.0.amount', '20000.00')
            );
    });

    it('shows the full detail of an open turn to a user who can see the expected cash', function () {
        $this->actingAs(adminUser($this->branch))
            ->get(route('cash-sessions.show', $this->session))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('isBlind', false)
                ->where('salesDetail.0.total', 100000)
            );
    });
});

describe('arqueo ticket (print.cash-session)', function () {
    it('is not available to a blind user while the turn is still open', function () {
        $this->actingAs($this->vendedor)
            ->get(route('print.cash-session', $this->session))
            ->assertForbidden();
    });

    it('is available to a user who can see the expected cash', function () {
        $this->actingAs(adminUser($this->branch))
            ->get(route('print.cash-session', $this->session))
            ->assertOk();
    });

    it('is available to the owner once the turn is closed', function () {
        $this->session->update(['status' => 'closed', 'closed_by_user_id' => $this->vendedor->id, 'closed_at' => now(), 'closing_amount_declared' => 213000, 'expected_cash' => 213000, 'discrepancy' => 0]);

        $this->actingAs($this->vendedor)
            ->get(route('print.cash-session', $this->session))
            ->assertOk();
    });

    it('cannot be printed by another seller of the same branch', function () {
        $this->session->update(['status' => 'closed', 'closed_by_user_id' => $this->vendedor->id, 'closed_at' => now(), 'closing_amount_declared' => 213000, 'expected_cash' => 213000, 'discrepancy' => 0]);

        $this->actingAs(vendedorUser($this->branch))
            ->get(route('print.cash-session', $this->session))
            ->assertForbidden();
    });
});
