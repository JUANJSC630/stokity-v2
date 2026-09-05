<?php

use App\Models\TenantImpersonation;
use App\Models\User;
use App\Tenancy\TenantManager;
use App\Tenancy\TenantProvisioner;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

/**
 * PR 3 of the super-admin panel plan: "enter as this user" impersonation.
 * The super admin's own password is validated inline, in the same request
 * that performs the impersonation (not via Laravel's password.confirm
 * redirect flow, which needs an extra round trip to resume a POST action).
 */
uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(PermissionSeeder::class));

afterEach(fn () => app(TenantManager::class)->forget());

function impersonationSuperAdmin(): User
{
    return User::create([
        'name' => 'Owner',
        'email' => 'owner@platform.test',
        'password' => Hash::make('password123'),
        'role' => User::ROLE_SUPER_ADMIN,
        'status' => true,
        'email_verified_at' => now(),
    ]);
}

it('requires the password field', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());
    $superAdmin = impersonationSuperAdmin();

    $this->actingAs($superAdmin)
        ->post("/admin/tenants/{$tenant->id}/users/{$admin->id}/impersonate")
        ->assertSessionHasErrors('password');

    $this->assertAuthenticatedAs($superAdmin);
    expect(TenantImpersonation::count())->toBe(0);
});

it('rejects impersonation with the wrong password', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());
    $superAdmin = impersonationSuperAdmin();

    $this->actingAs($superAdmin)
        ->post("/admin/tenants/{$tenant->id}/users/{$admin->id}/impersonate", ['password' => 'not-the-right-password'])
        ->assertSessionHasErrors('password');

    $this->assertAuthenticatedAs($superAdmin);
    expect(TenantImpersonation::count())->toBe(0);
});

it('logs in as the tenant user and records the impersonation in a single request', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());
    $superAdmin = impersonationSuperAdmin();

    $response = $this->actingAs($superAdmin)
        ->post("/admin/tenants/{$tenant->id}/users/{$admin->id}/impersonate", ['password' => 'password123']);

    $response->assertRedirect(route('dashboard'));
    $this->assertAuthenticatedAs($admin);

    $log = TenantImpersonation::sole();
    expect($log->super_admin_id)->toBe($superAdmin->id)
        ->and($log->tenant_id)->toBe($tenant->id)
        ->and($log->impersonated_user_id)->toBe($admin->id)
        ->and($log->ended_at)->toBeNull();

    // The banner prop is now active and names the right tenant.
    $dashboard = $this->get('/dashboard');
    expect($dashboard->viewData('page')['props']['impersonating'])->toBe(['active' => true, 'tenantName' => 'Café Central']);
});

it('refuses to impersonate a user from a different tenant', function () {
    $tenantA = app(TenantProvisioner::class)->create([
        'business_name' => 'Tienda A', 'admin_name' => 'Admin A', 'admin_email' => 'a@a.test', 'admin_password' => 'password123',
    ]);
    $tenantB = app(TenantProvisioner::class)->create([
        'business_name' => 'Tienda B', 'admin_name' => 'Admin B', 'admin_email' => 'b@b.test', 'admin_password' => 'password123',
    ]);
    $userB = app(TenantManager::class)->runAs($tenantB, fn () => User::where('email', 'b@b.test')->first());
    $superAdmin = impersonationSuperAdmin();

    $this->actingAs($superAdmin)
        ->post("/admin/tenants/{$tenantA->id}/users/{$userB->id}/impersonate", ['password' => 'password123'])
        ->assertNotFound();
});

it('stops the impersonation, closes the log and restores the super admin session', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());
    $superAdmin = impersonationSuperAdmin();

    $this->actingAs($superAdmin)
        ->post("/admin/tenants/{$tenant->id}/users/{$admin->id}/impersonate", ['password' => 'password123'])
        ->assertRedirect(route('dashboard'));

    $this->assertAuthenticatedAs($admin);

    $this->post('/stop-impersonating')->assertRedirect(route('admin.tenants.index'));

    $this->assertAuthenticatedAs($superAdmin);

    $log = TenantImpersonation::sole();
    expect($log->ended_at)->not->toBeNull();
});

it('closes the impersonation log if the tenant user logs out instead of using the exit route', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());
    $superAdmin = impersonationSuperAdmin();

    $this->actingAs($superAdmin)
        ->post("/admin/tenants/{$tenant->id}/users/{$admin->id}/impersonate", ['password' => 'password123']);

    $this->post('/logout');

    $log = TenantImpersonation::sole();
    expect($log->ended_at)->not->toBeNull();
});

