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
