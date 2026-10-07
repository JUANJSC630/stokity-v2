<?php

use App\Models\Branch;
use App\Models\Client;
use App\Models\Sale;
use App\Models\Tenant;
use App\Models\User;
use App\Services\ReportQueryService;
use App\Tenancy\TenantManager;
use Illuminate\Support\Facades\Cache;

/**
 * Data that already crossed tenants (a sale of A whose seller/branch belongs to
 * B, possible while `exists:` rules were unscoped) must not leak B's identity
 * through the report joins.
 */
beforeEach(function () {
    Cache::flush();

    $this->tenantA = Tenant::create(['name' => 'A', 'slug' => 'tenant-a', 'status' => 'active']);
    $this->tenantB = Tenant::create(['name' => 'B', 'slug' => 'tenant-b', 'status' => 'active']);
    $manager = app(TenantManager::class);

    $this->branchB = $manager->runAs($this->tenantB, fn () => Branch::factory()->create(['name' => 'Sucursal de B']));
    $this->sellerB = $manager->runAs($this->tenantB, fn () => User::factory()->create([
        'name' => 'Vendedor de B',
        'email' => 'vendedor-b@example.test',
        'branch_id' => $this->branchB->id,
    ]));

    $manager->runAs($this->tenantA, function () {
        $branchA = Branch::factory()->create(['name' => 'Sucursal de A']);
        $sellerA = User::factory()->create(['name' => 'Vendedor de A', 'email' => 'vendedor-a@example.test', 'branch_id' => $branchA->id]);
        $client = Client::factory()->create();

        Sale::factory()->create(['branch_id' => $branchA->id, 'seller_id' => $sellerA->id, 'client_id' => $client->id, 'status' => 'completed', 'total' => 100, 'date' => now()]);
        Sale::factory()->create(['branch_id' => $this->branchB->id, 'seller_id' => $this->sellerB->id, 'client_id' => $client->id, 'status' => 'completed', 'total' => 500, 'date' => now()]);
    });

    app(TenantManager::class)->set($this->tenantA);

    $this->filters = [
        'date_from' => null, 'date_to' => null, 'branch_id' => null, 'seller_id' => null,
        'category_id' => null, 'status' => 'completed', 'tenant_id' => $this->tenantA->id,
    ];
});

afterEach(fn () => app(TenantManager::class)->forget());

describe('report joins never expose another tenant', function () {
    it('sales by seller leaves out a seller of another tenant', function () {
        $sellers = app(ReportQueryService::class)->getSalesBySeller($this->filters);

        expect($sellers->pluck('email')->all())->toBe(['vendedor-a@example.test']);
    });

    it('sellers performance leaves out a seller of another tenant', function () {
        $sellers = app(ReportQueryService::class)->getSellersPerformance($this->filters);

        expect(collect($sellers)->pluck('email')->all())->toBe(['vendedor-a@example.test']);
    });

    it('sales by branch leaves out a branch of another tenant', function () {
        $branches = app(ReportQueryService::class)->getSalesByBranch($this->filters);

        expect($branches->pluck('name')->all())->toBe(['Sucursal de A']);
    });
});
