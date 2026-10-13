<?php

use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use App\Tenancy\TenantProvisioner;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

/**
 * PR 3 of the super-admin expansion plan: the cross-tenant search on
 * /admin/tenants, and /admin/super-admins for
 * managing other platform-owner accounts from the UI instead of only via
 * the tenancy:make-super-admin console command.
 */
uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(PermissionSeeder::class));

afterEach(fn () => app(TenantManager::class)->forget());

function platformToolsSuperAdmin(): User
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

it('lists the tenants without computing platform-wide totals the page no longer shows', function () {
    $superAdmin = platformToolsSuperAdmin();
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);

    $props = $this->actingAs($superAdmin)->get('/admin/tenants')->viewData('page')['props'];

    expect($props)->not->toHaveKey('summary');
    $row = collect($props['tenants'])->firstWhere('slug', $tenant->slug);
    expect($row)->toMatchArray(['name' => 'Café Central', 'status' => $tenant->status])
        ->and($row)->toHaveKeys(['id', 'slug', 'created_at', 'trial_ends_at', 'last_activity_at']);
});

it('still names an archived tenant in a cross-tenant user match, and surfaces the user\'s active status', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana Pérez', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());
    $admin->update(['status' => false]);
    $tenant->delete();

    $response = $this->actingAs(platformToolsSuperAdmin())->get('/admin/tenants?search=ana@cafe.test');

    $match = collect($response->viewData('page')['props']['userMatches'])->first();
    expect($match['tenant']['name'])->toBe('Café Central');
    expect($match['status'])->toBeFalse();
});

it('filters the tenant list by name or slug via ?search=', function () {
    app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    app(TenantProvisioner::class)->create([
        'business_name' => 'Ferretería Norte', 'admin_name' => 'Beto', 'admin_email' => 'beto@ferreteria.test', 'admin_password' => 'password123',
    ]);

    $response = $this->actingAs(platformToolsSuperAdmin())->get('/admin/tenants?search=café');

    $names = collect($response->viewData('page')['props']['tenants'])->pluck('name');
    expect($names)->toContain('Café Central')->not->toContain('Ferretería Norte');
});

it('finds a cross-tenant user match by email and points to their tenant', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana Pérez', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    app(TenantProvisioner::class)->create([
        'business_name' => 'Ferretería Norte', 'admin_name' => 'Beto', 'admin_email' => 'beto@ferreteria.test', 'admin_password' => 'password123',
    ]);

    $response = $this->actingAs(platformToolsSuperAdmin())->get('/admin/tenants?search=ana@cafe.test');

    $matches = collect($response->viewData('page')['props']['userMatches']);
    expect($matches)->toHaveCount(1);
    expect($matches->first()['tenant']['name'])->toBe('Café Central');
});

it('never returns a super admin as a user search match', function () {
    $superAdmin = platformToolsSuperAdmin();

    $response = $this->actingAs($superAdmin)->get('/admin/tenants?search=owner@platform.test');

    expect($response->viewData('page')['props']['userMatches'])->toBeEmpty();
});

it('lists existing super admins with status and last login', function () {
    $superAdmin = platformToolsSuperAdmin();

    $response = $this->actingAs($superAdmin)->get('/admin/super-admins');

    $response->assertOk();
    $rows = collect($response->viewData('page')['props']['superAdmins']);
    expect($rows->pluck('email'))->toContain('owner@platform.test');
});

