<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Tenancy\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the current tenant from the authenticated user and sets it on the
 * TenantManager. Must run AFTER auth and BEFORE anything that reads tenant data
 * (e.g. the Inertia share of business settings).
 *
 * Behaviour:
 * - Guest / SuperAdmin (no tenant_id) → no tenant is set (scope stays open).
 * - Suspended tenant → 403 (blocks access to a disabled business).
 *
 * NOTE: not yet appended to the web middleware stack — users.tenant_id arrives
 * in PR-2 and the trait is applied in PR-4. Registered as alias `tenant` for use
 * once those land. Until then it is a safe no-op even if invoked.
 */
class IdentifyTenant
{
    public function __construct(private TenantManager $tenants) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $tenantId = $user?->tenant_id;

        if ($tenantId) {
            $tenant = Tenant::find($tenantId);

            if ($tenant && $tenant->isSuspended()) {
                abort(403, 'Esta cuenta está suspendida. Contacta al administrador.');
            }

            $this->tenants->set($tenant);
        }

        return $next($request);
    }
}
