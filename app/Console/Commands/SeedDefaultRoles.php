<?php

namespace App\Console\Commands;

use App\Authorization\DefaultRoleProvisioner;
use App\Models\Tenant;
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

    public function handle(DefaultRoleProvisioner $provisioner): int
    {
        $tenants = $this->option('tenant')
            ? Tenant::where('id', $this->option('tenant'))->get()
            : Tenant::all();

        if ($tenants->isEmpty()) {
            $this->error('No matching tenant found.');

            return self::FAILURE;
        }

        $this->withProgressBar($tenants, function (Tenant $tenant) use ($provisioner) {
            $provisioner->seedFor($tenant);
        });

        $this->newLine(2);
        $this->info("Seeded default roles for {$tenants->count()} tenant(s).");

        return self::SUCCESS;
    }
}