it('blocks nested impersonation because the impersonated user is never a super admin', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $otherTenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Otra', 'admin_name' => 'Otro', 'admin_email' => 'otro@otra.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());
    $otherAdmin = app(TenantManager::class)->runAs($otherTenant, fn () => User::where('email', 'otro@otra.test')->first());
    $superAdmin = impersonationSuperAdmin();

    $this->actingAs($superAdmin)
        ->post("/admin/tenants/{$tenant->id}/users/{$admin->id}/impersonate", ['password' => 'password123'])
        ->assertRedirect(route('dashboard'));

    // Now "logged in" as $admin (a tenant user, not a super admin). Route
    // model binding for {user} runs before the super_admin check and is
    // itself tenant-scoped to $admin's own tenant (via IdentifyTenant), so
    // a cross-tenant target 404s before the role check is even reached —
    // either way, there is no path to a second, nested impersonation.
    $this->post("/admin/tenants/{$otherTenant->id}/users/{$otherAdmin->id}/impersonate", ['password' => 'password123'])
        ->assertNotFound();
});

it('blocks a nested impersonation of a same-tenant user via the role check', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());
    $coworker = app(TenantManager::class)->runAs($tenant, fn () => User::create([
        'name' => 'Coworker', 'email' => 'coworker@cafe.test', 'password' => Hash::make('password123'),
        'role' => 'vendedor', 'status' => true, 'email_verified_at' => now(),
    ]));
    $superAdmin = impersonationSuperAdmin();

    $this->actingAs($superAdmin)
        ->post("/admin/tenants/{$tenant->id}/users/{$admin->id}/impersonate", ['password' => 'password123'])
        ->assertRedirect(route('dashboard'));

    // Same-tenant target: route-model binding succeeds (both users share
    // $admin's own tenant), so this time the super_admin role check is
    // what actually blocks the nested attempt.
    $this->post("/admin/tenants/{$tenant->id}/users/{$coworker->id}/impersonate", ['password' => 'password123'])
        ->assertForbidden();
});

it('refuses to impersonate a disabled user', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $disabled = app(TenantManager::class)->runAs($tenant, fn () => User::create([
        'name' => 'Disabled', 'email' => 'disabled@cafe.test', 'password' => Hash::make('password123'),
        'role' => 'vendedor', 'status' => false, 'email_verified_at' => now(),
    ]));
    $superAdmin = impersonationSuperAdmin();

    $this->actingAs($superAdmin)
        ->post("/admin/tenants/{$tenant->id}/users/{$disabled->id}/impersonate", ['password' => 'password123'])
        ->assertForbidden();

    $this->assertAuthenticatedAs($superAdmin);
    expect(TenantImpersonation::count())->toBe(0);
});

it('refuses to impersonate into a suspended tenant, so nobody gets trapped past the first request', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());
    $tenant->update(['status' => \App\Models\Tenant::STATUS_SUSPENDED]);
    $superAdmin = impersonationSuperAdmin();

    $this->actingAs($superAdmin)
        ->post("/admin/tenants/{$tenant->id}/users/{$admin->id}/impersonate", ['password' => 'password123'])
        ->assertStatus(409);

    $this->assertAuthenticatedAs($superAdmin);
    expect(TenantImpersonation::count())->toBe(0);
});

it('does not carry the super admin\'s own password confirmation into the impersonated session', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());
    $superAdmin = impersonationSuperAdmin();

    $this->actingAs($superAdmin)->withSession(['auth.password_confirmed_at' => time()])
        ->post("/admin/tenants/{$tenant->id}/users/{$admin->id}/impersonate", ['password' => 'password123'])
        ->assertRedirect(route('dashboard'));

    expect(session('auth.password_confirmed_at'))->toBeNull();
});

it('lets the super admin exit an impersonation even after the tenant gets suspended mid-session', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());
    $superAdmin = impersonationSuperAdmin();

    $this->actingAs($superAdmin)
        ->post("/admin/tenants/{$tenant->id}/users/{$admin->id}/impersonate", ['password' => 'password123'])
        ->assertRedirect(route('dashboard'));

    $tenant->update(['status' => \App\Models\Tenant::STATUS_SUSPENDED]);

    // IdentifyTenant would otherwise 403 every request for a suspended
    // tenant's user — the exit route must stay reachable regardless.
    $this->post('/stop-impersonating')->assertRedirect(route('admin.tenants.index'));

    $this->assertAuthenticatedAs($superAdmin);
    $log = TenantImpersonation::sole();
    expect($log->ended_at)->not->toBeNull();
});

it('closes the log and forces a fresh login if the super admin was demoted while impersonating', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());
    $superAdmin = impersonationSuperAdmin();

    $this->actingAs($superAdmin)
        ->post("/admin/tenants/{$tenant->id}/users/{$admin->id}/impersonate", ['password' => 'password123'])
        ->assertRedirect(route('dashboard'));

    // Another operator revokes the super-admin role while this session is open.
    $superAdmin->update(['role' => 'vendedor']);

    $this->post('/stop-impersonating')->assertRedirect(route('login'));

    // The log closes regardless — the audit trail is never left open just
    // because the hand-back target turned out to be invalid.
    $log = TenantImpersonation::sole();
    expect($log->ended_at)->not->toBeNull();
    $this->assertGuest();
});

it('refuses to stop an impersonation that never started', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());

    $this->actingAs($admin)->post('/stop-impersonating')->assertForbidden();
});
