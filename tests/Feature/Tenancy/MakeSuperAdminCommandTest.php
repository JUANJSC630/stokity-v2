<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

/**
 * tenancy:make-super-admin creates the account that can manage every business, so
 * what it refuses matters as much as what it creates.
 *
 * email_verified_at is deliberately not asserted: the command passes it, but it is not
 * mass-assignable on User and User does not implement MustVerifyEmail, so the `verified`
 * middleware never blocks and the value has no effect.
 */
it('creates an active, verified super admin without tenant or branch', function () {
    $this->artisan('tenancy:make-super-admin', ['name' => 'Plataforma', 'email' => 'root@example.test'])
        ->expectsQuestion('Password (min 8 chars)', 'una-clave-larga-1')
        ->expectsOutputToContain('Super-admin creado: root@example.test')
        ->assertSuccessful();

    $user = User::withoutGlobalScopes()->where('email', 'root@example.test')->firstOrFail();

    expect($user->role)->toBe(User::ROLE_SUPER_ADMIN);
    expect($user->tenant_id)->toBeNull();
    expect($user->branch_id)->toBeNull();
    expect($user->status)->toBeTrue();
    expect(Hash::check('una-clave-larga-1', $user->password))->toBeTrue();
    expect($user->password)->not->toBe('una-clave-larga-1');
});

it('refuses a password shorter than 8 characters and creates nothing', function () {
    $this->artisan('tenancy:make-super-admin', ['name' => 'Plataforma', 'email' => 'root@example.test'])
        ->expectsQuestion('Password (min 8 chars)', 'corta')
        ->assertFailed();

    expect(User::withoutGlobalScopes()->where('email', 'root@example.test')->exists())->toBeFalse();
});

it('refuses an email that is already registered', function () {
    User::factory()->create(['email' => 'root@example.test']);

    $this->artisan('tenancy:make-super-admin', ['name' => 'Plataforma', 'email' => 'root@example.test'])
        ->expectsQuestion('Password (min 8 chars)', 'una-clave-larga-1')
        ->assertFailed();

    expect(User::withoutGlobalScopes()->where('email', 'root@example.test')->count())->toBe(1);
});

it('refuses an invalid email', function () {
    $this->artisan('tenancy:make-super-admin', ['name' => 'Plataforma', 'email' => 'no-es-un-correo'])
        ->expectsQuestion('Password (min 8 chars)', 'una-clave-larga-1')
        ->assertFailed();
});
