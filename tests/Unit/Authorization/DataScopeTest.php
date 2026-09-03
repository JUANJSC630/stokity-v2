<?php

use App\Authorization\DefaultRoleProvisioner;
use App\Models\Branch;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(PermissionSeeder::class);
    $this->tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme', 'status' => 'active']);
    app(DefaultRoleProvisioner::class)->seedFor($this->tenant);
});

function makeUser(Tenant $tenant, string $legacyRole, ?string $spatieRole = null): User
{
    return app(TenantManager::class)->runAs($tenant, function () use ($legacyRole, $spatieRole) {
        $branch = Branch::create(['name' => 'Principal', 'business_name' => 'Acme', 'address' => 'x', 'phone' => 'x', 'status' => true]);
        $user = User::create([
            'name' => 'Test', 'email' => uniqid().'@acme.test', 'password' => bcrypt('x'),
            'role' => $legacyRole, 'branch_id' => $branch->id, 'status' => true, 'email_verified_at' => now(),
        ]);

        if ($spatieRole) {
            $user->assignRole($spatieRole);
        }

        return $user;
    });
}

it('resolves super_admin to all, regardless of any role', function () {
    $superAdmin = User::create([
        'name' => 'Owner', 'email' => 'owner@platform.test', 'password' => bcrypt('x'),
        'role' => User::ROLE_SUPER_ADMIN, 'status' => true, 'email_verified_at' => now(),
    ]);

    expect($superAdmin->dataScope())->toBe('all')
        ->and($superAdmin->isRestrictedToOwnBranch())->toBeFalse();
});

it('reads data_scope from the assigned Spatie role when one exists', function () {
    $admin = makeUser($this->tenant, 'administrador', DefaultRoleProvisioner::ADMINISTRADOR);
    $manager = makeUser($this->tenant, 'encargado', DefaultRoleProvisioner::ENCARGADO);
    $seller = makeUser($this->tenant, 'vendedor', DefaultRoleProvisioner::VENDEDOR);

    app(TenantManager::class)->runAs($this->tenant, function () use ($admin, $manager, $seller) {
        expect($admin->dataScope())->toBe('all')
            ->and($admin->isRestrictedToOwnBranch())->toBeFalse()
            ->and($manager->dataScope())->toBe('branch')
            ->and($manager->isRestrictedToOwnBranch())->toBeTrue()
            ->and($seller->dataScope())->toBe('branch')
            ->and($seller->isRestrictedToOwnBranch())->toBeTrue();
    });
});

it('falls back to the legacy role string when no Spatie role is assigned yet', function () {
    // Simulates a tenant that hasn't run roles:assign-legacy yet — behavior
    // must stay identical to today's isAdmin()-based checks.
    $admin = makeUser($this->tenant, 'administrador');
    $manager = makeUser($this->tenant, 'encargado');
    $seller = makeUser($this->tenant, 'vendedor');

    app(TenantManager::class)->runAs($this->tenant, function () use ($admin, $manager, $seller) {
        expect($admin->roles()->count())->toBe(0)
            ->and($admin->dataScope())->toBe('all')
            ->and($manager->dataScope())->toBe('branch')
            ->and($seller->dataScope())->toBe('branch');
    });
});

it('lets a custom role override the default scope without touching any code', function () {
    // The whole point of this axis: a tenant admin creates "Encargado Regional"
    // with data_scope=all, and every controller using dataScope() just works.
    app(TenantManager::class)->runAs($this->tenant, function () {
        \App\Models\Role::where('tenant_id', $this->tenant->id)->where('name', 'Encargado')
            ->first()->update(['data_scope' => 'all']);
    });

    $manager = makeUser($this->tenant, 'encargado', DefaultRoleProvisioner::ENCARGADO);

    app(TenantManager::class)->runAs($this->tenant, function () use ($manager) {
        expect($manager->dataScope())->toBe('all')
            ->and($manager->isRestrictedToOwnBranch())->toBeFalse();
    });
});
