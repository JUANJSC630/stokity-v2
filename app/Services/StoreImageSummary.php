<?php

namespace App\Services;

use App\Models\BusinessSetting;
use App\Models\Product;
use App\Models\ProductImage;
use App\Tenancy\TenantManager;
use Illuminate\Support\Facades\Cache;

/**
 * What a storefront needs to know about the current tenant's images as a whole,
 * exposed on GET /store/info: the hosts its photos are served from (so the
 * storefront can build its CSP `img-src` and `next/image` remotePatterns from
 * data instead of a hand-written list) and how many are known to be broken.
 */
class StoreImageSummary
{
    private const CACHE_SECONDS = 600;

    /**
     * @return list<string>
     */
    public function hosts(): array
    {
        return Cache::remember($this->cacheKey('hosts'), self::CACHE_SECONDS, function (): array {
            $settings = BusinessSetting::getSettingsReadOnly();

            $urls = Product::query()->whereNotNull('image')->distinct()->pluck('image')
                ->merge(ProductImage::query()->distinct()->pluck('image'))
                ->push($settings->logo_url, $settings->default_product_image_url);

            return $urls
                ->filter(fn ($url) => is_string($url) && str_starts_with($url, 'https://'))
                ->map(fn (string $url) => strtolower((string) parse_url($url, PHP_URL_HOST)))
                ->filter()
                ->unique()
                ->sort()
                ->values()
                ->all();
        });
    }

    /**
     * Product covers and gallery images that answered 404 at the last
     * `images:check-links` run.
     */
    public function brokenCount(): int
    {
        return Product::query()->where('image_ok', false)->count()
            + ProductImage::query()->where('image_ok', false)->count();
    }

    private function cacheKey(string $name): string
    {
        return 'store-images:'.$name.':t'.app(TenantManager::class)->id();
    }
}
