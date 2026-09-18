<?php

namespace App\Http\Middleware;

use App\Models\TenantApiKey;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gates the storefront API's write surface — product image upload/delete
 * and the visibility-toggle endpoint — behind an explicit opt-in scope on
 * the API key (TenantApiKey::$can_manage_media). Without this, any existing
 * read-only key would retroactively gain write access the moment these
 * routes were added, which is exactly what the scope column exists to
 * prevent — see that column's migration.
 *
 * Must run after `store.api.key` (ResolveTenantFromApiKey), which is what
 * populates the `storeApiKey` request attribute this reads — see routes/api.php.
 */
class EnsureStoreApiKeyCanManageMedia
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var TenantApiKey|null $apiKey */
        $apiKey = $request->attributes->get('storeApiKey');

        // Explicit JSON, like ResolveTenantFromApiKey::reject() — not
        // abort_unless(), whose HTML-vs-JSON rendering depends on the
        // request's Accept header, which an external storefront integration
        // has no reason to always send correctly.
        if (! $apiKey?->can_manage_media) {
            return new JsonResponse(['message' => 'Esta API key no tiene permiso para gestionar fotos ni visibilidad de productos.'], 403);
        }

        return $next($request);
    }
}
