<?php

namespace App\Services;

use App\Models\BusinessSetting;
use App\Models\Product;
use App\Models\ProductImage;

/**
 * What a storefront needs to know about the current tenant's images as a whole,
 * exposed on GET /store/info: the hosts its photos are served from (so the
 * storefront can build its CSP `img-src` and `next/image` remotePatterns from
 * data instead of a hand-written list) and how many are known to be broken.
 */
class StoreImageSummary
{
    /**
     * Computed on every request, not cached: a storefront builds its CSP from
     * this list, so a host added a moment ago (a new photo on a new store) must
     * show up right away or the storefront would block that photo.
     *
     * @return list<string>
     */
    public function hosts(): array
    {
        $settings = BusinessSetting::getSettingsReadOnly();

        return Product::query()->whereNotNull('image')->distinct()->pluck('image')
            ->merge(ProductImage::query()->distinct()->pluck('image'))
            ->push($settings->logo_url, $settings->default_product_image_url)
            ->filter(fn ($url) => is_string($url) && str_starts_with($url, 'https://'))
            ->map(fn (string $url) => strtolower((string) parse_url($url, PHP_URL_HOST)))
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();
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
}
