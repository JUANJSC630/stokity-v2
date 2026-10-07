<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\Http;

/**
 * Validates `image_url` on the storefront write endpoints (PATCH
 * .../products/{identifier}, POST .../images): must be https AND a live
 * HEAD request to it must return 2xx. Without this, a storefront calling
 * the PATCH/POST before its own Vercel Blob upload finishes (or with a
 * typo'd/since-deleted URL) silently saves a dead link — the product looks
 * fine in the API response but the image 404s in the browser. Caught this
 * exact case on a real product (CAM-9457) where the gallery uploads
 * resolved fine but a separately-set cover photo pointed at a blob that
 * was never actually reachable.
 *
 * SSRF guard: the URL is attacker-influenced (any can_manage_media key
 * holder — a tenant-scoped but still external actor). Rejects a URL whose
 * host is a *literal* loopback/private/link-local/reserved IP (including
 * 169.254.169.254, the cloud instance metadata address) before making the
 * HEAD request. Deliberately does NOT also resolve hostnames via a
 * separate DNS lookup first — that would add a second, flake-prone network
 * round-trip (and one Http::fake() in tests can't intercept, since it's a
 * raw DNS call, not an HTTP one) to guard against a much narrower attack
 * (a domain an attacker controls resolving to an internal IP), which is a
 * reasonable tradeoff given the caller must already hold a SuperAdmin-
 * granted, tenant-scoped key. Full DNS-pinning would close that gap but is
 * a disproportionate amount of complexity for what was asked here.
 */
class ExistingHttpsBlobUrl implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! str_starts_with($value, 'https://')) {
            $fail('El campo :attribute debe ser una URL https.');

            return;
        }

        $host = parse_url($value, PHP_URL_HOST);

        if (! is_string($host) || $host === '' || ! $this->isAllowedHost($host)) {
            $fail('El campo :attribute debe apuntar a un host público accesible.');

            return;
        }

        try {
            $response = Http::timeout(5)->connectTimeout(3)->head($value);
        } catch (\Throwable) {
            $fail('No se pudo verificar que la imagen en :attribute exista (host inaccesible).');

            return;
        }

        if (! $response->successful()) {
            $fail('La URL de :attribute no corresponde a una imagen accesible (respondió '.$response->status().').');
        }
    }

    /**
     * A literal IP host must be public (not loopback/private/link-local/
     * reserved); a hostname is always allowed through here — its own
     * resolution happens once, inside the HEAD request above.
     */
    private function isAllowedHost(string $host): bool
    {
        if (! filter_var($host, FILTER_VALIDATE_IP)) {
            return true;
        }

        return filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
    }
}
