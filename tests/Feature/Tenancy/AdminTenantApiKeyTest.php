<?php

use App\Models\Tenant;
use App\Models\TenantApiKey;
use App\Models\User;
use App\Tenancy\TenantManager;
use App\Tenancy\TenantProvisioner;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

/**
 * Storefront API key management from the SuperAdmin panel
 * (Admin\TenantApiKeyController). Covers the regression this suite exists
 * for: HandleInertiaRequests' `flash` prop is an explicit whitelist of
 * session keys, and `plainApiKey` was missing from it — the key was
 * generated correctly, but the one-time reveal modal never got the data to
 * show, so nobody could ever copy a newly generated key.
 */
uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(PermissionSeeder::class));

afterEach(fn () => app(TenantManager::class)->forget());

function apiKeySuperAdmin(): User
{
    return User::create([
        'name' => 'Owner',
        'email' => 'owner-apikeys@platform.test',
        'password' => Hash::make('password123'),
        'role' => User::ROLE_SUPER_ADMIN,
        'status' => true,
        'email_verified_at' => now(),
    ]);
}

it('flashes the plaintext key to the Inertia props on generate', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Lu Accesorios',
        'branch_name' => 'Principal',
        'admin_name' => 'Lu Admin',
        'admin_email' => 'lu@accesorios.test',
        'admin_password' => 'password123',
    ]);

    $admin = apiKeySuperAdmin();

    $this->actingAs($admin)
        ->from("/admin/tenants/{$tenant->id}")
        ->post("/admin/tenants/{$tenant->id}/api-keys", ['name' => 'Storefront prod'])
        ->assertRedirect("/admin/tenants/{$tenant->id}");

    // Follow the redirect the way the browser/Inertia would, and assert the
    // plaintext key actually reaches the page's flash props — this is
    // exactly the step that silently failed before HandleInertiaRequests
    // whitelisted 'plainApiKey' (the key was generated fine either way; only
    // the one-time reveal modal never received the data to show).
    $page = $this->actingAs($admin)
        ->get("/admin/tenants/{$tenant->id}")
        ->viewData('page')['props'];

    expect($page['flash']['plainApiKey'] ?? null)
        ->not->toBeNull()
        ->toStartWith('sk_store_');

    $key = TenantApiKey::where('tenant_id', $tenant->id)->first();
    expect($key)->not->toBeNull();
    expect($key->name)->toBe('Storefront prod');
    // Regression: key_prefix used to be the literal "sk_store" for every
    // key (an 8-char slice of a 9-char constant prefix) — assert it now
    // carries real entropy past the constant part.
    expect($key->key_prefix)->not->toBe('sk_store');
    expect($key->key_prefix)->toStartWith('sk_store_');
});

it('defaults a new key to can_manage_media=false when the checkbox is not checked', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Lu Accesorios Scope',
        'branch_name' => 'Principal',
        'admin_name' => 'Lu Admin',
        'admin_email' => 'lu-scope@accesorios.test',
        'admin_password' => 'password123',
    ]);

    $this->actingAs(apiKeySuperAdmin())
        ->post("/admin/tenants/{$tenant->id}/api-keys", ['name' => 'Read-only key'])
        ->assertRedirect();

    $key = TenantApiKey::where('tenant_id', $tenant->id)->first();
    expect($key->can_manage_media)->toBeFalse();
});

it('grants can_manage_media when the checkbox is checked at generation time', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Lu Accesorios Scoped Grant',
        'branch_name' => 'Principal',
        'admin_name' => 'Lu Admin',
        'admin_email' => 'lu-scoped-grant@accesorios.test',
        'admin_password' => 'password123',
    ]);

    $this->actingAs(apiKeySuperAdmin())
        ->post("/admin/tenants/{$tenant->id}/api-keys", ['name' => 'Media key', 'can_manage_media' => true])
        ->assertRedirect();

    $key = TenantApiKey::where('tenant_id', $tenant->id)->first();
    expect($key->can_manage_media)->toBeTrue();
});

it('defaults a new key to can_generate_order_references=false when the checkbox is not checked', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Lu Accesorios Order Scope',
        'branch_name' => 'Principal',
        'admin_name' => 'Lu Admin',
        'admin_email' => 'lu-order-scope@accesorios.test',
        'admin_password' => 'password123',
    ]);

    $this->actingAs(apiKeySuperAdmin())
        ->post("/admin/tenants/{$tenant->id}/api-keys", ['name' => 'Read-only key'])
        ->assertRedirect();

    $key = TenantApiKey::where('tenant_id', $tenant->id)->first();
    expect($key->can_generate_order_references)->toBeFalse();
});