it('creates a new super admin who can then log in', function () {
    $response = $this->actingAs(platformToolsSuperAdmin())->post('/admin/super-admins', [
        'name' => 'Second Owner',
        'email' => 'second@platform.test',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertRedirect('/admin/super-admins');

    $created = User::where('email', 'second@platform.test')->first();
    expect($created)->not->toBeNull()
        ->and($created->isSuperAdmin())->toBeTrue()
        ->and($created->tenant_id)->toBeNull()
        ->and($created->status)->toBeTrue();

    $this->post('/logout');
    $this->post('/login', ['email' => 'second@platform.test', 'password' => 'password123'])
        ->assertRedirect('/admin/tenants');
});

it('rejects a duplicate email when creating a super admin', function () {
    $existing = platformToolsSuperAdmin();

    $this->actingAs($existing)->post('/admin/super-admins', [
        'name' => 'Duplicate', 'email' => $existing->email, 'password' => 'password123', 'password_confirmation' => 'password123',
    ])->assertSessionHasErrors('email');
});

it('deactivates and reactivates a super admin', function () {
    $actor = platformToolsSuperAdmin();
    $target = User::create([
        'name' => 'Target', 'email' => 'target@platform.test', 'password' => Hash::make('x'),
        'role' => User::ROLE_SUPER_ADMIN, 'status' => true, 'email_verified_at' => now(),
    ]);

    $this->actingAs($actor)->post("/admin/super-admins/{$target->id}/toggle-status")->assertRedirect();
    expect($target->fresh()->status)->toBeFalse();

    $this->actingAs($actor)->post("/admin/super-admins/{$target->id}/toggle-status")->assertRedirect();
    expect($target->fresh()->status)->toBeTrue();
});

it('refuses to deactivate your own account', function () {
    $actor = platformToolsSuperAdmin();
    User::create([
        'name' => 'Other', 'email' => 'other@platform.test', 'password' => Hash::make('x'),
        'role' => User::ROLE_SUPER_ADMIN, 'status' => true, 'email_verified_at' => now(),
    ]);

    $this->actingAs($actor)->post("/admin/super-admins/{$actor->id}/toggle-status")->assertSessionHasErrors('status');
    expect($actor->fresh()->status)->toBeTrue();
});

it('cannot deactivate the only remaining active super admin from a stale inactive session', function () {
    // The "only active super admin" guard in SuperAdminController counts the
    // active ones excluding the target, so it could only be reached by an actor
    // whose own row is already inactive. EnsureUserIsActive now signs that
    // stale session out before the controller runs, so the target is untouched.
    $actor = User::create([
        'name' => 'Stale Session', 'email' => 'stale@platform.test', 'password' => Hash::make('x'),
        'role' => User::ROLE_SUPER_ADMIN, 'status' => false, 'email_verified_at' => now(),
    ]);
    $lastActive = User::create([
        'name' => 'Last Active', 'email' => 'last@platform.test', 'password' => Hash::make('x'),
        'role' => User::ROLE_SUPER_ADMIN, 'status' => true, 'email_verified_at' => now(),
    ]);

    $this->actingAs($actor)
        ->post("/admin/super-admins/{$lastActive->id}/toggle-status")
        ->assertRedirect(route('login'));

    expect($lastActive->fresh()->status)->toBeTrue();
});

it('allows deactivating a target as long as another super admin stays active', function () {
    $actor = platformToolsSuperAdmin();
    $target = User::create([
        'name' => 'Target', 'email' => 'target2@platform.test', 'password' => Hash::make('x'),
        'role' => User::ROLE_SUPER_ADMIN, 'status' => true, 'email_verified_at' => now(),
    ]);

    $this->actingAs($actor)->post("/admin/super-admins/{$target->id}/toggle-status")->assertSessionDoesntHaveErrors();

    expect($target->fresh()->status)->toBeFalse();
});

it('a deactivated super admin cannot log in', function () {
    $target = User::create([
        'name' => 'Target', 'email' => 'target@platform.test', 'password' => Hash::make('password123'),
        'role' => User::ROLE_SUPER_ADMIN, 'status' => false, 'email_verified_at' => now(),
    ]);

    $this->post('/login', ['email' => $target->email, 'password' => 'password123'])->assertSessionHasErrors();
    $this->assertGuest();
});

it('forbids a tenant user from reaching the super-admins management routes', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());

    $this->actingAs($admin)->get('/admin/super-admins')->assertForbidden();
    $this->actingAs($admin)->post('/admin/super-admins', ['name' => 'x', 'email' => 'x@x.test', 'password' => 'password123', 'password_confirmation' => 'password123'])->assertForbidden();
});

it('a tenant user can never be targeted by toggle-status even by guessing an id', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $tenantAdmin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());
    $superAdmin = platformToolsSuperAdmin();

    $this->actingAs($superAdmin)->post("/admin/super-admins/{$tenantAdmin->id}/toggle-status")->assertNotFound();
    expect($tenantAdmin->fresh()->status)->toBeTrue();
});
