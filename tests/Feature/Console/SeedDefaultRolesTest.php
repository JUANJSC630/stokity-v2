<?php

use App\Models\Role;
use App\Models\Tenant;
use App\Tenancy\TenantManager;
use Database\Seeders\PermissionSeeder;
use Spatie\Permission\PermissionRegistrar;

beforeEach(fn () => $this->seed(PermissionSeeder::class));

it('seeds default roles for every tenant when no --tenant is given', function () {
    $a = Tenant::create(['name' => 'A', 'slug' => 'a', 'status' => 'active']);
    $b = Tenant::create(['name' => 'B', 'slug' => 'b', 'status' => 'active']);

    $this->artisan('roles:seed-defaults')->assertSuccessful();

    expect(Role::where('tenant_id', $a->id)->count())->toBe(3)
        ->and(Role::where('tenant_id', $b->id)->count())->toBe(3);
});

it('seeds only the given tenant with --tenant', function () {
    $a = Tenant::create(['name' => 'A', 'slug' => 'a', 'status' => 'active']);
    $b = Tenant::create(['name' => 'B', 'slug' => 'b', 'status' => 'active']);

    $this->artisan('roles:seed-defaults', ['--tenant' => $a->id])->assertSuccessful();

    expect(Role::where('tenant_id', $a->id)->count())->toBe(3)
        ->and(Role::where('tenant_id', $b->id)->count())->toBe(0);
});

it('fails when --tenant does not match any tenant', function () {
    $this->artisan('roles:seed-defaults', ['--tenant' => 999])->assertFailed();
});

it('is safe to run twice', function () {
    $tenant = Tenant::create(['name' => 'A', 'slug' => 'a', 'status' => 'active']);

    $this->artisan('roles:seed-defaults')->assertSuccessful();
    $this->artisan('roles:seed-defaults')->assertSuccessful();

    app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);
    expect(Role::where('tenant_id', $tenant->id)->count())->toBe(3);
});

it('restores the permission team id after seeding several tenants, instead of leaking the last one', function () {
    Tenant::create(['name' => 'A', 'slug' => 'a', 'status' => 'active']);
    Tenant::create(['name' => 'B', 'slug' => 'b', 'status' => 'active']);
    Tenant::create(['name' => 'C', 'slug' => 'c', 'status' => 'active']);

    // Console context: nothing has set a tenant, so the team id starts null —
    // it must come back to exactly that, not "whichever tenant ran last".
    expect(app(TenantManager::class)->check())->toBeFalse()
        ->and(app(PermissionRegistrar::class)->getPermissionsTeamId())->toBeNull();

    $this->artisan('roles:seed-defaults')->assertSuccessful();

    expect(app(PermissionRegistrar::class)->getPermissionsTeamId())->toBeNull()
        ->and(app(TenantManager::class)->check())->toBeFalse();
});
