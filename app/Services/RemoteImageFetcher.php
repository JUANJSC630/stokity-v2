<?php

namespace App\Services;

/**
 * Downloads an image from a URL a tenant can influence (the business logo) without
 * letting the server be used to reach internal services (SSRF).
 *
 * The host is resolved here, every resulting address must be public, and the
 * connection is pinned to that address so a DNS answer cannot change between the
 * check and the request. Redirects are not followed (each hop would have to be
 * validated again), only http(s) is allowed, and the size is capped.
 */
class RemoteImageFetcher
{
    private const MAX_BYTES = 5 * 1024 * 1024;

    /**
     * @return array{body: string, content_type: string}|null
     */
    public function fetch(string $url): ?array
    {
        $target = $this->resolvePublicAddress($url);

        if ($target === null || ! function_exists('curl_init')) {
            return null;
        }

        $handle = curl_init($url);
        curl_setopt_array($handle, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
            CURLOPT_RESOLVE => ["{$target['host']}:{$target['port']}:{$target['ip']}"],
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_NOPROGRESS => false,
            CURLOPT_XFERINFOFUNCTION => fn ($resource, $downloadSize, $downloaded) => $downloaded > self::MAX_BYTES ? 1 : 0,
        ]);

        $body = curl_exec($handle);
        $status = curl_getinfo($handle, CURLINFO_HTTP_CODE);
        $contentType = (string) curl_getinfo($handle, CURLINFO_CONTENT_TYPE);
        curl_close($handle);

        if (! is_string($body) || $status !== 200 || strlen($body) > self::MAX_BYTES) {
            return null;
        }

        return ['body' => $body, 'content_type' => $contentType];
    }

    /**
     * @return array{host: string, port: int, ip: string}|null null when the URL is not a plain http(s) URL to a public address
     */
    public function resolvePublicAddress(string $url): ?array
    {
        $parts = parse_url($url);

        if ($parts === false || ! in_array($parts['scheme'] ?? null, ['http', 'https'], true)) {
            return null;
        }

        if (isset($parts['user']) || isset($parts['pass']) || empty($parts['host'])) {
            return null;
        }

        $host = trim($parts['host'], '[]');
        $port = $parts['port'] ?? ($parts['scheme'] === 'https' ? 443 : 80);
        $addresses = $this->addressesOf($host);

        if ($addresses === [] || ! $this->allPublic($addresses)) {
            return null;
        }

        return ['host' => $host, 'port' => $port, 'ip' => $addresses[0]];
    }

    /**
     * @return list<string>
     */
    private function addressesOf(string $host): array
    {
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return [$host];
        }

        if (preg_match('/^(0x[0-9a-f]+|\d+)$/i', $host) || str_contains($host, '..')) {
            return [];
        }

        $addresses = gethostbynamel($host) ?: [];

        foreach (@dns_get_record($host, DNS_AAAA) ?: [] as $record) {
            $addresses[] = $record['ipv6'];
        }

        return array_values(array_unique($addresses));
    }

    /**
     * @param  list<string>  $addresses
     */
    private function allPublic(array $addresses): bool
    {
        foreach ($addresses as $address) {
            if (filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
                return false;
            }
        }

        return true;
    }
}
