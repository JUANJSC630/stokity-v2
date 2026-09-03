<?php

use App\Authorization\DefaultRoleProvisioner;
use App\Models\BusinessSetting;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;

/**
 * There's no subdomain routing in this app (tenant is resolved from the
 * logged-in user — see IdentifyTenant), so a guest visiting `/` or `/login`
 * is otherwise unknowable. This is the `last_tenant` cookie: set on
 * successful login, read back on the next guest visit to show that
 * business's real name/logo/colors instead of the generic Stokity default.
 */
uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    $this->tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme', 'status' => 'active']);
    app(TenantManager::class)->runAs($this->tenant, fn () => BusinessSetting::create([
        'name' => 'Acme Accesorios', 'currency_symbol' => '$',
    ]));

    $this->admin = app(TenantManager::class)->runAs($this->tenant, function () {
        app(DefaultRoleProvisioner::class)->seedFor($this->tenant);
        $user = User::create([
            'name' => 'Admin', 'email' => 'admin@acme.test', 'password' => bcrypt('password'),
            'role' => 'administrador', 'status' => true, 'email_verified_at' => now(),
        ]);
        $user->assignRole(DefaultRoleProvisioner::ADMINISTRADOR);

        return $user;
    });
});

it('sets the last_tenant cookie when a tenant user logs in', function () {
    $response = $this->post('/login', ['email' => 'admin@acme.test', 'password' => 'password']);

    $response->assertCookie('last_tenant', 'acme');
});

it('does NOT set the last_tenant cookie for a super-admin login', function () {
    $superAdmin = User::create([
        'name' => 'Root', 'email' => 'root@stokity.test', 'password' => bcrypt('password'),
        'role' => User::ROLE_SUPER_ADMIN, 'status' => true, 'email_verified_at' => now(),
    ]);

    $response = $this->post('/login', ['email' => 'root@stokity.test', 'password' => 'password']);

    expect($response->headers->getCookies())->each(fn ($cookie) => expect($cookie->getName())->not->toBe('last_tenant'));
});

it('shows the recognized tenant\'s branding to a guest with a valid last_tenant cookie', function () {
    $response = $this->withCookie('last_tenant', 'acme')->get('/');

    $response->assertOk();
    expect($response->viewData('page')['props']['business']['name'])->toBe('Acme Accesorios');
});

it('never creates a BusinessSetting row on behalf of an anonymous guest', function () {
    // Regression: BusinessSetting::getSettings() auto-provisions a row if
    // one is missing — fine for an authenticated tenant user, but calling
    // it from the guest cookie path would mean an anonymous GET / could
    // trigger a DB write for whichever tenant the cookie names. Every real
    // tenant already gets a row via TenantProvisioner, so this is about a
    // defensive guarantee (getSettingsReadOnly()), not a reachable bug —
    // asserted directly here rather than left implicit.
    $bare = Tenant::create(['name' => 'Bare', 'slug' => 'bare', 'status' => 'active']);
    expect(app(TenantManager::class)->runAs($bare, fn () => BusinessSetting::withoutGlobalScope(\App\Tenancy\TenantScope::class)->where('tenant_id', $bare->id)->exists()))->toBeFalse();

    $response = $this->withCookie('last_tenant', 'bare')->get('/');

    $response->assertOk();
    expect(BusinessSetting::withoutGlobalScope(\App\Tenancy\TenantScope::class)->where('tenant_id', $bare->id)->exists())->toBeFalse();
});

it('falls back to generic branding for a guest with no cookie', function () {
    $response = $this->get('/');

    $response->assertOk();
    expect($response->viewData('page')['props']['business']['name'])->not->toBe('Acme Accesorios');
});

it('falls back to generic branding for a cookie naming a nonexistent tenant', function () {
    $response = $this->withCookie('last_tenant', 'does-not-exist')->get('/');

    $response->assertOk();
    expect($response->viewData('page')['props']['business']['name'])->not->toBe('Acme Accesorios');
});

it('falls back to generic branding for a cookie naming a suspended tenant', function () {
    $this->tenant->update(['status' => 'suspended']);

    $response = $this->withCookie('last_tenant', 'acme')->get('/');

    $response->assertOk();
    expect($response->viewData('page')['props']['business']['name'])->not->toBe('Acme Accesorios');
});

it('never leaks a tenant\'s branding into the super-admin\'s own authenticated panel', function () {
    // Regression: a logged-in super-admin also has no active tenant
    // context, same as a guest — but must never see a specific tenant's
    // branding just because this browser last logged into that tenant.
    $superAdmin = User::create([
        'name' => 'Root', 'email' => 'root@stokity.test', 'password' => bcrypt('password'),
        'role' => User::ROLE_SUPER_ADMIN, 'status' => true, 'email_verified_at' => now(),
    ]);

    $response = $this->actingAs($superAdmin)->withCookie('last_tenant', 'acme')->get(route('admin.tenants.index'));

    $response->assertOk();
    expect($response->viewData('page')['props']['business']['name'])->not->toBe('Acme Accesorios');
});
