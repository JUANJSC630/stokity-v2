<?php

use App\Authorization\PermissionCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Guarantees the permission catalog exists after every deploy, without
 * depending on `php artisan db:seed` — Railway's start command only runs
 * `migrate --force` (confirmed via `railway deployment list`), so
 * PermissionSeeder alone would never run in production. Role::syncPermissions()
 * throws PermissionDoesNotExist for any name not yet in this table, which
 * would 500 the very first tenant created through /admin/tenants otherwise.
 *
 * Same idempotent-insert pattern as 2026_06_18_000002 (the tenant backfill):
 * safe to re-run, and re-running after PermissionCatalog gains a new entry
 * (a later deploy) fills in exactly the new rows.
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
        DB::table('permissions')
            ->where('guard_name', 'web')
            ->whereIn('name', PermissionCatalog::names())
            ->delete();
    }
};
