<?php

namespace App\Console\Commands;

use App\Authorization\DefaultRoleProvisioner;
use App\Models\User;
use App\Tenancy\TenantManager;
use App\Tenancy\TenantScope;
use Illuminate\Console\Command;

/**
 * PR-2 data migration step (Bloque 9): maps each existing user's legacy
 * `role` string column to the matching Spatie role for their tenant, so
 * access after this migration is identical to today — see
 * ROLES_PERMISSIONS_ARCHITECTURE.md §8.
 *
 * Deliberately separate from roles:seed-defaults (which only creates the role
 * rows) and requires those to already exist for the tenant. Skips any user
 * who already holds a Spatie role — safe to re-run, and does not clobber a
 * role assignment made by hand through the future role-management UI.
 *
 * super_admin users are never touched: they operate outside Spatie's teams
 * (see IdentifyTenant) via the isSuperAdmin() check, not roles/permissions.
 */
class AssignLegacyRoles extends Command
{
    protected $signature = 'roles:assign-legacy
                            {--tenant= : Only migrate users of this tenant ID; omit to migrate every tenant}
                            {--dry-run : Report what would change without writing anything}';

    protected $description = 'Assign each existing user the Spatie role matching their legacy role column';

    /** @var array<string, string> */
    private const MAP = [
        'administrador' => DefaultRoleProvisioner::ADMINISTRADOR,
        'encargado' => DefaultRoleProvisioner::ENCARGADO,
        'vendedor' => DefaultRoleProvisioner::VENDEDOR,
    ];

    public function handle(TenantManager $tenants): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $query = User::withoutGlobalScope(TenantScope::class)
            ->whereNotNull('tenant_id')
            ->whereIn('role', array_keys(self::MAP));

        if ($tenantId = $this->option('tenant')) {
            $query->where('tenant_id', $tenantId);
        }

        $users = $query->with('tenant')->get();

        if ($users->isEmpty()) {
            $this->info('No users to migrate.');

            return self::SUCCESS;
        }

        $assigned = 0;
        $skipped = 0;

        foreach ($users as $user) {
            if ($user->tenant === null) {
                $this->warn("Skipping user #{$user->id} ({$user->email}): tenant #{$user->tenant_id} not found.");

                continue;
            }

            $tenants->runAs($user->tenant, function () use ($user, $dryRun, &$assigned, &$skipped) {
                if ($user->roles()->exists()) {
                    $skipped++;

                    return;
                }

                $roleName = self::MAP[$user->role];

                if (! $dryRun) {
                    $user->assignRole($roleName);
                }

                $assigned++;
                $this->line(($dryRun ? '[dry-run] would assign' : 'assigned')." {$roleName} to #{$user->id} ({$user->email}, tenant #{$user->tenant_id})");
            });
        }

        $this->newLine();
        $this->info("Assigned: {$assigned}. Already had a role, skipped: {$skipped}.");

        return self::SUCCESS;
    }
}
