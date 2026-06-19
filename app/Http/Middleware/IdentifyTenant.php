<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Tenancy\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the current tenant from the authenticated user and sets it on the
 * TenantManager. Runs before SubstituteBindings (see bootstrap/app.php) so the
 * tenant scope also applies to route-model binding.
 *
 * Behaviour:
 * - Guest (login, password reset, ...) → no tenant set; scope stays open.
 * - SuperAdmin → no tenant; allowed only on /admin and logout, redirected to the
 *   panel elsewhere (no tenant context means unscoped reads / orphaned writes).
 * - Tenant user without tenant_id → no context (only happens in tests; in prod
 *   every tenant user is backfilled).
 * - Tenant user whose tenant is missing → 403 (fail closed, never run unscoped).
 * - Suspended tenant → 403, except logout so the user is not trapped.
 */
class IdentifyTenant
{
    public function __construct(private TenantManager $tenants) {}

    public function handle(Request $request, Closure $next): Response
    {
        // Reset first so a persistent runtime (Octane/queues) never leaks context.
        $this->tenants->forget();

        $user = $request->user();

        // Guests (login, password reset, ...) run with no tenant — that is fine.
        if (! $user) {
            return $next($request);
        }

        // Platform owner operates outside tenants, only inside the /admin area.
        // Anywhere else there is no tenant context, so keep them out to avoid
        // unscoped reads / orphaned writes.
        if ($user->isSuperAdmin()) {
            if ($request->routeIs('admin.*') || $request->routeIs('logout')) {
                return $next($request);
            }

            return redirect()->route('admin.tenants.index');
        }

        // No tenant assigned: in production only the super-admin is tenant-less
        // (handled above), so this is effectively a no-op path. Run without context.
        if (! $user->tenant_id) {
            return $next($request);
        }

        // tenant_id is set but the tenant is missing (e.g. deleted): fail closed
        // rather than fall through and run unscoped.
        $tenant = Tenant::find($user->tenant_id);

        if ($tenant === null) {
            abort(403, 'Tu cuenta no está asociada a un negocio válido.');
        }

        if ($tenant->isSuspended()) {
            // Allow logout so a suspended user is not trapped.
            if ($request->routeIs('logout')) {
                return $next($request);
            }

            abort(403, 'Esta cuenta está suspendida. Contacta al administrador.');
        }

        $this->tenants->set($tenant);

        return $next($request);
    }
}
