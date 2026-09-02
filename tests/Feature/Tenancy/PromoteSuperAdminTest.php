<?php

use App\Models\Branch;
use App\Models\CashSession;
use App\Models\Sale;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Same shape as makeTenantWorld() in TenantIsolationTest, but returns the
 * branch too so tests can attach historical rows to the admin.
 *
 * @return array{tenant: Tenant, user: User, branch: Branch}
 */
function makeTenantAdmin(string $slug): array
{
    $tenant = Tenant::create(['name' => $slug, 'slug' => $slug, 'status' => 'active']);

    return app(TenantManager::class)->runAs($tenant, function () use ($tenant) {
        $branch = Branch::factory()->create();
        $user = User::factory()->create([
            'role' => 'administrador',
            'branch_id' => $branch->id,
            'status' => true,
        ]);

        return ['tenant' => $tenant, 'user' => $user, 'branch' => $branch];
    });
}

it('promotes a clean tenant admin to super-admin', function () {
    ['user' => $admin] = makeTenantAdmin('promote-clean');

    $this->artisan('tenancy:promote-super-admin', ['email' => $admin->email, '--force' => true])
        ->assertSuccessful();

    $admin->refresh();
    expect($admin->role)->toBe(User::ROLE_SUPER_ADMIN)
        ->and($admin->tenant_id)->toBeNull()
        ->and($admin->branch_id)->toBeNull();
});

it('refuses to promote a user who already sold something, without --force', function () {
    ['user' => $admin, 'tenant' => $tenant, 'branch' => $branch] = makeTenantAdmin('promote-dirty');

    app(TenantManager::class)->runAs($tenant, function () use ($admin, $branch) {
        Sale::factory()->create(['seller_id' => $admin->id, 'branch_id' => $branch->id]);
    });

    $this->artisan('tenancy:promote-super-admin', ['email' => $admin->email])
        ->assertFailed();

    expect($admin->fresh()->role)->toBe('administrador');
});

it('allows the historical-data refusal to be overridden with --force', function () {
    ['user' => $admin, 'tenant' => $tenant, 'branch' => $branch] = makeTenantAdmin('promote-forced');

    app(TenantManager::class)->runAs($tenant, function () use ($admin, $branch) {
        CashSession::factory()->create(['opened_by_user_id' => $admin->id, 'branch_id' => $branch->id]);
    });

    $this->artisan('tenancy:promote-super-admin', ['email' => $admin->email, '--force' => true])
        ->assertSuccessful();

    expect($admin->fresh()->role)->toBe(User::ROLE_SUPER_ADMIN);
});

it('is idempotent when the user is already a super-admin', function () {
    $superAdmin = User::create([
        'name' => 'Owner',
        'email' => 'owner@platform.test',
        'password' => bcrypt('password123'),
        'role' => User::ROLE_SUPER_ADMIN,
        'status' => true,
        'email_verified_at' => now(),
    ]);

    $this->artisan('tenancy:promote-super-admin', ['email' => $superAdmin->email])
        ->assertSuccessful();
});

it('fails for an email that does not exist', function () {
    $this->artisan('tenancy:promote-super-admin', ['email' => 'nadie@example.com'])
        ->assertFailed();
});
