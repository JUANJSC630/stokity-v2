<?php

namespace App\Services;

use Illuminate\Http\Client\RequestException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class BlobStorageService
{
    private const BASE_URL = 'https://blob.vercel-storage.com';

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
     * @param  UploadedFile  $file
     * @param  string  $folder  e.g. "products" or "settings"
     * @return string  The public URL of the uploaded blob
     */
    public function upload(UploadedFile $file, string $folder): string
    {
        $webp = $this->toWebP($file);
        $filename = uniqid((string) time(), true) . '.webp';
        $pathname = "stokity/{$folder}/{$filename}";

        $response = Http::withToken($this->token)
            ->withHeaders([
                'content-type' => 'image/webp',
                'x-access'     => 'public',
            ])
            ->withBody($webp, 'image/webp')
            ->put(self::BASE_URL . '/' . $pathname);

        if ($response->failed()) {
            Log::error('Vercel Blob upload failed', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new RuntimeException('Failed to upload image to Blob storage: ' . $response->body());
        }

        return $response->json('url');
    }

    /**
     * Delete one or more blobs by their public URL.
     *
     * @param  string|string[]  $urls
     */
    public function delete(string|array $urls): void
    {
        $urls = (array) $urls;

        // Only pass valid Blob URLs (skip local legacy paths)
        $blobUrls = array_values(array_filter($urls, fn ($u) => str_contains($u, 'vercel-storage.com')));

        if (empty($blobUrls)) {
            return;
        }

        try {
            Http::withToken($this->token)
                ->delete(self::BASE_URL, ['urls' => $blobUrls]);
        } catch (RequestException $e) {
            Log::warning('Vercel Blob delete failed', ['urls' => $blobUrls, 'error' => $e->getMessage()]);
        }
    }

    /**
     * Convert any uploaded image to WebP (quality 85, transparency preserved).
     */
    private function toWebP(UploadedFile $file): string
    {
        if (!extension_loaded('gd')) {
            throw new RuntimeException('GD extension is required for WebP conversion.');
        }

        $source = imagecreatefromstring(file_get_contents($file->getRealPath()));

        if ($source === false) {
            throw new RuntimeException('Could not read image file.');
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
