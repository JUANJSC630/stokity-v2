<?php

namespace App\Models\Concerns;

use App\Models\Tenant;
use App\Tenancy\TenantManager;
use App\Tenancy\TenantScope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Apply to any model that belongs to a tenant.
 *
 * - Adds the global TenantScope so all queries are filtered by the current tenant.
 * - Auto-stamps tenant_id on create from the current tenant context.
 *
 * NOTE: not applied to any model yet (that is PR-4). The trait lives here so the
 * infrastructure is complete and testable.
 *
 * @property int $tenant_id
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope);

        static::creating(function ($model) {
            $manager = app(TenantManager::class);

            if (empty($model->tenant_id) && $manager->check()) {
                $model->tenant_id = $manager->id();
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Query helper to bypass the tenant scope.
     * ONLY for super-admin / maintenance code — never in tenant-facing controllers.
     */
    public function scopeAllTenants(Builder $query): Builder
    {
        return $query->withoutGlobalScope(TenantScope::class);
    }
}