it('grants can_generate_order_references when the checkbox is checked, independently of can_manage_media', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Lu Accesorios Order Grant',
        'branch_name' => 'Principal',
        'admin_name' => 'Lu Admin',
        'admin_email' => 'lu-order-grant@accesorios.test',
        'admin_password' => 'password123',
    ]);

    $this->actingAs(apiKeySuperAdmin())
        ->post("/admin/tenants/{$tenant->id}/api-keys", ['name' => 'Order ref key', 'can_generate_order_references' => true])
        ->assertRedirect();

    $key = TenantApiKey::where('tenant_id', $tenant->id)->first();
    expect($key->can_generate_order_references)->toBeTrue();
    expect($key->can_manage_media)->toBeFalse();
});

it('revokes a key so it stops authenticating, and lists it as revoked', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Lu Accesorios 2',
        'branch_name' => 'Principal',
        'admin_name' => 'Lu Admin',
        'admin_email' => 'lu2@accesorios.test',
        'admin_password' => 'password123',
    ]);

    $generated = TenantApiKey::generate($tenant, 'to revoke');

    $this->actingAs(apiKeySuperAdmin())
        ->delete("/admin/tenants/{$tenant->id}/api-keys/{$generated['key']->id}")
        ->assertRedirect();

    expect($generated['key']->fresh()->revoked_at)->not->toBeNull();

    $this->withHeader('Authorization', 'Bearer '.$generated['plainTextKey'])
        ->getJson('/api/v1/store/products')
        ->assertUnauthorized();
});

it('404s revoking another tenant key', function () {
    $tenantA = Tenant::create(['name' => 'ta-keys', 'slug' => 'ta-keys', 'status' => 'active']);
    $tenantB = Tenant::create(['name' => 'tb-keys', 'slug' => 'tb-keys', 'status' => 'active']);

    $keyB = TenantApiKey::generate($tenantB, 'belongs to B')['key'];

    $this->actingAs(apiKeySuperAdmin())
        ->delete("/admin/tenants/{$tenantA->id}/api-keys/{$keyB->id}")
        ->assertNotFound();

    expect($keyB->fresh()->revoked_at)->toBeNull();
});

function webStoreTenant(string $name): Tenant
{
    return app(TenantProvisioner::class)->create([
        'business_name' => $name,
        'branch_name' => 'Principal',
        'admin_name' => 'Admin',
        'admin_email' => str($name)->slug().'@web-store.test',
        'admin_password' => 'password123',
    ]);
}

it('enables the web store when the first key is generated, but not on later keys after a switch off', function () {
    $tenant = webStoreTenant('Switch Primera');
    $admin = apiKeySuperAdmin();
    expect($tenant->fresh()->web_store_enabled)->toBeFalse();

    $this->actingAs($admin)->post("/admin/tenants/{$tenant->id}/api-keys", ['name' => 'Primera'])->assertRedirect();
    expect($tenant->fresh()->web_store_enabled)->toBeTrue();

    $this->actingAs($admin)->put("/admin/tenants/{$tenant->id}/web-store", ['enabled' => false])->assertRedirect();
    $this->actingAs($admin)->post("/admin/tenants/{$tenant->id}/api-keys", ['name' => 'Segunda'])->assertRedirect();
    expect($tenant->fresh()->web_store_enabled)->toBeFalse();
});

it('switches the web store without revoking any key and only changes the UI flag', function () {
    $tenant = webStoreTenant('Switch Llaves');
    $admin = apiKeySuperAdmin();
    $this->actingAs($admin)->post("/admin/tenants/{$tenant->id}/api-keys", ['name' => 'Key'])->assertRedirect();

    $this->actingAs($admin)->put("/admin/tenants/{$tenant->id}/web-store", ['enabled' => false])->assertRedirect()->assertSessionHas('success');

    $fresh = $tenant->fresh();
    expect($fresh->web_store_enabled)->toBeFalse()
        ->and($fresh->hasWebStore())->toBeFalse()
        ->and(TenantApiKey::where('tenant_id', $tenant->id)->whereNull('revoked_at')->count())->toBe(1);

    $this->actingAs($admin)->put("/admin/tenants/{$tenant->id}/web-store", ['enabled' => true])->assertRedirect();
    expect($tenant->fresh()->hasWebStore())->toBeTrue();
});

it('does not count the switch as a web store without an active key', function () {
    $tenant = webStoreTenant('Switch Sin Llave');
    $this->actingAs(apiKeySuperAdmin())->put("/admin/tenants/{$tenant->id}/web-store", ['enabled' => true])->assertRedirect();

    expect($tenant->fresh()->hasWebStore())->toBeFalse();
});

it('validates the switch payload and forbids non super admins', function () {
    $tenant = webStoreTenant('Switch Validacion');

    $this->actingAs(apiKeySuperAdmin())->put("/admin/tenants/{$tenant->id}/web-store", [])->assertSessionHasErrors('enabled');

    $tenantAdmin = User::where('tenant_id', $tenant->id)->first();
    $this->actingAs($tenantAdmin)->put("/admin/tenants/{$tenant->id}/web-store", ['enabled' => true])->assertForbidden();
    expect($tenant->fresh()->web_store_enabled)->toBeFalse();
});
