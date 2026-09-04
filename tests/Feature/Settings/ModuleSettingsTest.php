<?php

use App\Authorization\DefaultRoleProvisioner;
use App\Models\BusinessSetting;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use Database\Seeders\PermissionSeeder;

/**
 * Point 2 of the post-RBAC roadmap: let a tenant admin turn off whole
 * sections (Créditos, Proveedores, Finanzas) the business doesn't use —
 * independent of the permission system, see BusinessSetting::MODULE_DEFAULTS.
 */
uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    $this->seed(PermissionSeeder::class);
    $this->tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme', 'status' => 'active']);
    app(DefaultRoleProvisioner::class)->seedFor($this->tenant);

    $this->admin = app(TenantManager::class)->runAs($this->tenant, function () {
        $user = User::create([
            'name' => 'Admin', 'email' => 'admin@acme.test', 'password' => bcrypt('x'),
            'role' => 'administrador', 'status' => true, 'email_verified_at' => now(),
        ]);
        $user->assignRole(DefaultRoleProvisioner::ADMINISTRADOR);

        return $user;
    });

    $this->seller = app(TenantManager::class)->runAs($this->tenant, function () {
        $user = User::create([
            'name' => 'Seller', 'email' => 'seller@acme.test', 'password' => bcrypt('x'),
            'role' => 'vendedor', 'status' => true, 'email_verified_at' => now(),
        ]);
        $user->assignRole(DefaultRoleProvisioner::VENDEDOR);

        return $user;
    });
});

it('defaults every module to enabled when no settings row overrides it', function () {
    app(TenantManager::class)->runAs($this->tenant, function () {
        expect(BusinessSetting::moduleEnabled('credits'))->toBeTrue();
        expect(BusinessSetting::moduleEnabled('suppliers'))->toBeTrue();
        expect(BusinessSetting::moduleEnabled('finances'))->toBeTrue();
        // Unknown keys default true too — only an explicit false turns a module off.
        expect(BusinessSetting::moduleEnabled('not_a_real_module'))->toBeTrue();
    });
});

it('lets an admin view the modules settings page', function () {
    $response = $this->actingAs($this->admin)->get(route('settings.modules'));

    $response->assertOk();
    expect($response->viewData('page')['props']['moduleConfig'])->toBe([
        'credits' => true, 'suppliers' => true, 'finances' => true,
    ]);
});

it('persists module toggles', function () {
    $response = $this->actingAs($this->admin)->post(route('settings.modules.update'), [
        'modules' => ['credits' => false, 'suppliers' => true, 'finances' => false],
    ]);

    $response->assertRedirect();

    app(TenantManager::class)->runAs($this->tenant, function () {
        expect(BusinessSetting::moduleEnabled('credits'))->toBeFalse();
        expect(BusinessSetting::moduleEnabled('suppliers'))->toBeTrue();
        expect(BusinessSetting::moduleEnabled('finances'))->toBeFalse();
    });
});

it('merges a partial update onto the existing config instead of replacing it', function () {
    app(TenantManager::class)->runAs(
        $this->tenant,
        fn () => BusinessSetting::getSettings()->update(['module_config' => ['credits' => false, 'suppliers' => false]]),
    );

    // Submit only `credits` — `suppliers` must stay disabled, not silently revert to enabled.
    $this->actingAs($this->admin)->post(route('settings.modules.update'), [
        'modules' => ['credits' => true],
    ]);

    app(TenantManager::class)->runAs($this->tenant, function () {
        expect(BusinessSetting::moduleEnabled('credits'))->toBeTrue();
        expect(BusinessSetting::moduleEnabled('suppliers'))->toBeFalse();
    });
});

it('ignores keys that are not real toggle-able modules', function () {
    $this->actingAs($this->admin)->post(route('settings.modules.update'), [
        'modules' => ['credits' => false, 'not_a_real_module' => false],
    ]);

    app(TenantManager::class)->runAs($this->tenant, function () {
        $config = BusinessSetting::getSettings()->getModuleConfig();
        expect($config)->not->toHaveKey('not_a_real_module');
        expect($config['credits'])->toBeFalse();
    });
});

it('blocks a seller from viewing or updating module settings', function () {
    $this->actingAs($this->seller)->get(route('settings.modules'))->assertForbidden();
    $this->actingAs($this->seller)->post(route('settings.modules.update'), [
        'modules' => ['credits' => false],
    ])->assertForbidden();
});

it('404s the credits routes when the credits module is disabled', function () {
    app(TenantManager::class)->runAs(
        $this->tenant,
        fn () => BusinessSetting::getSettings()->update(['module_config' => ['credits' => false]]),
    );

    $this->actingAs($this->admin)->get(route('credits.index'))->assertNotFound();
});

it('404s the suppliers routes when the suppliers module is disabled', function () {
    app(TenantManager::class)->runAs(
        $this->tenant,
        fn () => BusinessSetting::getSettings()->update(['module_config' => ['suppliers' => false]]),
    );

    $this->actingAs($this->admin)->get(route('suppliers.index'))->assertNotFound();
});

it('404s the finances routes when the finances module is disabled', function () {
    app(TenantManager::class)->runAs(
        $this->tenant,
        fn () => BusinessSetting::getSettings()->update(['module_config' => ['finances' => false]]),
    );

    $this->actingAs($this->admin)->get(route('finances.summary'))->assertNotFound();
    $this->actingAs($this->admin)->get(route('expenses.index'))->assertNotFound();
});

it('leaves credits, suppliers and finances reachable when their modules stay enabled', function () {
    $this->actingAs($this->admin)->get(route('credits.index'))->assertOk();
    $this->actingAs($this->admin)->get(route('suppliers.index'))->assertOk();
    $this->actingAs($this->admin)->get(route('finances.summary'))->assertOk();
});
