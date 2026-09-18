<?php

namespace App\Http\Middleware;

use App\Models\TenantApiKey;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gates POST /order-reference behind an explicit opt-in scope on the API
 * key (TenantApiKey::$can_generate_order_references) — independent of
 * `can_manage_media`; a key that can manage product photos/visibility does
 * not automatically get to mint order-reference numbers, and vice versa.
 * Same rationale as EnsureStoreApiKeyCanManageMedia: no key gains this
 * retroactively just because the column/route now exist.
 *
 * Must run after `store.api.key` (ResolveTenantFromApiKey), which is what
 * populates the `storeApiKey` request attribute this reads — see routes/api.php.
 */
class EnsureStoreApiKeyCanGenerateOrderReferences
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var TenantApiKey|null $apiKey */
        $apiKey = $request->attributes->get('storeApiKey');

        if (! $apiKey?->can_generate_order_references) {
            return new JsonResponse(['message' => 'Esta API key no tiene permiso para generar números de referencia de pedido.'], 403);
        }

        return $next($request);
    }
}
