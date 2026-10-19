<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Tenant;
use App\Models\TenantApiKey;
use App\Models\User;
use App\Tenancy\TenantManager;
use Inertia\Testing\AssertableInertia;

function makeWebStoreTenantAdmin(string $slug): array
{
    $tenant = Tenant::create(['name' => $slug, 'slug' => $slug, 'status' => 'active']);

    $user = app(TenantManager::class)->runAs($tenant, function () {
        BusinessSetting::factory()->create();

        return User::factory()->create([
            'role' => 'administrador',
            'branch_id' => Branch::factory()->create()->id,
            'status' => true,
        ]);
    });

    return [$tenant, $user];
}

it('shares hasWebStore only while the tenant has an active storefront api key', function () {
    [$tenant, $user] = makeWebStoreTenantAdmin('con-tienda');
    $hasWebStore = fn (bool $expected) => $this->actingAs($user)->get(route('dashboard'))
        ->assertInertia(fn (AssertableInertia $page) => $page->where('hasWebStore', $expected));

    $hasWebStore(false);

    $key = app(TenantManager::class)->runAs($tenant, fn () => TenantApiKey::generate($tenant, 'Storefront')['key']);
    $hasWebStore(false);

    $tenant->forceFill(['web_store_enabled' => true])->save();
    $hasWebStore(true);

    $key->revoke();
    $hasWebStore(false);
});

it('does not count another tenant api key as a web store', function () {
    [, $user] = makeWebStoreTenantAdmin('sin-tienda');
    [$other] = makeWebStoreTenantAdmin('otra-tienda');
    $other->forceFill(['web_store_enabled' => true])->save();
    app(TenantManager::class)->runAs($other, fn () => TenantApiKey::generate($other, 'Storefront'));

    $this->actingAs($user)->get(route('dashboard'))
        ->assertInertia(fn (AssertableInertia $page) => $page->where('hasWebStore', false));
});
