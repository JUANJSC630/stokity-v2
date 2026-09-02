<?php

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

// Public self-service registration is disabled in the multi-tenant model:
// the SuperAdmin provisions each business from the /admin panel.

test('registration screen is not available', function () {
    $this->get('/register')->assertNotFound();
});

test('public registration endpoint is disabled', function () {
    $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertNotFound();

    $this->assertGuest();
});
