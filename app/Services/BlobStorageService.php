<?php

namespace App\Services;

use App\Tenancy\TenantManager;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class BlobStorageService
{
    private const BASE_URL = 'https://blob.vercel-storage.com';

    private const HOST_SUFFIX = '.blob.vercel-storage.com';

    private string $token;

    public function __construct()
    {
        $token = config('services.vercel_blob.token');

        if (empty($token)) {
            throw new RuntimeException('BLOB_READ_WRITE_TOKEN is not configured.');
        }

        $this->token = $token;
    }

    /**
     * Upload an image to Vercel Blob, converting it to WebP first.
     *
     * The blob is stored under the current tenant's prefix so that delete()
     * can later prove ownership from the URL alone.
     *
     * @param  string  $folder  e.g. "products" or "settings"
     * @return string The public URL of the uploaded blob
     */
    public function upload(UploadedFile $file, string $folder): string
    {
        $webp = $this->toWebP($file);
        $filename = uniqid((string) time(), true).'.webp';
        $pathname = $this->tenantPrefix()."/{$folder}/{$filename}";

        $response = Http::withToken($this->token)
            ->timeout(30)
            ->withHeaders([
                'content-type' => 'image/webp',
                'x-access' => 'public',
            ])
            ->withBody($webp, 'image/webp')
            ->put(self::BASE_URL.'/'.$pathname);

        if ($response->failed()) {
            Log::error('Vercel Blob upload failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new RuntimeException('Failed to upload image to Blob storage: '.$response->body());
        }

        return $response->json('url');
    }

    /**
     * Delete one or more blobs by their public URL.
     *
     * The Blob store and its token are shared by every tenant, so only URLs the
     * current tenant owns are sent to Vercel; anything else is silently
     * skipped. Legacy blobs uploaded before tenant prefixes existed are
     * skipped too (left orphaned rather than risk deleting another tenant's).
     *
     * @param  string|string[]  $urls
     */
    public function delete(string|array $urls): void
    {
        $blobUrls = array_values(array_filter((array) $urls, fn (string $url) => $this->ownsUrl($url)));

        if (empty($blobUrls)) {
            return;
        }

        try {
            Http::withToken($this->token)
                ->timeout(10)
                ->delete(self::BASE_URL, ['urls' => $blobUrls]);
        } catch (RequestException $e) {
            Log::warning('Vercel Blob delete failed', ['urls' => $blobUrls, 'error' => $e->getMessage()]);
        }
    }

    /**
     * Whether the URL is an https blob under the current tenant's prefix.
     */
    public function ownsUrl(string $url): bool
    {
        $tenantId = app(TenantManager::class)->id();

        if ($tenantId === null) {
            return false;
        }

        $parts = parse_url($url);
        $host = strtolower($parts['host'] ?? '');
        $path = $parts['path'] ?? '';

        $isCleanBlobUrl = ($parts['scheme'] ?? null) === 'https'
            && ! isset($parts['user'], $parts['port'])
            && str_ends_with($host, self::HOST_SUFFIX)
            && ! str_contains($path, '..')
            && ! str_contains($path, '//')
            && ! str_contains($path, '%');

        if (! $isCleanBlobUrl) {
            return false;
        }

        if (str_starts_with($path, "/stokity/t{$tenantId}/")) {
            return true;
        }

        if (preg_match('#^/stokity/t\d+/#', $path)) {
            Log::warning('Blocked cross-tenant Vercel Blob delete', ['tenant_id' => $tenantId, 'url' => $url]);
        }

        return false;
    }

    private function tenantPrefix(): string
    {
        $tenantId = app(TenantManager::class)->id();

        return $tenantId === null ? 'stokity/platform' : "stokity/t{$tenantId}";
    }

    /**
     * Convert any uploaded image to WebP (quality 85, transparency preserved).
     */
    private function toWebP(UploadedFile $file): string
    {
        if (! extension_loaded('gd')) {
            throw new RuntimeException('GD extension is required for WebP conversion.');
        }

        $source = imagecreatefromstring(file_get_contents($file->getRealPath()));

        if ($source === false) {
            throw new RuntimeException('Could not read image file.');
        }

        // Convert palette (indexed) images to truecolor — required for WebP
        if (imageistruecolor($source) === false) {
            $truecolor = imagecreatetruecolor(imagesx($source), imagesy($source));
            imagealphablending($truecolor, false);
            imagesavealpha($truecolor, true);
            $transparent = imagecolorallocatealpha($truecolor, 0, 0, 0, 127);
            imagefilledrectangle($truecolor, 0, 0, imagesx($source), imagesy($source), $transparent);
            imagecopy($truecolor, $source, 0, 0, 0, 0, imagesx($source), imagesy($source));
            imagedestroy($source);
            $source = $truecolor;
        }

        // Preserve alpha channel (PNG logos with transparency)
        imagesavealpha($source, true);

        ob_start();
        imagewebp($source, null, 85);
        $data = ob_get_clean();
        imagedestroy($source);

        return $data;
    }
}
