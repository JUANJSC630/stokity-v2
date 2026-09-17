<?php

namespace App\Http\Middleware;

use App\Models\TenantApiKey;
use App\Tenancy\TenantManager;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the tenant for the public storefront API (`api/v1/store/*`) from
 * a bearer API key instead of a logged-in panel user — the API-equivalent
 * of IdentifyTenant, which reads $request->user()->tenant_id instead.
 *
 * Deliberately does NOT reuse IdentifyTenant: that middleware assumes a
 * session-authenticated panel user and would silently run unscoped (see
 * TenantScope's no-op-when-no-tenant behavior) for an anonymous storefront
 * request. Every request through this middleware either resolves to exactly
 * one active tenant or is rejected — never falls through unscoped.
 *
 * Runs entirely outside the `web` middleware group (no session, no CSRF
 * cookie, stateless) — see routes/api.php.
 */
class ResolveTenantFromApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        // Reset first so a persistent runtime (Octane/queues) never leaks
        // context between requests — same guard as IdentifyTenant.
        app(TenantManager::class)->forget();

        $plainTextKey = $request->bearerToken();

        if (! $plainTextKey) {
            return $this->reject('Falta el header Authorization: Bearer <api key>.');
        }

        $apiKey = TenantApiKey::findActiveByPlainKey($plainTextKey);

        if (! $apiKey) {
            return $this->reject('API key inválida o revocada.');
        }

        $tenant = $apiKey->tenant;

        // Tenant hard-deleted while the key still exists, or suspended /
        // trial expired since the key was issued — fail closed rather than
        // let a stale key keep serving a business that shouldn't be live.
        if (! $tenant || ! $tenant->isActive()) {
            return $this->reject('Esta tienda no está disponible en este momento.', 403);
        }

        app(TenantManager::class)->set($tenant);

        // Throttled to avoid a write on every single storefront request —
        // "last used" only needs minute-level precision for the admin UI.
        if (! $apiKey->last_used_at || $apiKey->last_used_at->lt(now()->subMinutes(5))) {
            $apiKey->forceFill(['last_used_at' => now()])->saveQuietly();
        }

        return $next($request);
    }

    private function reject(string $message, int $status = 401): JsonResponse
    {
        return response()->json(['message' => $message], $status);
    }
}
