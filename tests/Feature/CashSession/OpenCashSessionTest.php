<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\CashSession;
use App\Models\PaymentMethod;
use App\Models\User;

beforeEach(function () {
    $this->branch = Branch::factory()->create();
    $this->user = vendedorUser($this->branch);

    BusinessSetting::factory()->create();
    PaymentMethod::factory()->create(['code' => 'cash']);
});

describe('Open Cash Session', function () {
    it('user can open session with opening_amount', function () {
        $response = $this->actingAs($this->user)
            ->post(route('cash-sessions.store'), [
                'opening_amount' => 50000,
            ]);

        $response->assertRedirect(route('pos.index'));
        $this->assertDatabaseHas('cash_sessions', [
            'opened_by_user_id' => $this->user->id,
            'branch_id' => $this->branch->id,
            'status' => 'open',
        ]);
    });

    it('session has status open after creation', function () {
        $this->actingAs($this->user)
            ->post(route('cash-sessions.store'), [
                'opening_amount' => 100000,
            ]);

        $session = CashSession::where('opened_by_user_id', $this->user->id)->first();
        expect($session->status)->toBe('open');
    });

    it('cannot open a second session while one is active', function () {
        CashSession::factory()->create([
            'branch_id' => $this->branch->id,
            'opened_by_user_id' => $this->user->id,
            'status' => 'open',
        ]);

        $response = $this->actingAs($this->user)
            ->post(route('cash-sessions.store'), [
                'opening_amount' => 50000,
            ]);

        $response->assertSessionHasErrors('session');
    });

    it('opening_amount of zero is valid', function () {
        $response = $this->actingAs($this->user)
            ->post(route('cash-sessions.store'), [
                'opening_amount' => 0,
            ]);

        $response->assertRedirect(route('pos.index'));
    });

    it('negative opening_amount fails validation', function () {
        $response = $this->actingAs($this->user)
            ->post(route('cash-sessions.store'), [
                'opening_amount' => -1000,
            ]);

        $response->assertSessionHasErrors('opening_amount');
    });

    it('user without branch_id cannot open session', function () {
        $userNoBranch = User::factory()->create([
            'role' => 'vendedor',
            'branch_id' => null,
            'status' => true,
        ]);

        $response = $this->actingAs($userNoBranch)
            ->post(route('cash-sessions.store'), [
                'opening_amount' => 50000,
            ]);

        $response->assertSessionHasErrors('branch');
    });

    it('session is associated with user branch_id', function () {
        $this->actingAs($this->user)
            ->post(route('cash-sessions.store'), [
                'opening_amount' => 75000,
            ]);

        $session = CashSession::where('opened_by_user_id', $this->user->id)->first();
        expect($session->branch_id)->toBe($this->branch->id);
    });
});
