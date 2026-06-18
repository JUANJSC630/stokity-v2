<?php

namespace App\Tenancy;

use App\Models\Tenant;

/**
 * Holds the tenant for the current request / process.
 *
 * Registered as a singleton in TenancyServiceProvider. The TenantScope and the
 * BelongsToTenant trait read from here to decide how to filter and stamp models.
 */
class TenantManager
{
    private ?Tenant $tenant = null;

    public function set(?Tenant $tenant): void
    {
        $this->tenant = $tenant;
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
        $previous = $this->tenant;
        $this->tenant = $tenant;

        try {
            return $callback();
        } finally {
            $this->tenant = $previous;
        }
    }
}
