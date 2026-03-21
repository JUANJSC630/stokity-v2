<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\CashMovement;
use App\Models\CashSession;
use App\Models\Category;
use App\Models\Client;
use App\Models\PaymentMethod;
use App\Models\Sale;

beforeEach(function () {
    $this->branch = Branch::factory()->create();
    $this->category = Category::factory()->create();
    $this->client = Client::factory()->create();
    $this->user = vendedorUser($this->branch);

    BusinessSetting::factory()->create(['require_cash_session' => false]);
    PaymentMethod::factory()->create(['code' => 'cash']);

    $this->session = CashSession::factory()->create([
        'branch_id' => $this->branch->id,
        'opened_by_user_id' => $this->user->id,
        'status' => 'open',
        'opening_amount' => 100000,
    ]);
});

describe('Close Cash Session', function () {
    it('can close an active own session', function () {
        $response = $this->actingAs($this->user)
            ->post(route('cash-sessions.close', $this->session), [
                'closing_amount_declared' => 100000,
            ]);

        $response->assertRedirect(route('cash-sessions.show', $this->session));
        expect($this->session->fresh()->status)->toBe('closed');
    });

    it('sets closed_at timestamp on close', function () {
        $this->actingAs($this->user)
            ->post(route('cash-sessions.close', $this->session), [
                'closing_amount_declared' => 100000,
            ]);

        $session = $this->session->fresh();
        expect($session->status)->toBe('closed');
        expect($session->closed_at)->not->toBeNull();
    });

    it('calculates expected_cash correctly', function () {
        // Add a cash sale
        $sale = Sale::factory()->create([
            'branch_id' => $this->branch->id,
            'session_id' => $this->session->id,
            'status' => 'completed',
            'payment_method' => 'cash',
            'total' => 50000,
            'net' => 50000,
            'client_id' => $this->client->id,
            'seller_id' => $this->user->id,
            'date' => now(),
        ]);

        // Add cash movement in
        CashMovement::factory()->create([
            'session_id' => $this->session->id,
            'user_id' => $this->user->id,
            'type' => 'cash_in',
            'amount' => 20000,
        ]);

        // Add cash movement out
        CashMovement::factory()->create([
            'session_id' => $this->session->id,
            'user_id' => $this->user->id,
            'type' => 'cash_out',
            'amount' => 10000,
        ]);

        $this->actingAs($this->user)
            ->post(route('cash-sessions.close', $this->session), [
                'closing_amount_declared' => 160000,
            ]);

        $session = $this->session->fresh();
        // expected = opening(100000) + sales_cash(50000) + cash_in(20000) - cash_out(10000) - refunds(0)
        expect((float) $session->expected_cash)->toBe(160000.0);
        expect((float) $session->discrepancy)->toBe(0.0);
    });

    it('calculates negative discrepancy when declaring less', function () {
        $this->actingAs($this->user)
            ->post(route('cash-sessions.close', $this->session), [
                'closing_amount_declared' => 90000,
            ]);

        $session = $this->session->fresh();
        // expected = 100000 (opening only, no sales/movements)
        // discrepancy = 90000 - 100000 = -10000
        expect((float) $session->discrepancy)->toBe(-10000.0);
    });

    it('cannot close another user session as vendedor', function () {
        $otherUser = vendedorUser($this->branch);
        $otherSession = CashSession::factory()->create([
            'branch_id' => $this->branch->id,
            'opened_by_user_id' => $otherUser->id,
            'status' => 'open',
        ]);

        $response = $this->actingAs($this->user)
            ->post(route('cash-sessions.close', $otherSession), [
                'closing_amount_declared' => 100000,
            ]);

        $response->assertStatus(403);
    });

    it('cannot close an already closed session', function () {
        // Close it first
        $this->actingAs($this->user)
            ->post(route('cash-sessions.close', $this->session), [
                'closing_amount_declared' => 100000,
            ]);

        // Try to close again
        $response = $this->actingAs($this->user)
            ->post(route('cash-sessions.close', $this->session), [
                'closing_amount_declared' => 100000,
            ]);

        $response->assertSessionHasErrors('session');
    });
});
