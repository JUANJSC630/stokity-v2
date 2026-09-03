<?php

namespace App\Console\Commands;

use App\Authorization\DefaultRoleProvisioner;
use App\Models\Tenant;
use App\Tenancy\TenantManager;
use Illuminate\Console\Command;

/**
 * PR-2 data migration step: seeds the 3 default roles (Administrador,
 * Encargado, Vendedor) for every existing tenant, or a single one via
 * --tenant=ID. Assigning the roles to existing USERS is a separate,
 * deliberately manual step (roles:assign-legacy) — see
 * ROLES_PERMISSIONS_ARCHITECTURE.md §8 (Bloque 9 / PR-2).
 *
 * Idempotent: safe to re-run after adding a permission to the catalog —
 * DefaultRoleProvisioner::seedFor() re-syncs each role's permission set
 * without creating duplicates or touching custom roles.
 */
class SeedDefaultRoles extends Command
{
    protected $signature = 'roles:seed-defaults {--tenant= : Only seed this tenant ID; omit to seed every active tenant}';

    protected $description = 'Seed the 3 default roles (Administrador, Encargado, Vendedor) for one or all tenants';

    public function handle(DefaultRoleProvisioner $provisioner, TenantManager $tenants): int
    {
        $allTenants = $this->option('tenant')
            ? Tenant::where('id', $this->option('tenant'))->get()
            : Tenant::all();

        if ($allTenants->isEmpty()) {
            $this->error('No matching tenant found.');

            return self::FAILURE;
        }

        // seedFor() sets Spatie's permission team id directly and never resets
        // it — runAs() is what guarantees it's restored (to whatever it was
        // before, e.g. null in this console context) once the loop finishes,
        // instead of leaking the last-processed tenant's id for the rest of
        // this process (see TenantManager's own docblock on this invariant).
        $this->withProgressBar($allTenants, function (Tenant $tenant) use ($provisioner, $tenants) {
            $tenants->runAs($tenant, fn () => $provisioner->seedFor($tenant));
        });

        $this->newLine(2);
        $this->info("Seeded default roles for {$allTenants->count()} tenant(s).");

        return self::SUCCESS;
    }
}
