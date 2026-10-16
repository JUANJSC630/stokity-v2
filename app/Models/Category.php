<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected static function booted(): void
    {
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
     * Get the products for the category.
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
