<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

/**
 * A free-form label a business attaches to products (e.g. "Artesanal") and
 * that the public storefront API exposes as `tags: [{slug, name}]`.
 *
 * The slug is generated once from the name and then kept: it is what
 * storefronts filter by (`?tag=artesanal`), so renaming a tag must not
 * silently break that filter.
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $slug
 * @property string $name
 */
class ProductTag extends Model
{
    use BelongsToTenant, HasFactory;

    public const NAME_MAX_LENGTH = 40;

    public const MAX_PER_PRODUCT = 10;

    protected $fillable = [
        'name',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $tag) {
            if (empty($tag->slug)) {
                $tag->slug = $tag->generateUniqueSlug();
            }
        });

        // Deleting a tag only detaches it (the pivot cascades); every product
        // that carried it changed as far as the storefront is concerned.
        static::deleting(function (self $tag) {
            $tag->touchProducts();
        });

        static::updated(function (self $tag) {
            if ($tag->wasChanged('name')) {
                $tag->touchProducts();
            }
        });
    }

    /**
     * @return BelongsToMany<Product, $this>
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class)->withTimestamps();
    }

    public function touchProducts(): void
    {
        Product::withTrashed()
            ->whereIn('id', $this->products()->withTrashed()->pluck('products.id'))
            ->update(['updated_at' => now()]);
    }

    private function generateUniqueSlug(): string
    {
        $base = Str::slug($this->name) ?: 'etiqueta';
        $slug = $base;
        $attempt = 2;

        while (static::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$attempt}";
            $attempt++;
        }

        return $slug;
    }
}
