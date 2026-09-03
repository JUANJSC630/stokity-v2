<?php

use App\Authorization\DefaultRoleProvisioner;
use App\Models\Branch;
use App\Models\CashSession;
use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use Database\Seeders\PermissionSeeder;

/**
 * PR-4's second half: converting the controller-level permission checks
 * left over from PR-3. Each test here is a bug the review pass caught in
 * DefaultRoleProvisioner's default sets — permissions the catalog granted
 * Encargado that today's actual controller code does NOT — verified with
 * real Spatie roles over real HTTP routes, not just the catalog's own unit
 * tests, since a catalog test can't see a controller drifting from it.
 */
uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    $this->seed(PermissionSeeder::class);
    $this->tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme', 'status' => 'active']);
    app(DefaultRoleProvisioner::class)->seedFor($this->tenant);

    $this->branch = app(TenantManager::class)->runAs($this->tenant, fn () => Branch::create([
        'name' => 'Principal', 'business_name' => 'Acme', 'address' => 'x', 'phone' => 'x', 'status' => true,
    ]));
});

function roleUser(Tenant $tenant, Branch $branch, string $legacyRole, string $spatieRole): User
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

it('Encargado cannot edit a completed sale — sales.update stayed admin-only', function () {
    $manager = roleUser($this->tenant, $this->branch, 'encargado', DefaultRoleProvisioner::ENCARGADO);
    $sale = app(TenantManager::class)->runAs($this->tenant, fn () => Sale::factory()->create([
        'branch_id' => $this->branch->id, 'status' => 'completed',
    ]));

    $this->actingAs($manager)->get(route('sales.edit', $sale))->assertForbidden();
    $this->actingAs($manager)->put(route('sales.update', $sale), [])->assertForbidden();
});

it('Administrador can edit a completed sale', function () {
    $admin = roleUser($this->tenant, $this->branch, 'administrador', DefaultRoleProvisioner::ADMINISTRADOR);
    $sale = app(TenantManager::class)->runAs($this->tenant, fn () => Sale::factory()->create([
        'branch_id' => $this->branch->id, 'status' => 'completed',
    ]));

    $this->actingAs($admin)->get(route('sales.edit', $sale))->assertOk();
});

it('Encargado cannot view a cash session opened by someone else, but Administrador can', function () {
    $manager = roleUser($this->tenant, $this->branch, 'encargado', DefaultRoleProvisioner::ENCARGADO);
    $admin = roleUser($this->tenant, $this->branch, 'administrador', DefaultRoleProvisioner::ADMINISTRADOR);
    $session = app(TenantManager::class)->runAs($this->tenant, function () {
        $someoneElse = User::factory()->create(['role' => 'vendedor', 'branch_id' => $this->branch->id]);

        return CashSession::create([
            'branch_id' => $this->branch->id, 'opened_by_user_id' => $someoneElse->id,
            'status' => 'open', 'opening_amount' => 0, 'opened_at' => now(),
        ]);
    });

    $this->actingAs($manager)->get(route('cash-sessions.show', $session))->assertForbidden();
    $this->actingAs($admin)->get(route('cash-sessions.show', $session))->assertOk();
});

it('Encargado CAN still close a session opened by someone else — backed by cash_sessions.close_any (PR-6)', function () {
    $manager = roleUser($this->tenant, $this->branch, 'encargado', DefaultRoleProvisioner::ENCARGADO);
    $session = app(TenantManager::class)->runAs($this->tenant, function () {
        $someoneElse = User::factory()->create(['role' => 'vendedor', 'branch_id' => $this->branch->id]);

        return CashSession::create([
            'branch_id' => $this->branch->id, 'opened_by_user_id' => $someoneElse->id,
            'status' => 'open', 'opening_amount' => 0, 'opened_at' => now(),
        ]);
    });

    $this->actingAs($manager)->get(route('cash-sessions.close.form', $session))->assertOk();
});

it('products payload keeps purchase_price for Encargado, hides it for Vendedor — via can() now, not isAdmin/isManager', function () {
    $manager = roleUser($this->tenant, $this->branch, 'encargado', DefaultRoleProvisioner::ENCARGADO);
    $seller = roleUser($this->tenant, $this->branch, 'vendedor', DefaultRoleProvisioner::VENDEDOR);
    app(TenantManager::class)->runAs($this->tenant, fn () => Product::factory()->create([
        'branch_id' => $this->branch->id, 'purchase_price' => 1234,
    ]));

    $this->actingAs($manager)->get(route('products.index'))
        ->assertInertia(fn ($page) => $page->has('products.data.0.purchase_price'));

    $this->actingAs($seller)->get(route('products.index'))
        ->assertInertia(fn ($page) => $page->missing('products.data.0.purchase_price'));
});

