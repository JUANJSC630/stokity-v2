<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

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
 * @property int $category_id
 * @property int $branch_id
 * @property \App\Models\Category|null $category
 * @property \App\Models\Branch|null $branch
 */
class Product extends Model
{
    use HasFactory, SoftDeletes;

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
        'min_stock',
        'image',
        'category_id',
        'branch_id',
        'status',
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
        'min_stock' => 'integer',
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
        return $this->belongsTo(Category::class);
    }

    /**
     * Get the branch that owns the product.
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
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
    public function isLowStock(): bool
    {
        return $this->stock <= $this->min_stock;
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
