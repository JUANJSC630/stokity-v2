<?php

use App\Models\Tenant;
use App\Models\TenantImpersonation;
use App\Models\User;
use App\Tenancy\TenantManager;
use App\Tenancy\TenantProvisioner;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

/**
 * PR 1 of the super-admin expansion plan: a visible audit trail for
 * tenant_impersonations — the table existed and was populated since the
 * impersonation feature shipped, but nothing ever rendered it.
 */
uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(PermissionSeeder::class));

afterEach(fn () => app(TenantManager::class)->forget());

function auditLogSuperAdmin(): User
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

it('lists impersonation log entries with the related super admin, tenant and impersonated user', function () {
    $superAdmin = auditLogSuperAdmin();
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());

    TenantImpersonation::create([
        'super_admin_id' => $superAdmin->id,
        'tenant_id' => $tenant->id,
        'impersonated_user_id' => $admin->id,
        'started_at' => now()->subMinutes(10),
        'ended_at' => now(),
        'ip_address' => '127.0.0.1',
    ]);

    $response = $this->actingAs($superAdmin)->get('/admin/impersonations');

    $response->assertOk();
    $log = $response->viewData('page')['props']['logs']['data'][0];
    expect($log['super_admin']['email'])->toBe('owner@platform.test')
        ->and($log['tenant']['name'])->toBe('Café Central')
        ->and($log['impersonated_user']['email'])->toBe('ana@cafe.test')
        ->and($log['ip_address'])->toBe('127.0.0.1')
        ->and($log['ended_at'])->not->toBeNull();
});

it('filters the log by tenant_id', function () {
    $superAdmin = auditLogSuperAdmin();
    $tenantA = app(TenantProvisioner::class)->create([
        'business_name' => 'Tienda A', 'admin_name' => 'Admin A', 'admin_email' => 'a@a.test', 'admin_password' => 'password123',
    ]);
    $tenantB = app(TenantProvisioner::class)->create([
        'business_name' => 'Tienda B', 'admin_name' => 'Admin B', 'admin_email' => 'b@b.test', 'admin_password' => 'password123',
    ]);
    $adminA = app(TenantManager::class)->runAs($tenantA, fn () => User::where('email', 'a@a.test')->first());
    $adminB = app(TenantManager::class)->runAs($tenantB, fn () => User::where('email', 'b@b.test')->first());

    TenantImpersonation::create([
        'super_admin_id' => $superAdmin->id, 'tenant_id' => $tenantA->id, 'impersonated_user_id' => $adminA->id, 'started_at' => now(),
    ]);
    TenantImpersonation::create([
        'super_admin_id' => $superAdmin->id, 'tenant_id' => $tenantB->id, 'impersonated_user_id' => $adminB->id, 'started_at' => now(),
    ]);

    $response = $this->actingAs($superAdmin)->get("/admin/impersonations?tenant_id={$tenantA->id}");

    $logs = $response->viewData('page')['props']['logs']['data'];
    expect($logs)->toHaveCount(1);
    expect($logs[0]['tenant']['name'])->toBe('Tienda A');
});

it('shows an in-progress entry without an ended_at', function () {
    $superAdmin = auditLogSuperAdmin();
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());

    TenantImpersonation::create([
        'super_admin_id' => $superAdmin->id, 'tenant_id' => $tenant->id, 'impersonated_user_id' => $admin->id, 'started_at' => now(),
    ]);

    $response = $this->actingAs($superAdmin)->get('/admin/impersonations');

    expect($response->viewData('page')['props']['logs']['data'][0]['ended_at'])->toBeNull();
});

it('still shows a log entry after its tenant is hard-deleted, thanks to nullOnDelete', function () {
    $superAdmin = auditLogSuperAdmin();
    $tenant = Tenant::create(['name' => 'Gone', 'slug' => 'gone', 'status' => 'active']);

    $log = TenantImpersonation::create([
        'super_admin_id' => $superAdmin->id, 'tenant_id' => $tenant->id, 'impersonated_user_id' => $superAdmin->id, 'started_at' => now(),
    ]);

    $tenant->forceDelete();

    $response = $this->actingAs($superAdmin)->get('/admin/impersonations');

    $logs = $response->viewData('page')['props']['logs']['data'];
    expect($logs)->toHaveCount(1);
    expect($logs[0]['tenant'])->toBeNull();
    expect(TenantImpersonation::find($log->id))->not->toBeNull();
});

it('keeps showing the tenant and impersonated user names after a normal (soft) delete, not just a hard one', function () {
    $superAdmin = auditLogSuperAdmin();
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());

    TenantImpersonation::create([
        'super_admin_id' => $superAdmin->id, 'tenant_id' => $tenant->id, 'impersonated_user_id' => $admin->id, 'started_at' => now(),
    ]);

    // The routine "archivar negocio" / "eliminar usuario" flows are soft
    // deletes, not forceDelete() — the audit trail must survive those too,
    // not just the rare hard-delete case.
    $admin->delete();
    $tenant->delete();

    $response = $this->actingAs($superAdmin)->get('/admin/impersonations');

    $log = $response->viewData('page')['props']['logs']['data'][0];
    expect($log['tenant']['name'])->toBe('Café Central');
    expect($log['impersonated_user']['email'])->toBe('ana@cafe.test');
});

it('keeps showing the acting super admin\'s email after their own account is soft-deleted', function () {
    $actor = auditLogSuperAdmin();
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());

    TenantImpersonation::create([
        'super_admin_id' => $actor->id, 'tenant_id' => $tenant->id, 'impersonated_user_id' => $admin->id, 'started_at' => now(),
    ]);

    $actor->delete();

    // A realistically distinct viewer — a soft-deleted super admin
    // wouldn't be the one still logged in to check the log.
    $viewer = User::create([
        'name' => 'Viewer', 'email' => 'viewer@platform.test', 'password' => Hash::make('password123'),
        'role' => User::ROLE_SUPER_ADMIN, 'status' => true, 'email_verified_at' => now(),
    ]);

    $response = $this->actingAs($viewer)->get('/admin/impersonations');

    $log = $response->viewData('page')['props']['logs']['data'][0];
    expect($log['super_admin']['email'])->toBe('owner@platform.test');
});

it('forbids a tenant user from viewing the impersonation log', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central', 'admin_name' => 'Ana', 'admin_email' => 'ana@cafe.test', 'admin_password' => 'password123',
    ]);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::where('email', 'ana@cafe.test')->first());

    $this->actingAs($admin)->get('/admin/impersonations')->assertForbidden();
});
