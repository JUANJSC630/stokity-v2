<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A gallery image for a product, additional to Product::$image (its cover).
 * Same Vercel Blob storage convention as the cover image — see BlobStorageService.
 *
 * @property int $id
 * @property int $product_id
 * @property string $image
 * @property int $sort_order
 */
class ProductImage extends Model
{
    use BelongsToTenant, HasFactory;

    /**
     * Enforced by StoreProductImageController::store() — a hard ceiling so
     * an external storefront can't balloon a product's gallery (and this
     * app's storage bill) through a scripted/looping integration bug.
     */
    public const MAX_PER_PRODUCT = 8;

    protected $fillable = [
        'product_id',
        'image',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    protected $appends = [
        'image_url',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Mirrors Product::getImageUrlAttribute() for the Vercel Blob case —
     * gallery images are only ever uploaded there, never legacy local files.
     */
    public function getImageUrlAttribute(): string
    {
        return $this->image;
    }
}
