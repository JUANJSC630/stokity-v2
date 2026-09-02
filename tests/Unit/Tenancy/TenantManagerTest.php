<?php

use App\Models\Tenant;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('starts with no tenant set', function () {
    $manager = new TenantManager;

    expect($manager->check())->toBeFalse()
        ->and($manager->get())->toBeNull()
        ->and($manager->id())->toBeNull();
});

it('sets and forgets the current tenant', function () {
    $tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme', 'status' => 'active']);
    $manager = new TenantManager;

    $manager->set($tenant);
    expect($manager->check())->toBeTrue()
        ->and($manager->id())->toBe($tenant->id);

    $manager->forget();
    expect($manager->check())->toBeFalse();
});

it('runs a callback under a tenant and restores the previous context', function () {
    $tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme', 'status' => 'active']);
    $manager = new TenantManager;

    $insideId = $manager->runAs($tenant, fn () => $manager->id());

    expect($insideId)->toBe($tenant->id)
        ->and($manager->check())->toBeFalse(); // restored to "no tenant"
});

it('restores the previous tenant after nested runAs', function () {
    $a = Tenant::create(['name' => 'A', 'slug' => 'a', 'status' => 'active']);
    $b = Tenant::create(['name' => 'B', 'slug' => 'b', 'status' => 'active']);
    $manager = new TenantManager;
    $manager->set($a);

    $manager->runAs($b, function () use ($manager, $b) {
        expect($manager->id())->toBe($b->id);
    });

    expect($manager->id())->toBe($a->id); // back to A
});

it('is bound as a singleton in the container', function () {
    expect(app(TenantManager::class))->toBe(app(TenantManager::class));
});

it('treats active and trial tenants as active, suspended as not', function () {
    expect((new Tenant(['status' => 'active']))->isActive())->toBeTrue()
        ->and((new Tenant(['status' => 'trial']))->isActive())->toBeTrue()
        ->and((new Tenant(['status' => 'suspended']))->isActive())->toBeFalse()
        ->and((new Tenant(['status' => 'suspended']))->isSuspended())->toBeTrue();
});
