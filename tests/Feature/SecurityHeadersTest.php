<?php

use App\Models\Branch;
use App\Models\BusinessSetting;

beforeEach(fn () => BusinessSetting::factory()->create());

it('sends the baseline security headers on web pages', function () {
    $this->get('/login')
        ->assertOk()
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
        ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
});

it('sends them on authenticated pages', function () {
    $this->actingAs(adminUser(Branch::factory()->create()))->get(route('dashboard'))
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'SAMEORIGIN');
});

it('sends them on redirects too', function () {
    $this->get('/dashboard')->assertRedirect()->assertHeader('X-Content-Type-Options', 'nosniff');
});

it('sends them on JSON responses', function () {
    $this->getJson('/dashboard')->assertUnauthorized()->assertHeader('X-Content-Type-Options', 'nosniff');
});

it('sends HSTS only over https', function () {
    $this->get('http://localhost/login')->assertHeaderMissing('Strict-Transport-Security');

    $this->get('https://localhost/login')->assertHeader('Strict-Transport-Security', 'max-age=15552000');
});

it('sends HSTS when the proxy terminates TLS and forwards the scheme', function () {
    $this->get('http://localhost/login', ['X-Forwarded-Proto' => 'https'])
        ->assertHeader('Strict-Transport-Security', 'max-age=15552000');
});

it('does not send HSTS when the forwarded scheme is http', function () {
    $this->get('http://localhost/login', ['X-Forwarded-Proto' => 'http'])
        ->assertHeaderMissing('Strict-Transport-Security');
});
