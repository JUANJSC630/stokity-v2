<?php

use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use App\Tenancy\TenantProvisioner;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

/**
 * PR 2 of the super-admin panel plan: tenant detail (users, branches,
 * metrics), editing a tenant's identity fields, resetting a tenant user's
 * password, and viewing/restoring archived tenants.
 */
uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(PermissionSeeder::class));

afterEach(fn () => app(TenantManager::class)->forget());

function superAdminUser(): User
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

it('shows tenant detail with users, branches and metrics', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central',
        'branch_name' => 'Principal',
        'admin_name' => 'Ana Admin',
        'admin_email' => 'ana@cafe.test',
        'admin_password' => 'password123',
    ]);

    $response = $this->actingAs(superAdminUser())->get("/admin/tenants/{$tenant->id}");

    $response->assertOk();
    $page = $response->viewData('page')['props'];
    expect($page['tenant']['name'])->toBe('Café Central');
    expect($page['tenant']['can_impersonate'])->toBeTrue();
    expect($page['metrics']['users_count'])->toBe(1);
    expect($page['users'])->toHaveCount(1);
    expect($page['users'][0]['email'])->toBe('ana@cafe.test');
    expect($page['users'][0])->toHaveKey('last_login_at');
    expect($page['branches'])->toHaveCount(1);
});

it('reports a user\'s last login time in the tenant detail, or null if they never logged in', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());
    $superAdmin = superAdminUser();

    $before = $this->actingAs($superAdmin)->get("/admin/tenants/{$tenant->id}");
    expect($before->viewData('page')['props']['users'][0]['last_login_at'])->toBeNull();

    $admin->update(['last_login_at' => now()]);

    $after = $this->actingAs($superAdmin)->get("/admin/tenants/{$tenant->id}");
    expect($after->viewData('page')['props']['users'][0]['last_login_at'])->not->toBeNull();
});

it('never mixes users or branches from another tenant into the detail view', function () {
    $tenantA = app(TenantProvisioner::class)->create([
        'business_name' => 'Tienda A', 'admin_name' => 'Admin A', 'admin_email' => 'a@a.test', 'admin_password' => 'password123',
    ]);
    app(TenantProvisioner::class)->create([
        'business_name' => 'Tienda B', 'admin_name' => 'Admin B', 'admin_email' => 'b@b.test', 'admin_password' => 'password123',
    ]);

    $response = $this->actingAs(superAdminUser())->get("/admin/tenants/{$tenantA->id}");

    $emails = collect($response->viewData('page')['props']['users'])->pluck('email');
    expect($emails)->toContain('a@a.test')->not->toContain('b@b.test');
});

it('lets a super admin edit a tenant name, slug and plan', function () {
    $tenant = Tenant::create(['name' => 'Old Name', 'slug' => 'old-slug', 'status' => 'active']);

    $this->actingAs(superAdminUser())
        ->put("/admin/tenants/{$tenant->id}", ['name' => 'New Name', 'slug' => 'new-slug', 'plan' => 'pro'])
        ->assertRedirect();

    $tenant->refresh();
    expect($tenant->name)->toBe('New Name')
        ->and($tenant->slug)->toBe('new-slug')
        ->and($tenant->plan)->toBe('pro');
});

it('rejects a slug already used by another tenant', function () {
    Tenant::create(['name' => 'Taken', 'slug' => 'taken-slug', 'status' => 'active']);
    $tenant = Tenant::create(['name' => 'Mine', 'slug' => 'mine-slug', 'status' => 'active']);

    $this->actingAs(superAdminUser())
        ->put("/admin/tenants/{$tenant->id}", ['name' => 'Mine', 'slug' => 'taken-slug'])
        ->assertSessionHasErrors('slug');
});

it('resets a tenant user password and reveals it once via flash', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'old-password',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());

    $response = $this->actingAs(superAdminUser())
        ->post("/admin/tenants/{$tenant->id}/users/{$admin->id}/reset-password");

    $response->assertRedirect();

    // Follow the redirect the way the frontend does: read the flash back
    // through Inertia's shared props, not straight off the session — that
    // is what actually reaches admin/tenants/show.tsx's reveal-password modal.
    $follow = $this->followingRedirects()->get("/admin/tenants/{$tenant->id}");
    $temporaryPassword = $follow->viewData('page')['props']['flash']['temporaryPassword'];
    expect($temporaryPassword)->not->toBeEmpty();

    $admin->refresh();
    expect(Hash::check($temporaryPassword, $admin->password))->toBeTrue();
    expect(Hash::check('old-password', $admin->password))->toBeFalse();
});

it('refuses to reset a password for a user outside the given tenant', function () {
    $tenantA = app(TenantProvisioner::class)->create([
        'business_name' => 'Tienda A', 'admin_name' => 'Admin A', 'admin_email' => 'a@a.test', 'admin_password' => 'password123',
    ]);
    $tenantB = app(TenantProvisioner::class)->create([
        'business_name' => 'Tienda B', 'admin_name' => 'Admin B', 'admin_email' => 'b@b.test', 'admin_password' => 'password123',
    ]);
    $userB = app(TenantManager::class)->runAs($tenantB, fn () => User::where('email', 'b@b.test')->first());

    $this->actingAs(superAdminUser())
        ->post("/admin/tenants/{$tenantA->id}/users/{$userB->id}/reset-password")
        ->assertNotFound();
});

it('lists archived tenants and lets a super admin restore one', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Archivada', 'admin_name' => 'Admin', 'admin_email' => 'x@x.test', 'admin_password' => 'password123',
    ]);
    $tenant->delete();

    $admin = superAdminUser();

    $index = $this->actingAs($admin)->get('/admin/tenants/archived');
    $index->assertOk();
    expect(collect($index->viewData('page')['props']['tenants'])->pluck('id'))->toContain($tenant->id);

    $this->actingAs($admin)->post("/admin/tenants/{$tenant->id}/restore")->assertRedirect('/admin/tenants');
    expect($tenant->fresh()->trashed())->toBeFalse();

    // The tenant's own admin regains access once restored.
    $tenantAdmin = User::where('email', 'x@x.test')->first();
    $this->actingAs($tenantAdmin)->get('/dashboard')->assertOk();
});

it('forbids a tenant user from reaching any of the new admin routes', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());

    $this->actingAs($admin)->get("/admin/tenants/{$tenant->id}")->assertForbidden();
    $this->actingAs($admin)->get('/admin/tenants/archived')->assertForbidden();
});
