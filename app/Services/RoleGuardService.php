<?php

namespace App\Services;

use App\Models\Role;
use Illuminate\Support\Facades\DB;

/**
 * Shared "at least one role must keep settings.roles.manage" guard, used by
 * both the tenant-facing role editor (Settings\RoleController, operates on
 * the current tenant) and the super-admin one (Admin\TenantRoleController,
 * operates on an arbitrary tenant via TenantManager::runAs()) — extracted so
 * the two never drift out of sync on this rule.
 *
 * Callers are responsible for the Spatie team-context: hasPermissionTo()
 * and syncPermissions() below resolve against whatever team is ambient at
 * call time (TenantManager::set()/runAs()), this service does not touch it.
 */
class RoleGuardService
{
    /**
     * Update a role's metadata/name/permissions. Returns true if the update
     * was BLOCKED (nothing changed) because it would leave $tenantId with no
     * role able to manage roles.
     *
     * @param  array{name: string, description: string|null, data_scope: string}  $validated
     * @param  array<int, string>  $permissions
     */
    public function updateWithGuard(Role $role, array $validated, array $permissions, int $tenantId): bool
    {
        // Lock the tenant's whole role set for the duration of the guard +
        // mutation: without this, two concurrent requests could each read
        // "someone else still manages roles" as true right before both
        // strip the permission, leaving zero roles that can manage roles.
        return DB::transaction(function () use ($role, $validated, $permissions, $tenantId) {
            $this->lockTenantRoles($tenantId);

            if (! in_array('settings.roles.manage', $permissions, true) && ! $this->anotherRoleStillManagesRoles($role, $tenantId)) {
                return true;
            }

            $role->forceFill([
                'description' => $validated['description'] ?? null,
                'data_scope' => $validated['data_scope'],
            ])->save();

            // System roles (Administrador/Encargado/Vendedor) keep their
            // name locked: DefaultRoleProvisioner::roleNameForLegacy() and
            // UserController match the legacy `role` column by this literal
            // name — renaming here would silently break that sync for every
            // future create/update of a user with that legacy role.
            if (! $role->is_system && $validated['name'] !== $role->name) {
                $role->update(['name' => $validated['name']]);
            }

            $role->syncPermissions($permissions);

            return false;
        });
    }

    /**
     * Delete a role. Returns true if the delete was BLOCKED because it
     * would leave $tenantId with no role able to manage roles.
     */
    public function deleteWithGuard(Role $role, int $tenantId): bool
    {
        // Same lock + guard pattern as updateWithGuard() — see comment there.
        return DB::transaction(function () use ($role, $tenantId) {
            $this->lockTenantRoles($tenantId);

            if ($role->hasPermissionTo('settings.roles.manage') && ! $this->anotherRoleStillManagesRoles($role, $tenantId)) {
                return true;
            }

            $role->delete();

            return false;
        });
    }

    /**
     * Row-locks every role in the tenant, so a concurrent update()/delete()
     * on a different role can't interleave with this one and both see
     * "someone else still manages roles" as true right before each removes
     * the permission — must be called inside the same DB::transaction()
     * that performs the guarded mutation.
     */
    private function lockTenantRoles(int $tenantId): void
    {
        Role::where('tenant_id', $tenantId)->lockForUpdate()->get();
    }

    /**
     * Whether some OTHER role in the tenant (besides $excluding) still
     * holds settings.roles.manage.
     */
    private function anotherRoleStillManagesRoles(Role $excluding, int $tenantId): bool
    {
        return Role::where('tenant_id', $tenantId)
            ->where('id', '!=', $excluding->id)
            ->get()
            ->contains(fn (Role $other) => $other->hasPermissionTo('settings.roles.manage'));
    }
}
