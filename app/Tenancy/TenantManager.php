<?php

namespace App\Tenancy;

use App\Models\Tenant;
use Spatie\Permission\PermissionRegistrar;

/**
 * Holds the tenant for the current request / process.
 *
 * Registered as a singleton in TenancyServiceProvider. The TenantScope and the
 * BelongsToTenant trait read from here to decide how to filter and stamp models.
 *
 * Also keeps Spatie's "team" (permission.teams, team_foreign_key = tenant_id)
 * in lockstep with the tenant: every place that changes the tenant — HTTP
 * middleware, console commands, TenantProvisioner — goes through set()/
 * runAs(), so role/permission lookups are never accidentally left scoped to
 * the wrong tenant (or unscoped) after a context switch.
 */
class TenantManager
{
    private ?Tenant $tenant = null;

    private ?PermissionRegistrar $permissions = null;

    /**
     * Lazily resolved so `new TenantManager` (used directly in a few tests)
     * keeps working without having to pass every dependency by hand — the
     * container is available by the time set()/forget()/runAs() actually run.
     */
    private function permissions(): PermissionRegistrar
    {
        return $this->permissions ??= app(PermissionRegistrar::class);
    }

    public function set(?Tenant $tenant): void
    {
        $this->tenant = $tenant;
        $this->permissions()->setPermissionsTeamId($tenant?->id);
    }

    public function get(): ?Tenant
    {
        return $this->tenant;
    }

    public function id(): ?int
    {
        return $this->tenant?->id;
    }

    public function check(): bool
    {
        return $this->tenant !== null;
    }

    public function forget(): void
    {
        $this->tenant = null;
        $this->permissions()->setPermissionsTeamId(null);
    }

    /**
     * Run a callback under a specific tenant, restoring the previous one afterwards.
     * Used by jobs, console commands and the super-admin panel.
     *
     * @template TReturn
     *
     * @param  callable():TReturn  $callback
     * @return TReturn
     */
    public function runAs(Tenant $tenant, callable $callback): mixed
    {
        $previousTenant = $this->tenant;
        $previousTeamId = $this->permissions()->getPermissionsTeamId();

        $this->set($tenant);

        try {
            return $callback();
        } finally {
            $this->tenant = $previousTenant;
            $this->permissions()->setPermissionsTeamId($previousTeamId);
        }
    }
}
