<?php

namespace App\Services;

use App\Models\BlobDeletion;
use App\Tenancy\TenantManager;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class BlobStorageService
{
    private const BASE_URL = 'https://blob.vercel-storage.com';

    private const HOST_SUFFIX = '.blob.vercel-storage.com';

    /** Days a replaced or removed file is kept before `blobs:purge` may delete it. */
    public const DELETE_GRACE_DAYS = 7;

    /**
     * Store id of the production Blob store (public: it is the host of every
     * photo URL). Only the production app may write to it; see
     * isProductionStoreBlocked().
     */
    public const PRODUCTION_STORE_ID = '4zzvkpkyswa4x2fl';

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
        if (self::isProductionStoreBlocked()) {
            throw new RuntimeException('Refusing to upload to the production Blob store outside production. Set BLOB_READ_WRITE_TOKEN to the development store token.');
        }

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
     * Queue files for deletion instead of deleting them on the spot.
     *
     * This is what every "replace" or "remove" in the app calls. The file is
     * kept for DELETE_GRACE_DAYS and `blobs:purge` deletes it afterwards only if
     * nothing references the URL by then (BlobReferences), so a cover replaced
     * by mistake, or a file another row still uses, is never lost. Only URLs the
     * current tenant owns are queued; foreign ones (a storefront's own Blob
     * store) are that system's responsibility and silently skipped.
     *
     * @param  string|array<int, string|null>|null  $urls
     */
    public function scheduleDelete(string|array|null $urls): void
    {
        $tenantId = app(TenantManager::class)->id();

        foreach (array_filter((array) $urls) as $url) {
            if (! $this->ownsUrl($url)) {
                continue;
            }

            BlobDeletion::query()->updateOrCreate(
                ['url_hash' => hash('sha256', $url)],
                ['url' => $url, 'tenant_id' => $tenantId, 'delete_after' => now()->addDays(self::DELETE_GRACE_DAYS), 'attempts' => 0],
            );
        }
    }

    /**
     * Take a URL out of the deletion queue because something references it
     * again (a cover pointed back at it). Callers run this inside the same
     * transaction as the write that adds the reference: `blobs:purge` locks the
     * queue row while it deletes, so this either waits for that purge or wins
     * and the purge finds no row.
     */
    public function unscheduleDelete(?string $url): void
    {
        if ($url) {
            BlobDeletion::query()->where('url_hash', hash('sha256', $url))->delete();
        }
    }

    /**
     * Delete one or more blobs by their public URL, right now.
     *
     * Only `blobs:purge` should call this; app code uses scheduleDelete(). The
     * Blob store and its token are shared by every tenant, so only URLs the
     * current tenant owns are sent to Vercel; anything else is silently
     * skipped. Legacy blobs uploaded before tenant prefixes existed are
     * skipped too (left orphaned rather than risk deleting another tenant's).
     *
     * @param  string|string[]  $urls
     * @return bool Whether Vercel confirmed the delete (true when there was nothing to delete).
     */
    public function delete(string|array $urls): bool
    {
        $blobUrls = array_values(array_filter((array) $urls, fn (string $url) => $this->ownsUrl($url)));

        if (empty($blobUrls)) {
            return true;
        }

        if (self::isProductionStoreBlocked()) {
            Log::warning('Refused to delete from the production Blob store outside production', ['urls' => $blobUrls]);

            return false;
        }

        try {
            $response = Http::withToken($this->token)
                ->timeout(10)
                ->delete(self::BASE_URL, ['urls' => $blobUrls]);
        } catch (RequestException|ConnectionException $e) {
            Log::warning('Vercel Blob delete failed', ['urls' => $blobUrls, 'error' => $e->getMessage()]);

            return false;
        }

        if ($response->failed()) {
            Log::warning('Vercel Blob delete failed', ['urls' => $blobUrls, 'status' => $response->status()]);
        }

        return $response->successful();
    }

    /**
     * Which system stores the file behind a URL: `stokity` for this app's own
     * Blob store, `storefront` for anything else (a storefront's own store,
     * registered through the Store API). Decided by the store's real public
     * host, so a storefront using a `/stokity/t1/` path in its own store is
     * still `storefront`. Falls back to the path prefix only when the token
     * does not reveal the store (tests, misconfiguration).
     */
    public static function storageOwner(string $url): string
    {
        $parts = parse_url($url);
        $host = strtolower($parts['host'] ?? '');
        $ownHost = self::ownPublicHost();

        if ($ownHost !== null) {
            return $host === $ownHost ? 'stokity' : 'storefront';
        }

        $isStokityPath = str_ends_with($host, self::HOST_SUFFIX)
            && preg_match('#^/stokity/(t\d+|platform)/#', $parts['path'] ?? '') === 1;

        return $isStokityPath ? 'stokity' : 'storefront';
    }

    /**
     * Public host of this app's own Blob store. A read-write token has the
     * shape `vercel_blob_rw_<storeId>_<random>` and the store serves files at
     * `<storeId lowercased>.public.blob.vercel-storage.com` (the same
     * derivation @vercel/blob does).
     */
    public static function ownPublicHost(): ?string
    {
        $storeId = self::storeId();

        return $storeId === null ? null : $storeId.'.public'.self::HOST_SUFFIX;
    }

    /**
     * Whether the token points at the production store while this is not the
     * production app. A local or staging copy shares no database with
     * production, so its uploads would be orphans there and `blobs:purge`
     * would delete files production still shows (nothing references them in
     * the local database).
     */
    public static function isProductionStoreBlocked(): bool
    {
        return self::storeId() === self::PRODUCTION_STORE_ID && ! app()->isProduction();
    }

    /**
     * Store id from a `vercel_blob_rw_<storeId>_<random>` token, lowercased.
     */
    private static function storeId(): ?string
    {
        $token = (string) config('services.vercel_blob.token');

        if (preg_match('/^vercel_blob_rw_([a-z\d]+)_[a-z\d]+$/i', $token, $matches) !== 1) {
            return null;
        }

        return strtolower($matches[1]);
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

        $ownHost = self::ownPublicHost();

        $isCleanBlobUrl = ($parts['scheme'] ?? null) === 'https'
            && ! isset($parts['user'], $parts['port'])
            && str_ends_with($host, self::HOST_SUFFIX)
            && ($ownHost === null || $host === $ownHost)
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
