<?php

use App\Models\Branch;
use App\Models\BusinessSetting;

beforeEach(function () {
    BusinessSetting::factory()->create();
    $this->branch = Branch::factory()->create();
});

describe('a user who is deactivated while logged in', function () {
    it('keeps working while the account is active', function () {
        $this->actingAs(adminUser($this->branch))->get(route('dashboard'))->assertOk();
    });

    it('is logged out on the next request', function () {
        $user = adminUser($this->branch);
        $this->actingAs($user)->get(route('dashboard'))->assertOk();

        $user->update(['status' => false]);

        $this->get(route('dashboard'))->assertRedirect(route('login'));
        $this->assertGuest();
    });

    it('is redirected on JSON and Inertia requests too', function () {
        $user = adminUser($this->branch);
        $user->update(['status' => false]);

        $this->actingAs($user)->getJson(route('dashboard'))->assertUnauthorized();
        $this->actingAs($user)->get(route('dashboard'), ['X-Inertia' => 'true'])->assertRedirect(route('login'));
    });

    it('sees why when sent back to the login', function () {
        $user = adminUser($this->branch);
        $user->update(['status' => false]);

        $this->actingAs($user)->get(route('dashboard'))->assertRedirect(route('login'))->assertSessionHasErrors('email');
    });
});

describe('deactivating a user', function () {
    it('rotates the remember token so a remember-me cookie stops working', function () {
        $user = vendedorUser($this->branch);
        $user->forceFill(['remember_token' => 'old-token'])->save();

        $user->update(['status' => false]);

        expect($user->fresh()->remember_token)->not->toBe('old-token');
    });

    it('does not touch the remember token when the account stays active', function () {
        $user = vendedorUser($this->branch);
        $user->forceFill(['remember_token' => 'old-token'])->save();

        $user->update(['name' => 'Otro nombre']);

        expect($user->fresh()->remember_token)->toBe('old-token');
    });

    it('does not rotate the token when an inactive user is edited again', function () {
        $user = vendedorUser($this->branch);
        $user->update(['status' => false]);
        $token = $user->fresh()->remember_token;

        $user->update(['name' => 'Otro nombre']);

        expect($user->fresh()->remember_token)->toBe($token);
    });

    it('deletes the stored sessions of that user when sessions live in the database', function () {
        config(['session.driver' => 'database']);
        $user = vendedorUser($this->branch);
        $other = vendedorUser($this->branch);
        DB::table('sessions')->insert([
            ['id' => 'a', 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()],
            ['id' => 'b', 'user_id' => $other->id, 'payload' => '', 'last_activity' => time()],
        ]);

        $user->update(['status' => false]);

        expect(DB::table('sessions')->pluck('id')->all())->toBe(['b']);
    });
});
