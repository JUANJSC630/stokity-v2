<?php

namespace App\Tenancy;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Global scope that constrains a model's queries to the current tenant.
 *
 * When no tenant is set in the TenantManager (login, console, super-admin),
 * the scope is a no-op — queries run unfiltered. This is intentional so that
 * authentication by email can find the user before a tenant exists.
 */
class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $manager = app(TenantManager::class);

        if ($manager->check()) {
            $builder->where($model->getTable().'.tenant_id', $manager->id());
        }
    }
}
