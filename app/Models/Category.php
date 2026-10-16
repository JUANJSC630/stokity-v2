<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Category extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected static function booted(): void
    {
        // Generated once and kept: the storefront builds /category/{slug} URLs
        // from it, so renaming a category must not change it (see
        // regenerateSlug() for the deliberate way to do that).
        static::creating(function (self $category) {
            if (empty($category->slug)) {
                $category->slug = $category->generateUniqueSlug();
            }
        });

        // The storefront embeds `category` inside each product, so renaming
        // or deactivating one is a change to all its products as seen by
        // `updated_since` sync.
        static::saved(function (self $category) {
            if (! $category->wasRecentlyCreated && $category->wasChanged(['name', 'description', 'status'])) {
                $category->products()->update(['updated_at' => now()]);
            }
        });
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'description',
        'status',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'status' => 'boolean',
    ];

    /**
     * Recomputes the slug from the CURRENT name. Only ever called on purpose
     * (store:categories:regenerate-slug) because it changes a public URL.
     */
    public function regenerateSlug(): void
    {
        $this->forceFill(['slug' => $this->generateUniqueSlug()])->save();
    }

    private function generateUniqueSlug(): string
    {
        $base = Str::slug($this->name) ?: 'categoria';
        $slug = $base;
        $attempt = 2;

        // Soft-deleted categories keep their slug reserved; the category being
        // renamed does not collide with itself.
        while (static::withTrashed()->where('slug', $slug)->when($this->exists, fn ($q) => $q->whereKeyNot($this->getKey()))->exists()) {
            $slug = "{$base}-{$attempt}";
            $attempt++;
        }

        return $slug;
    }

    /**
     * Get the products for the category.
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
