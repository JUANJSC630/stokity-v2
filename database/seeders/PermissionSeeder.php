<?php

namespace Database\Seeders;

use App\Authorization\PermissionCatalog;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

/**
 * Seeds the permissions catalog — global rows, not tenant-scoped (see
 * ROLES_PERMISSIONS_ARCHITECTURE.md §6.3: "permisos globales, roles por
 * tenant"). Safe to run in production and to re-run any time the catalog
 * gains a permission: firstOrCreate() never touches an existing row.
 */
class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        foreach (PermissionCatalog::names() as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
