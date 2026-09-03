<?php

use App\Models\Tenant;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;

uses(RefreshDatabase::class);

it('sets the spatie team id when a tenant is set', function () {
    $tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme', 'status' => 'active']);
    $manager = app(TenantManager::class);

    $manager->set($tenant);

    expect(app(PermissionRegistrar::class)->getPermissionsTeamId())->toBe($tenant->id);
});

it('clears the spatie team id when the tenant is forgotten', function () {
    $tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme', 'status' => 'active']);
    $manager = app(TenantManager::class);

    $manager->set($tenant);
    $manager->forget();

    expect(app(PermissionRegistrar::class)->getPermissionsTeamId())->toBeNull();
});

it('keeps the spatie team id in sync through runAs, including on restore', function () {
    $a = Tenant::create(['name' => 'A', 'slug' => 'a', 'status' => 'active']);
    $b = Tenant::create(['name' => 'B', 'slug' => 'b', 'status' => 'active']);
    $manager = app(TenantManager::class);
    $manager->set($a);

    $manager->runAs($b, function () use ($b) {
        expect(app(PermissionRegistrar::class)->getPermissionsTeamId())->toBe($b->id);
    });

    expect(app(PermissionRegistrar::class)->getPermissionsTeamId())->toBe($a->id);
});
