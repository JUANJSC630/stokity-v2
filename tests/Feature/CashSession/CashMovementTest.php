<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\CashMovement;
use App\Models\CashSession;
use App\Models\PaymentMethod;

beforeEach(function () {
    $this->branch = Branch::factory()->create();
    $this->user   = vendedorUser($this->branch);

    BusinessSetting::factory()->create();
    PaymentMethod::factory()->create(['code' => 'cash']);

    $this->session = CashSession::factory()->create([
        'branch_id'         => $this->branch->id,
        'opened_by_user_id' => $this->user->id,
        'status'            => 'open',
    ]);
});

describe('Cash Movement', function () {
    it('can register cash_in in an active session', function () {
        $response = $this->actingAs($this->user)
            ->post(route('cash-sessions.movements.store', $this->session), [
                'type'    => 'cash_in',
                'amount'  => 50000,
                'concept' => 'Cambio adicional',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('cash_movements', [
            'session_id' => $this->session->id,
            'type'       => 'cash_in',
            'amount'     => 50000,
        ]);
    });

    it('can register cash_out in an active session', function () {
        $response = $this->actingAs($this->user)
            ->post(route('cash-sessions.movements.store', $this->session), [
                'type'    => 'cash_out',
                'amount'  => 20000,
                'concept' => 'Pago proveedor',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('cash_movements', [
            'session_id' => $this->session->id,
            'type'       => 'cash_out',
        ]);
    });

    it('movement is linked to the correct session', function () {
        $this->actingAs($this->user)
            ->post(route('cash-sessions.movements.store', $this->session), [
                'type'    => 'cash_in',
                'amount'  => 30000,
                'concept' => 'Depósito',
            ]);

        $movement = CashMovement::where('session_id', $this->session->id)->first();
        expect($movement)->not->toBeNull();
        expect($movement->session_id)->toBe($this->session->id);
        expect($movement->user_id)->toBe($this->user->id);
    });

    it('zero amount fails validation', function () {
        $response = $this->actingAs($this->user)
            ->post(route('cash-sessions.movements.store', $this->session), [
                'type'    => 'cash_in',
                'amount'  => 0,
                'concept' => 'Cero',
            ]);

        $response->assertSessionHasErrors('amount');
    });

    it('empty concept fails validation', function () {
        $response = $this->actingAs($this->user)
            ->post(route('cash-sessions.movements.store', $this->session), [
                'type'    => 'cash_in',
                'amount'  => 10000,
                'concept' => '',
            ]);

        $response->assertSessionHasErrors('concept');
    });

    it('cannot add movement to a closed session', function () {
        // Close the session
        $this->session->update(['status' => 'closed', 'closed_at' => now()]);

        $response = $this->actingAs($this->user)
            ->post(route('cash-sessions.movements.store', $this->session), [
                'type'    => 'cash_in',
                'amount'  => 10000,
                'concept' => 'Test',
            ]);

        $response->assertSessionHasErrors('session');
    });
});
