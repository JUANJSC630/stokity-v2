<?php

use App\Models\Branch;
use App\Models\Client;
use App\Models\PaymentMethod;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use App\Tenancy\TenantProvisioner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

afterEach(fn () => app(TenantManager::class)->forget());

function superAdmin(): User
{
    return User::create([
        'name' => 'Owner',
        'email' => 'owner@platform.test',
        'password' => Hash::make('password123'),
        'role' => User::ROLE_SUPER_ADMIN,
        'status' => true,
        'email_verified_at' => now(),
    ]);
}

it('provisions a full tenant world', function () {
    $tenant = app(TenantProvisioner::class)->create([
        'business_name' => 'Café Central',
        'admin_name' => 'Ana Admin',
        'admin_email' => 'ana@cafe.test',
        'admin_password' => 'password123',
    ]);

    expect($tenant->slug)->toBe('cafe-central')
        ->and($tenant->status)->toBe('active');

    $scoped = fn (string $model) => $model::withoutGlobalScopes()->where('tenant_id', $tenant->id);

    expect($scoped(Branch::class)->count())->toBe(1)
        ->and($scoped(PaymentMethod::class)->count())->toBe(6)
        ->and($scoped(Client::class)->where('name', 'Consumidor Final')->count())->toBe(1);

    $admin = $scoped(User::class)->first();
    expect($admin->role)->toBe('administrador')
        ->and($admin->email)->toBe('ana@cafe.test')
        ->and($admin->tenant_id)->toBe($tenant->id);
});

it('lets a super admin open the panel', function () {
    $this->actingAs(superAdmin())
        ->get('/admin/tenants')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('admin/tenants/index'));
});

it('forbids a tenant user from the admin panel', function () {
    $tenant = Tenant::create(['name' => 't', 'slug' => 't', 'status' => 'active']);
    $admin = app(TenantManager::class)->runAs($tenant, fn () => User::factory()->create([
        'role' => 'administrador',
        'status' => true,
    ]));

    $this->actingAs($admin)->get('/admin/tenants')->assertForbidden();
});

it('creates a tenant from the panel', function () {
    $this->actingAs(superAdmin())
        ->post('/admin/tenants', [
            'business_name' => 'Tienda X',
            'admin_name' => 'Bob',
            'admin_email' => 'bob@tienda.test',
            'admin_password' => 'password123',
            'admin_password_confirmation' => 'password123',
        ])
        ->assertRedirect('/admin/tenants');

    expect(Tenant::where('slug', 'tienda-x')->exists())->toBeTrue()
        ->and(User::where('email', 'bob@tienda.test')->exists())->toBeTrue();
});

it('disables public registration', function () {
    $this->get('/register')->assertNotFound();
    $this->post('/register', [])->assertNotFound();
});

it('redirects super admin to the admin panel on login', function () {
    superAdmin();

    $this->post('/login', ['email' => 'owner@platform.test', 'password' => 'password123'])
        ->assertRedirect('/admin/tenants');
});

it('keeps the super admin out of tenant routes', function () {
    // No tenant context exists for a super admin, so tenant routes would run
    // unscoped — they are redirected back to the panel instead.
    $this->actingAs(superAdmin())
        ->get('/dashboard')
        ->assertRedirect(route('admin.tenants.index'));
});
