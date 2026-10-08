<?php

use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use App\Tenancy\TenantProvisioner;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

/**
 * The /admin/tenants list shows, per business, how much trial is left and when
 * anyone last signed in, so the platform owner can spot inactive customers.
 */
uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(PermissionSeeder::class));

afterEach(fn () => app(TenantManager::class)->forget());

function activityListSuperAdmin(): User
{
    return User::firstOrCreate(['email' => 'owner@activity.test'], [
        'name' => 'Owner',
        'password' => Hash::make('password123'),
        'role' => User::ROLE_SUPER_ADMIN,
        'status' => true,
        'email_verified_at' => now(),
    ]);
}

function activityListTenant(string $name, string $email): Tenant
{
    return app(TenantProvisioner::class)->create([
        'business_name' => $name, 'admin_name' => "Admin {$name}", 'admin_email' => $email, 'admin_password' => 'password123',
    ]);
}

function activityListRow(string $slugFragment): array
{
    $rows = test()->actingAs(activityListSuperAdmin())->get('/admin/tenants')->viewData('page')['props']['tenants'];

    return collect($rows)->first(fn (array $row) => str_contains($row['slug'], $slugFragment));
}

it('exposes the latest login across the tenant users as its last activity', function () {
    $tenant = activityListTenant('Tienda Activa', 'activa@a.test');
    User::allTenants()->where('tenant_id', $tenant->id)->update(['last_login_at' => now()->subDays(5)]);
    User::allTenants()->forceCreate([
        'tenant_id' => $tenant->id, 'name' => 'Cajero', 'email' => 'cajero@a.test', 'password' => Hash::make('password123'),
        'role' => 'vendedor', 'status' => true, 'last_login_at' => now()->subHours(2),
    ]);

    $row = activityListRow('tienda-activa');

    expect($row['last_activity_at'])->not->toBeNull()
        ->and(now()->parse($row['last_activity_at'])->diffInHours(now(), true))->toBeLessThan(3);
});

it('reports no activity when nobody from the tenant has signed in', function () {
    activityListTenant('Tienda Nueva', 'nueva@a.test');

    expect(activityListRow('tienda-nueva')['last_activity_at'])->toBeNull();
});

it('does not mix the logins of different tenants', function () {
    $quiet = activityListTenant('Tienda Quieta', 'quieta@a.test');
    $busy = activityListTenant('Tienda Ocupada', 'ocupada@a.test');
    User::allTenants()->where('tenant_id', $busy->id)->update(['last_login_at' => now()->subMinutes(10)]);

    expect(activityListRow('tienda-quieta')['last_activity_at'])->toBeNull()
        ->and(activityListRow('tienda-ocupada')['last_activity_at'])->not->toBeNull();

    expect($quiet->id)->not->toBe($busy->id);
});

it('exposes when the trial ends, and null for tenants without a trial end', function () {
    $trial = activityListTenant('Tienda Prueba', 'prueba@a.test');
    $trial->update(['status' => Tenant::STATUS_TRIAL, 'trial_ends_at' => now()->addDays(12)]);
    activityListTenant('Tienda Plena', 'plena@a.test');

    $row = activityListRow('tienda-prueba');

    expect($row['status'])->toBe(Tenant::STATUS_TRIAL)
        ->and(now()->parse($row['trial_ends_at'])->isFuture())->toBeTrue()
        ->and(activityListRow('tienda-plena')['trial_ends_at'])->toBeNull();
});
