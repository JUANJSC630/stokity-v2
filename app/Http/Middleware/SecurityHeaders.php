<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Baseline response headers that harden the browser side without touching how
 * pages render: no MIME sniffing, no framing by other sites, a stricter referrer
 * and HSTS (only over https, so local http development is not pinned).
 *
 * A Content-Security-Policy is deliberately not set here: it needs a Vite nonce
 * and a report-only rollout first, or it would break the interface.
 */
class SecurityHeaders
{
    private const HSTS_MAX_AGE = 15552000; // 180 days

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $headers = [
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'SAMEORIGIN',
            'Referrer-Policy' => 'strict-origin-when-cross-origin',
        ];

        if ($this->arrivedOverHttps($request)) {
            $headers['Strict-Transport-Security'] = 'max-age='.self::HSTS_MAX_AGE;
        }

        foreach ($headers as $name => $value) {
            if (! $response->headers->has($name)) {
                $response->headers->set($name, $value);
            }
        }

        return $response;
    }

    /**
     * Behind Railway's proxy the app itself speaks plain http, and Laravel resets
     * its trusted proxies, so isSecure() is false. The forwarded scheme is enough
     * to decide this header: spoofing it over plain http only yields an HSTS header
     * that browsers ignore on http responses.
     */
    private function arrivedOverHttps(Request $request): bool
    {
        return $request->isSecure() || strtolower((string) $request->headers->get('X-Forwarded-Proto')) === 'https';
    }
}
