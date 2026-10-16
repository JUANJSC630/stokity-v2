<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Weak ETag + If-None-Match (304) for the storefront's product list/detail,
 * so a storefront can revalidate a cached page without re-downloading it.
 *
 * The ETag is a hash of the body. `meta.synced_at` (the server clock at the
 * start of an `updated_since` query) changes on every call by design, so it
 * is blanked before hashing — otherwise a sync response could never match.
 * `Cache-Control: no-cache` lets clients store the response but forces
 * revalidation; `Vary: Authorization` keeps one key's response from being
 * served to another.
 */
class AddStoreConditionalEtag
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! $request->isMethod('GET') || $response->getStatusCode() !== 200) {
            return $response;
        }

        $body = preg_replace('/"synced_at":"[^"]*"/', '"synced_at":""', (string) $response->getContent());
        $etag = 'W/"'.md5($body).'"';

        $response->headers->set('ETag', $etag);
        $response->headers->set('Cache-Control', 'no-cache, private');
        $response->headers->set('Vary', 'Authorization');

        if ($this->matches($request->header('If-None-Match'), $etag)) {
            $response->setNotModified();
        }

        return $response;
    }

    private function matches(?string $ifNoneMatch, string $etag): bool
    {
        if ($ifNoneMatch === null || trim($ifNoneMatch) === '') {
            return false;
        }

        $current = ltrim($etag, 'W/');

        foreach (explode(',', $ifNoneMatch) as $candidate) {
            $candidate = trim($candidate);

            if ($candidate === '*' || ltrim($candidate, 'W/') === $current) {
                return true;
            }
        }

        return false;
    }
}
