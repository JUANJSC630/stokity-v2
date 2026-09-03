<?php

namespace App\Models;

use Spatie\Permission\Models\Role as SpatieRole;

/**
 * Extends Spatie's Role model to add the metadata columns from
 * database/migrations/*_add_metadata_columns_to_roles_table.php — Spatie has
 * no knowledge of is_default/is_system/description/data_scope, so without the
 * casts here is_default/is_system come back as raw DB integers (0/1) instead
 * of booleans.
 *
 * Registered as the active role model in config/permission.php (models.role).
 *
 * @property bool $is_default
 * @property bool $is_system
 * @property string|null $description
 * @property string $data_scope 'all'|'branch'|'own'
 * @property int $tenant_id Spatie's team_foreign_key (config/permission.php)
 *
 * ⚠️  UNLIKE every BelongsToTenant model (Product, Sale, Branch, ...), Role
 * carries NO global tenant scope — deliberately not added here, because
 * Spatie's PermissionRegistrar caches ALL roles across every team globally
 * for performance and filters in-memory per request via
 * getPermissionsTeamId(); a hard SQL-level scope on this model would risk
 * breaking that cache (e.g. mid-loop in roles:seed-defaults, which visits
 * every tenant in one process). Spatie's OWN lookups (findByName(),
 * findById(), findOrCreate(), hasRole(), assignRole()...) go through
 * findByParam() internally, which DOES filter by the current team — so
 * those are always safe. A PLAIN query — `Role::where(...)`, route-model
 * binding via `{role}`, anything that doesn't go through one of Spatie's
 * named finder methods — is NOT filtered and WILL leak every tenant's
 * roles unless you add `->where('tenant_id', app(TenantManager::class)->id())`
 * yourself. This bit RoleController and UserController during PR-6 (three
 * separate spots) — see their tenant_id filters for the pattern to copy.
 */
class Role extends SpatieRole
{
    protected function casts(): array
    {
        return [
            ...parent::casts(),
            'is_default' => 'boolean',
            'is_system' => 'boolean',
        ];
    }
}
