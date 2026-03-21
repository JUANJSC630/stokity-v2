<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\CashSession;
use App\Models\PaymentMethod;

beforeEach(function () {
    $this->branch = Branch::factory()->create();

    BusinessSetting::factory()->create();
    PaymentMethod::factory()->create(['code' => 'cash']);

    $this->session = CashSession::factory()->create([
        'branch_id'         => $this->branch->id,
        'opened_by_user_id' => vendedorUser($this->branch)->id,
        'status'            => 'open',
        'opening_amount'    => 100000,
    ]);
});

describe('Blind Close Security (B3)', function () {
    it('vendedor cannot see expectedCash in close form', function () {
        $vendedor = vendedorUser($this->branch);

        // Re-create session owned by this vendedor
        $session = CashSession::factory()->create([
            'branch_id'         => $this->branch->id,
            'opened_by_user_id' => $vendedor->id,
            'status'            => 'open',
            'opening_amount'    => 100000,
        ]);

        $response = $this->actingAs($vendedor)
            ->get(route('cash-sessions.close.form', $session));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('cash-sessions/close')
            ->where('expectedCash', null)
            ->where('isBlind', true)
        );
    });

    it('admin can see expectedCash in close form', function () {
        $admin = adminUser($this->branch);

        $response = $this->actingAs($admin)
            ->get(route('cash-sessions.close.form', $this->session));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('cash-sessions/close')
            ->has('expectedCash')
            ->where('isBlind', false)
        );
    });

    it('encargado can see expectedCash in close form', function () {
        $manager = managerUser($this->branch);

        $response = $this->actingAs($manager)
            ->get(route('cash-sessions.close.form', $this->session));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('cash-sessions/close')
            ->has('expectedCash')
            ->where('isBlind', false)
        );
    });
});
