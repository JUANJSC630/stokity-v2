<?php

namespace App\Rules;

use App\Tenancy\TenantManager;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

/**
 * `exists` rule limited to rows of the current tenant.
 *
 * A plain `exists:table,id` hits the database without the TenantScope, so it
 * accepts ids that belong to other tenants and lets a request link its data to
 * rows it must not see. Without a tenant context only untenanted rows match, so a
 * row owned by any tenant is never accepted.
 */
class TenantExists
{
    public static function in(string $table, string $column = 'id'): Exists
    {
        return Rule::exists($table, $column)->where(function ($query) {
            $tenantId = app(TenantManager::class)->id();

            return $tenantId === null
                ? $query->whereNull('tenant_id')
                : $query->where('tenant_id', $tenantId);
        });
    }
}
