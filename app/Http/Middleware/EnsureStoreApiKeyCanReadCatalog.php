<?php

namespace App\Http\Middleware;

use App\Models\TenantApiKey;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gates the storefront API's GET surface behind TenantApiKey::$can_read_catalog.
 * The column defaults to true so every key issued before it existed keeps
 * reading; only an "orders-only" key (see store:keys:create) is issued with
 * false, so a key that lives next to the checkout can mint order references
 * but cannot be used to scrape the catalog.
 *
 * Must run after `store.api.key` (ResolveTenantFromApiKey) — see routes/api.php.
 */
class EnsureStoreApiKeyCanReadCatalog
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var TenantApiKey|null $apiKey */
        $apiKey = $request->attributes->get('storeApiKey');

        if (! $apiKey?->can_read_catalog) {
            return new JsonResponse(['message' => 'Esta API key no tiene permiso para leer el catálogo.'], 403);
        }

        return $next($request);
    }
}
