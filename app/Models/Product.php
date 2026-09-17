<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $name
 * @property string $code
 * @property int $stock
 * @property int $min_stock
 * @property float $sale_price
 * @property float $purchase_price
 * @property float $tax
 * @property string|null $image
 * @property string $image_url
 * @property bool $status
 * @property bool $show_in_storefront
 * @property string|null $slug
 * @property int $category_id
 * @property int $branch_id
 * @property \App\Models\Category|null $category
 * @property \App\Models\Branch|null $branch
 */
class Product extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected static function booted(): void
    {
        // Only products opted into the storefront need a public, SEO-friendly
        // slug — everything else keeps sale_price/stock private to the panel.
        // Generated here (not left to the storefront API) so it exists the
        // moment a product is toggled on, and stays stable afterwards even
        // if the name later changes.
        static::saving(function (self $product) {
            if ($product->show_in_storefront && empty($product->slug)) {
                $product->slug = $product->generateUniqueSlug();
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
        'code',
        'description',
        'purchase_price',
        'sale_price',
        'tax',
        'stock',
        'reserved_stock',
        'min_stock',
        'image',
        'category_id',
        'branch_id',
        'status',
        'type',
        'variable_price',
        'show_in_storefront',
        'slug',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'purchase_price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'tax' => 'decimal:2',
        'status' => 'boolean',
        'stock' => 'integer',
        'reserved_stock' => 'integer',
        'min_stock' => 'integer',
        'variable_price' => 'boolean',
        'show_in_storefront' => 'boolean',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'image_url',
    ];

    /**
     * Get the category that owns the product.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class)->withTrashed();
    }

    /**
     * Get the branch that owns the product.
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Additional storefront gallery images, beyond the cover ($image).
     */
    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    /**
     * Slug is unique per tenant (matches the `products_tenant_id_slug_unique`
     * index) — TenantScope already restricts this query to the current
     * tenant, so a plain `where('slug', ...)` is enough, same pattern
     * `code` generation would use elsewhere in this model.
     */
    private function generateUniqueSlug(): string
    {
        $base = Str::slug($this->name) ?: 'producto';
        $slug = $base;
        $attempt = 1;

        while (true) {
            $query = static::where('slug', $slug);
            if ($this->exists) {
                $query->where('id', '!=', $this->id);
            }

            if (! $query->exists()) {
                return $slug;
            }

            $attempt++;
            $slug = "{$base}-{$attempt}";
        }
    }

    /**
     * generateUniqueSlug()'s exists()-check-then-save is check-then-act, not
     * atomic — two products with the same name saved at nearly the same
     * moment can both pass the check before either has written, and the
     * second insert/update would hit `products_tenant_id_slug_unique` with
     * an uncaught exception. The unique index is the real arbiter, so on
     * exactly that collision, recompute against the now-current DB state
     * (which includes whichever save just won) and retry, instead of
     * bubbling a 500 for what is really just a naming coincidence.
     *
     * Detects the collision via UniqueConstraintViolationException (a
     * QueryException subclass Laravel added specifically so this doesn't
     * need driver-specific error-message parsing) rather than matching the
     * MySQL constraint name, which a different driver — e.g. SQLite in
     * tests — never even includes in its message. `code` is unique too, so
     * the message is still checked for "slug" to avoid retrying (and
     * silently reassigning the slug) on an unrelated `code` collision.
     */
    public function save(array $options = [])
    {
        for ($attempts = 0; ; $attempts++) {
            try {
                return parent::save($options);
            } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
                $isSlugCollision = str_contains(strtolower($e->getMessage()), 'slug');

                if (! $isSlugCollision || $attempts >= 3) {
                    throw $e;
                }

                $this->slug = $this->generateUniqueSlug();
            }
        }
    }

    /**
     * Get the image URL attribute.
     */
    public function getImageUrlAttribute(): string
    {
        if ($this->image) {
            // Vercel Blob URL (new uploads)
            if (str_starts_with($this->image, 'http')) {
                return $this->image;
            }

            // Legacy local file
            if ($this->image !== 'default-product.png') {
                $path = 'uploads/products/'.$this->image;
                if (file_exists(public_path($path))) {
                    return asset($path);
                }
            }
        }

        // Use default product image from business settings (blob or local legacy)
        $settings = \App\Models\BusinessSetting::getSettings();
        if ($settings->default_product_image_url) {
            return $settings->default_product_image_url;
        }

        return asset('stokity-icon.png');
    }

    /**
     * Determine if the product is low in stock.
     */
    public function isService(): bool
    {
        return $this->type === 'servicio';
    }

    public function availableStock(): int
    {
        if ($this->isService()) {
            return PHP_INT_MAX;
        }

        return max(0, $this->stock - ($this->reserved_stock ?? 0));
    }

    public function isLowStock(): bool
    {
        return ! $this->isService() && $this->stock <= $this->min_stock;
    }

    /**
     * Get all of the sales for the product.
     */
    public function saleProducts()
    {
        return $this->hasMany(SaleProduct::class);
    }

    /**
     * Get all of the sale returns for the product.
     */
    public function saleReturnProducts()
    {
        return $this->hasMany(SaleReturnProduct::class);
    }

    /**
     * Get all stock movements for the product.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<StockMovement, $this>
     */
    public function stockMovements(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    /**
     * Get the latest stock movement for the product.
     */
    public function latestStockMovement()
    {
        return $this->hasOne(StockMovement::class)->latestOfMany();
    }

    /**
     * Get the suppliers for this product.
     */
    public function suppliers(): BelongsToMany
    {
        return $this->belongsToMany(Supplier::class)
            ->withPivot(['purchase_price', 'supplier_code', 'is_default'])
            ->withTimestamps();
    }
}
