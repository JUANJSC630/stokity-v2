<?php

use App\Models\Branch;
use App\Models\Tenant;
use App\Rules\TenantExists;
use App\Tenancy\TenantManager;
use Illuminate\Support\Facades\Validator;

beforeEach(function () {
    $this->tenantA = Tenant::create(['name' => 'A', 'slug' => 'tenant-a', 'status' => 'active']);
    $this->tenantB = Tenant::create(['name' => 'B', 'slug' => 'tenant-b', 'status' => 'active']);

    $this->branchA = app(TenantManager::class)->runAs($this->tenantA, fn () => Branch::factory()->create());
    $this->branchB = app(TenantManager::class)->runAs($this->tenantB, fn () => Branch::factory()->create());
});

afterEach(fn () => app(TenantManager::class)->forget());

function passesBranchRule(int $id): bool
{
    return Validator::make(['branch_id' => $id], ['branch_id' => ['required', TenantExists::in('branches')]])->passes();
}

describe('TenantExists::in', function () {
    it('accepts a row of the current tenant', function () {
        app(TenantManager::class)->set($this->tenantA);

        expect(passesBranchRule($this->branchA->id))->toBeTrue();
    });

    it('rejects a row that exists but belongs to another tenant', function () {
        app(TenantManager::class)->set($this->tenantA);

        expect(passesBranchRule($this->branchB->id))->toBeFalse();
    });

    it('never accepts a tenant-owned row when there is no tenant context', function () {
        app(TenantManager::class)->forget();

        expect(passesBranchRule($this->branchA->id))->toBeFalse();
    });

    it('supports a custom column', function () {
        app(TenantManager::class)->set($this->tenantA);

        $passes = Validator::make(['name' => $this->branchA->name], ['name' => [TenantExists::in('branches', 'name')]])->passes();

        expect($passes)->toBeTrue();
    });
});
