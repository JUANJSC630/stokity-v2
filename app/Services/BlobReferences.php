<?php

namespace App\Services;

use App\Models\BusinessSetting;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;

/**
 * Answers "does anything still point at this file?" before a blob is deleted.
 *
 * Every column that can hold a Vercel Blob URL is checked, across all tenants
 * and including soft-deleted rows (a product in the trash can be restored and
 * would come back with a dead photo). A product cover and a gallery image can
 * share one URL ("usar como portada" points the cover at the gallery file), so
 * removing one of them must never take the file away from the other.
 */
class BlobReferences
{
    public function isReferenced(string $url): bool
    {
        return Product::withoutGlobalScopes()->withTrashed()->where('image', $url)->exists()
            || ProductImage::withoutGlobalScopes()->where('image', $url)->exists()
            || User::withoutGlobalScopes()->withTrashed()->where('photo', $url)->exists()
            || BusinessSetting::withoutGlobalScopes()
                ->where(fn ($query) => $query->where('logo', $url)->orWhere('default_product_image', $url))
                ->exists();
    }
}
