<?php

use App\Authorization\PermissionCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Guarantees the permission catalog exists the moment this app first runs on
 * PHP with the `roles`/`permissions` tables, without depending on
 * `php artisan db:seed` — Railway's start command only runs `migrate --force`
 * (confirmed via `railway deployment list`), so PermissionSeeder alone would
 * never run in production. Role::syncPermissions() throws
 * PermissionDoesNotExist for any name not yet in this table, which would 500
 * the very first tenant created through /admin/tenants otherwise.
 *
 * Laravel never re-runs a migration once it's recorded as applied, so THIS
 * file only ever inserts whatever the catalog looked like at deploy time —
 * it does not catch permissions added in a later PR. That ongoing case is
 * handled instead by DefaultRoleProvisioner::ensurePermissionsExist(), which
 * self-heals any gap the next time a tenant's roles are (re)synced.
 */
return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        $existing = DB::table('permissions')
            ->where('guard_name', 'web')
            ->pluck('name')
            ->all();

        $missing = array_diff(PermissionCatalog::names(), $existing);

        if (empty($missing)) {
            return;
        }

        DB::table('permissions')->insert(array_map(
            fn (string $name) => [
                'name' => $name,
                'guard_name' => 'web',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            array_values($missing),
        ));
    }

    public function down(): void
    {
        // Deliberately a no-op: by the time this could ever roll back, roles
        // may already reference these permissions (role_has_permissions has
        // a cascadeOnDelete FK to permissions.id), and — because up() only
        // ever inserts whatever the catalog looked like when THIS migration
        // was written — deleting "every current PermissionCatalog::names()
        // row" would also remove rows a later migration or
        // ensurePermissionsExist() call created for permissions added since.
        // There is no reliable way to identify "only what this migration
        // inserted" after the fact, so rolling back leaves the catalog as-is.
    }
};
