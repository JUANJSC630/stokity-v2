<?php

use App\Authorization\DefaultRoleProvisioner;
use App\Models\Branch;
use App\Models\Client;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use Database\Seeders\PermissionSeeder;

/**
 * F1 of PLAN.md: wholesale clients get an automatic discount applied in the
 * POS. Manual flag + a single % per client, admin-only to set.
 */
uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

function wholesaleTestUser(Tenant $tenant, Branch $branch, string $legacyRole, string $spatieRole): User
{
    return app(TenantManager::class)->runAs($tenant, function () use ($branch, $legacyRole, $spatieRole) {
        $user = User::create([
            'name' => 'Test', 'email' => uniqid().'@acme.test', 'password' => bcrypt('x'),
            'role' => $legacyRole, 'branch_id' => $branch->id, 'status' => true, 'email_verified_at' => now(),
        ]);
        $user->assignRole($spatieRole);

        return $user;
    });
}

beforeEach(function () {
    $this->seed(PermissionSeeder::class);
    $this->tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme', 'status' => 'active']);
    app(DefaultRoleProvisioner::class)->seedFor($this->tenant);

    $this->branch = app(TenantManager::class)->runAs($this->tenant, fn () => Branch::create([
        'name' => 'Principal', 'business_name' => 'Acme', 'address' => 'x', 'phone' => 'x', 'status' => true,
    ]));

    $this->admin = wholesaleTestUser($this->tenant, $this->branch, 'administrador', DefaultRoleProvisioner::ADMINISTRADOR);
    $this->encargado = wholesaleTestUser($this->tenant, $this->branch, 'encargado', DefaultRoleProvisioner::ENCARGADO);
});

it('lets an admin create a wholesale client with a discount', function () {
    $response = $this->actingAs($this->admin)->post(route('clients.store'), [
        'name' => 'Distribuidora XYZ', 'document' => '900123456',
        'is_wholesale' => true, 'wholesale_discount_pct' => 15,
    ]);

    $response->assertRedirect();

    app(TenantManager::class)->runAs($this->tenant, function () {
        $client = Client::where('document', '900123456')->first();
        expect($client->is_wholesale)->toBeTrue();
        expect((float) $client->wholesale_discount_pct)->toBe(15.0);
    });
});

it('rejects a wholesale client with no discount percentage', function () {
    $response = $this->actingAs($this->admin)->post(route('clients.store'), [
        'name' => 'Distribuidora XYZ', 'document' => '900123456',
        'is_wholesale' => true,
    ]);

    $response->assertSessionHasErrors('wholesale_discount_pct');
});

it('rejects a discount percentage over 100', function () {
    $response = $this->actingAs($this->admin)->post(route('clients.store'), [
        'name' => 'Distribuidora XYZ', 'document' => '900123456',
        'is_wholesale' => true, 'wholesale_discount_pct' => 150,
    ]);

    $response->assertSessionHasErrors('wholesale_discount_pct');
});

it('silently ignores wholesale fields from an encargado, without blocking the rest of the save', function () {
    $response = $this->actingAs($this->encargado)->post(route('clients.store'), [
        'name' => 'Distribuidora XYZ', 'document' => '900123456',
        'is_wholesale' => true, 'wholesale_discount_pct' => 15,
    ]);

    $response->assertRedirect();

    app(TenantManager::class)->runAs($this->tenant, function () {
        $client = Client::where('document', '900123456')->first();
        expect($client)->not->toBeNull();
        expect($client->is_wholesale)->toBeFalse();
        expect($client->wholesale_discount_pct)->toBeNull();
    });
});

it('lets an admin update an existing client to mark it wholesale', function () {
    $client = app(TenantManager::class)->runAs($this->tenant, fn () => Client::factory()->create(['is_wholesale' => false]));

    $response = $this->actingAs($this->admin)->put(route('clients.update', $client->id), [
        'name' => $client->name, 'document' => $client->document,
        'is_wholesale' => true, 'wholesale_discount_pct' => 20,
    ]);

    $response->assertRedirect();

    app(TenantManager::class)->runAs($this->tenant, function () use ($client) {
        $client->refresh();
        expect($client->is_wholesale)->toBeTrue();
        expect((float) $client->wholesale_discount_pct)->toBe(20.0);
    });
});

it('clears the stale discount percentage when a client is unmarked as wholesale', function () {
    $client = app(TenantManager::class)->runAs($this->tenant, fn () => Client::factory()->create([
        'is_wholesale' => true, 'wholesale_discount_pct' => 20,
    ]));

    // Toggling the flag off but still sending the old percentage (e.g. a
    // form that didn't clear its own field) must not leave it persisted —
    // re-enabling wholesale later should never silently revive an old rate.
    $response = $this->actingAs($this->admin)->put(route('clients.update', $client->id), [
        'name' => $client->name, 'document' => $client->document,
        'is_wholesale' => false, 'wholesale_discount_pct' => 20,
    ]);

    $response->assertRedirect();

    app(TenantManager::class)->runAs($this->tenant, function () use ($client) {
        $client->refresh();
        expect($client->is_wholesale)->toBeFalse();
        expect($client->wholesale_discount_pct)->toBeNull();
    });
});

it('silently ignores wholesale fields when an encargado updates a client', function () {
    $client = app(TenantManager::class)->runAs($this->tenant, fn () => Client::factory()->create([
        'is_wholesale' => true, 'wholesale_discount_pct' => 10,
    ]));

    $response = $this->actingAs($this->encargado)->put(route('clients.update', $client->id), [
        'name' => 'Nuevo nombre', 'document' => $client->document,
        'is_wholesale' => false, 'wholesale_discount_pct' => null,
    ]);

    $response->assertRedirect();

    app(TenantManager::class)->runAs($this->tenant, function () use ($client) {
        $client->refresh();
        expect($client->name)->toBe('Nuevo nombre');
        expect($client->is_wholesale)->toBeTrue();
        expect((float) $client->wholesale_discount_pct)->toBe(10.0);
    });
});

it('includes the wholesale fields in the POS client list', function () {
    app(TenantManager::class)->runAs($this->tenant, fn () => Client::factory()->create([
        'name' => 'Mayorista Uno', 'is_wholesale' => true, 'wholesale_discount_pct' => 12.5,
    ]));

    $response = $this->actingAs($this->admin)->get(route('pos.index'));

    $response->assertOk();
    $clientData = collect($response->viewData('page')['props']['clients'])->firstWhere('name', 'Mayorista Uno');
    expect($clientData['is_wholesale'])->toBeTrue();
    expect((float) $clientData['wholesale_discount_pct'])->toBe(12.5);
});