function customRoleUser(Tenant $tenant, Branch $branch, array $permissions): User
{
    return app(TenantManager::class)->runAs($tenant, function () use ($branch, $permissions) {
        $role = \Spatie\Permission\Models\Role::create(['name' => 'Custom '.uniqid(), 'guard_name' => 'web'])
            ->syncPermissions($permissions);
        $user = User::create([
            'name' => 'Custom', 'email' => uniqid().'@acme.test', 'password' => bcrypt('x'),
            'role' => 'encargado', 'branch_id' => $branch->id, 'status' => true, 'email_verified_at' => now(),
        ]);
        $user->assignRole($role);

        return $user;
    });
}

it('a custom data_scope=all role WITHOUT cash_sessions.close_any cannot close someone else\'s session', function () {
    // Regression: legacyStringForRole() (PR-6) approximates any data_scope
    // ='all' custom role as legacy 'administrador' for the handful of
    // isAdmin()-based checks not yet migrated to permissions — this proved
    // CashSessionController::closeForm()/close() were still gating on
    // isAdmin()||isManager() instead of a real permission, so ANY
    // data_scope=all custom role (e.g. a read-only "Auditor") would have
    // inherited the ability to close any user's cash session with zero
    // explicit grant. Fixed by converting to cash_sessions.close_any.
    $auditor = customRoleUser($this->tenant, $this->branch, ['dashboard.view', 'reports.view', 'finances.view']);
    app(TenantManager::class)->runAs($this->tenant, fn () => $auditor->roles()->first()->update(['data_scope' => 'all']));
    $session = app(TenantManager::class)->runAs($this->tenant, function () {
        $someoneElse = User::factory()->create(['role' => 'vendedor', 'branch_id' => $this->branch->id]);

        return CashSession::create([
            'branch_id' => $this->branch->id, 'opened_by_user_id' => $someoneElse->id,
            'status' => 'open', 'opening_amount' => 0, 'opened_at' => now(),
        ]);
    });

    $this->actingAs($auditor)->get(route('cash-sessions.close.form', $session))->assertForbidden();
});

it('a custom role holding only products.create cannot delete/restore/sync-suppliers/adjust-stock — the route gate is not a backstop for those', function () {
    // Route middleware only checks products.create (the group-wide gate,
    // shared with edit/show/update). The actual per-action permission is
    // enforced inside each controller method — this proves that backstop
    // exists for every mutating action the catalog declares its own
    // permission for, not just products.create/update.
    $creatorOnly = customRoleUser($this->tenant, $this->branch, ['products.view', 'products.create']);
    $product = app(TenantManager::class)->runAs($this->tenant, fn () => Product::factory()->create([
        'branch_id' => $this->branch->id, 'stock' => 0,
    ]));

    $this->actingAs($creatorOnly)->delete(route('products.destroy', $product))->assertForbidden();
    $this->actingAs($creatorOnly)->put(route('products.restore', $product->id))->assertForbidden();
    $this->actingAs($creatorOnly)->post(route('products.sync-suppliers', $product), ['suppliers' => []])->assertForbidden();
    $this->actingAs($creatorOnly)->post(route('products.update-stock', $product), ['stock' => 5, 'operation' => 'set'])->assertForbidden();
});

it('a custom role holding only categories.view cannot create/update/delete/restore categories — CategoryRequest/CategoryController backstops', function () {
    // CategoryRequest::authorize() and CategoryController used to defer
    // entirely to the route's categories.view gate — the same class of gap
    // CodeRabbit flagged for products, fixed the same way here.
    $viewerOnly = customRoleUser($this->tenant, $this->branch, ['categories.view']);
    $category = app(TenantManager::class)->runAs($this->tenant, fn () => Category::factory()->create());

    $this->actingAs($viewerOnly)->post(route('categories.store'), ['name' => 'Nope'])->assertForbidden();
    $this->actingAs($viewerOnly)->put(route('categories.update', $category), ['name' => 'Nope'])->assertForbidden();
    $this->actingAs($viewerOnly)->delete(route('categories.destroy', $category))->assertForbidden();
});

it('a custom role explicitly granted products.delete can delete a product with zero stock', function () {
    $deleter = customRoleUser($this->tenant, $this->branch, ['products.view', 'products.create', 'products.delete']);
    $product = app(TenantManager::class)->runAs($this->tenant, fn () => Product::factory()->create([
        'branch_id' => $this->branch->id, 'stock' => 0,
    ]));

    $this->actingAs($deleter)->delete(route('products.destroy', $product))->assertRedirect(route('products.index'));
});

it('a custom role can be granted sales.update without touching any controller', function () {
    // The actual point of moving these to can(): a tenant admin building
    // "Encargado Senior" who CAN edit completed sales just adds the permission.
    $seniorManager = roleUser($this->tenant, $this->branch, 'encargado', DefaultRoleProvisioner::ENCARGADO);
    app(TenantManager::class)->runAs($this->tenant, fn () => $seniorManager->givePermissionTo('sales.update'));
    $sale = app(TenantManager::class)->runAs($this->tenant, fn () => Sale::factory()->create([
        'branch_id' => $this->branch->id, 'status' => 'completed',
    ]));

    $this->actingAs($seniorManager)->get(route('sales.edit', $sale))->assertOk();
});
