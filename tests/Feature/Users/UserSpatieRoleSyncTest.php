<?php

use App\Authorization\DefaultRoleProvisioner;
use App\Models\Branch;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use Database\Seeders\PermissionSeeder;

/**
 * roles:assign-legacy is a one-time backfill — every user created or edited
 * from here on must get its Spatie role from UserController itself, or it
 * silently drifts from what the "Rol" field in the UI claims. This is the
 * regression net for that: without it, a brand-new employee has zero real
 * permissions the moment anything actually enforces them (PR-4).
 */
uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    $this->seed(PermissionSeeder::class);
    $this->tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme', 'status' => 'active']);
    app(DefaultRoleProvisioner::class)->seedFor($this->tenant);

    [$this->admin, $this->branch] = app(TenantManager::class)->runAs($this->tenant, function () {
        $branch = Branch::create(['name' => 'Principal', 'business_name' => 'Acme', 'address' => 'x', 'phone' => 'x', 'status' => true]);
        $admin = User::create([
            'name' => 'Admin', 'email' => 'admin@acme.test', 'password' => bcrypt('x'),
            'role' => 'administrador', 'branch_id' => $branch->id, 'status' => true, 'email_verified_at' => now(),
        ]);
        $admin->assignRole(DefaultRoleProvisioner::ADMINISTRADOR);

        return [$admin, $branch];
    });
});

it('assigns the matching Spatie role when creating a user through the UI', function () {
    $vendedorId = app(TenantManager::class)->runAs($this->tenant, fn () => \App\Models\Role::where('name', DefaultRoleProvisioner::VENDEDOR)->first()->id);

    $this->actingAs($this->admin)->post(route('users.store'), [
        'name' => 'Nueva Vendedora',
        'email' => 'vendedora@acme.test',
        'role_id' => $vendedorId,
        'branch_id' => $this->branch->id,
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ])->assertRedirect(route('users.index'));

    app(TenantManager::class)->runAs($this->tenant, function () {
        $created = User::where('email', 'vendedora@acme.test')->first();
        expect($created->hasRole(DefaultRoleProvisioner::VENDEDOR))->toBeTrue()
            ->and($created->dataScope())->toBe('branch');
    });
});

it('re-syncs the Spatie role when an admin changes it, without leaving the old one attached', function () {
    $employee = app(TenantManager::class)->runAs($this->tenant, function () {
        $user = User::create([
            'name' => 'Empleado', 'email' => 'empleado@acme.test', 'password' => bcrypt('x'),
            'role' => 'vendedor', 'branch_id' => $this->branch->id, 'status' => true, 'email_verified_at' => now(),
        ]);
        $user->assignRole(DefaultRoleProvisioner::VENDEDOR);

        return $user;
    });

    $encargadoId = app(TenantManager::class)->runAs($this->tenant, fn () => \App\Models\Role::where('name', DefaultRoleProvisioner::ENCARGADO)->first()->id);

    $this->actingAs($this->admin)->put(route('users.update', $employee), [
        'name' => 'Empleado',
        'email' => 'empleado@acme.test',
        'role_id' => $encargadoId,
        'branch_id' => $this->branch->id,
        'status' => true,
    ])->assertRedirect();

    app(TenantManager::class)->runAs($this->tenant, function () use ($employee) {
        $fresh = $employee->fresh();
        expect($fresh->roles()->pluck('name')->all())->toBe([DefaultRoleProvisioner::ENCARGADO])
            ->and($fresh->hasRole(DefaultRoleProvisioner::VENDEDOR))->toBeFalse();
    });
});

it('clears a stale Branch.manager_id when an Encargado is updated with no branch selected', function () {
    // CodeRabbit PR-15 finding: the old `elseif (! $isSystemEncargado)`
    // never ran when the role stayed Encargado but branch_id was cleared —
    // `elseif` only fired for a role CHANGE, not "same role, branch
    // removed" — leaving the branch's manager_id pointing at a user no
    // longer assigned there.
    $encargadoId = app(TenantManager::class)->runAs($this->tenant, fn () => \App\Models\Role::where('name', DefaultRoleProvisioner::ENCARGADO)->first()->id);

    $manager = app(TenantManager::class)->runAs($this->tenant, function () use ($encargadoId) {
        $user = User::create([
            'name' => 'Manager', 'email' => 'manager@acme.test', 'password' => bcrypt('x'),
            'role' => 'encargado', 'branch_id' => $this->branch->id, 'status' => true, 'email_verified_at' => now(),
        ]);
        $user->assignRole(\App\Models\Role::find($encargadoId));
        $this->branch->update(['manager_id' => $user->id]);

        return $user;
    });

    $this->actingAs($this->admin)->put(route('users.update', $manager), [
        'name' => 'Manager',
        'email' => 'manager@acme.test',
        'role_id' => $encargadoId,
        'branch_id' => '',
        'status' => true,
    ])->assertRedirect();

    app(TenantManager::class)->runAs($this->tenant, function () {
        expect($this->branch->fresh()->manager_id)->toBeNull();
    });
});

it('rejects an update with no role_id — the security backstop behind edit.tsx never defaulting to an admin role', function () {
    // CodeRabbit PR-15 finding: edit.tsx used to default role_id to
    // roles[0] (sorted admin-first) when a user had no role assigned,
    // silently promoting them to Administrador on any unrelated save. The
    // frontend fix stopped defaulting it — this proves the real backstop:
    // the backend has always rejected an empty/missing role_id outright.
    $employee = app(TenantManager::class)->runAs($this->tenant, function () {
        $user = User::create([
            'name' => 'Empleado', 'email' => 'empleado@acme.test', 'password' => bcrypt('x'),
            'role' => 'vendedor', 'branch_id' => $this->branch->id, 'status' => true, 'email_verified_at' => now(),
        ]);
        $user->assignRole(DefaultRoleProvisioner::VENDEDOR);

        return $user;
    });

    $this->actingAs($this->admin)->put(route('users.update', $employee), [
        'name' => 'Empleado',
        'email' => 'empleado@acme.test',
        'role_id' => '',
        'branch_id' => $this->branch->id,
        'status' => true,
    ])->assertInvalid(['role_id']);

    app(TenantManager::class)->runAs($this->tenant, fn () => expect($employee->fresh()->hasRole(DefaultRoleProvisioner::VENDEDOR))->toBeTrue());
});

it('DefaultRoleProvisioner::roleNameForLegacy is the single source both UserController and roles:assign-legacy use', function () {
    expect(DefaultRoleProvisioner::roleNameForLegacy('administrador'))->toBe(DefaultRoleProvisioner::ADMINISTRADOR)
        ->and(DefaultRoleProvisioner::roleNameForLegacy('encargado'))->toBe(DefaultRoleProvisioner::ENCARGADO)
        ->and(DefaultRoleProvisioner::roleNameForLegacy('vendedor'))->toBe(DefaultRoleProvisioner::VENDEDOR)
        ->and(DefaultRoleProvisioner::roleNameForLegacy('super_admin'))->toBeNull();
});
