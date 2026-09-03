<?php

use App\Authorization\DefaultRoleProvisioner;
use App\Models\Branch;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use Database\Seeders\PermissionSeeder;

beforeEach(function () {
    $this->seed(PermissionSeeder::class);
    $this->tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme', 'status' => 'active']);
    app(DefaultRoleProvisioner::class)->seedFor($this->tenant);
});

function legacyUser(Tenant $tenant, string $role): User
{
    return app(TenantManager::class)->runAs($tenant, function () use ($tenant, $role) {
        $branch = Branch::create(['name' => 'Principal', 'business_name' => 'Acme', 'address' => 'x', 'phone' => 'x', 'status' => true]);

        return User::create([
            'name' => ucfirst($role),
            'email' => $role.'@'.$tenant->slug.'.test',
            'password' => bcrypt('password'),
            'role' => $role,
            'branch_id' => $branch->id,
            'status' => true,
            'email_verified_at' => now(),
        ]);
    });
}

it('maps each legacy role string to the matching Spatie role', function () {
    $admin = legacyUser($this->tenant, 'administrador');
    $manager = legacyUser($this->tenant, 'encargado');
    $seller = legacyUser($this->tenant, 'vendedor');

    $this->artisan('roles:assign-legacy')->assertSuccessful();

    app(TenantManager::class)->runAs($this->tenant, function () use ($admin, $manager, $seller) {
        expect($admin->fresh()->hasRole('Administrador'))->toBeTrue()
            ->and($manager->fresh()->hasRole('Encargado'))->toBeTrue()
            ->and($seller->fresh()->hasRole('Vendedor'))->toBeTrue();
    });
});

it('never touches a super_admin user', function () {
    $superAdmin = User::create([
        'name' => 'Owner',
        'email' => 'owner@platform.test',
        'password' => bcrypt('password'),
        'role' => User::ROLE_SUPER_ADMIN,
        'status' => true,
        'email_verified_at' => now(),
    ]);

    $this->artisan('roles:assign-legacy')->assertSuccessful();

    expect($superAdmin->fresh()->roles()->count())->toBe(0);
});

it('does not reassign or duplicate a role the user already has', function () {
    $admin = legacyUser($this->tenant, 'administrador');

    app(TenantManager::class)->runAs($this->tenant, fn () => $admin->assignRole('Encargado'));

    $this->artisan('roles:assign-legacy')->assertSuccessful();

    app(TenantManager::class)->runAs($this->tenant, function () use ($admin) {
        // Already had a role (Encargado, assigned by hand) — left untouched,
        // not overwritten to match the legacy "administrador" column.
        expect($admin->fresh()->roles()->pluck('name')->all())->toBe(['Encargado']);
    });
});

it('changes nothing with --dry-run', function () {
    legacyUser($this->tenant, 'vendedor');

    $this->artisan('roles:assign-legacy', ['--dry-run' => true])->assertSuccessful();

    app(TenantManager::class)->runAs($this->tenant, function () {
        expect(User::where('role', 'vendedor')->first()->roles()->count())->toBe(0);
    });
});

it('only migrates the given tenant with --tenant', function () {
    $other = Tenant::create(['name' => 'Other', 'slug' => 'other', 'status' => 'active']);
    app(DefaultRoleProvisioner::class)->seedFor($other);

    $inScope = legacyUser($this->tenant, 'vendedor');
    $outOfScope = legacyUser($other, 'vendedor');

    $this->artisan('roles:assign-legacy', ['--tenant' => $this->tenant->id])->assertSuccessful();

    app(TenantManager::class)->runAs($this->tenant, function () use ($inScope) {
        expect($inScope->fresh()->hasRole('Vendedor'))->toBeTrue();
    });
    app(TenantManager::class)->runAs($other, function () use ($outOfScope) {
        expect($outOfScope->fresh()->roles()->count())->toBe(0);
    });
});

it('fails loudly when --tenant does not match any tenant, matching roles:seed-defaults', function () {
    // A silent "no users to migrate" here would read as "already done"
    // rather than "wrong tenant id" — must fail the same way the sibling
    // migration command does.
    $this->artisan('roles:assign-legacy', ['--tenant' => 999])->assertFailed();
});
