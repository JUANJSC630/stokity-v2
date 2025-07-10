<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'code',
        'description',
        'purchase_price',
        'sale_price',
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
        'status' => 'boolean',
        'stock' => 'integer',
        'min_stock' => 'integer',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
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
     *
     * @return string
     */
    public function getImageUrlAttribute(): string
    {
        // Hay una imagen guardada
        if ($this->image) {
            $path = 'uploads/products/' . $this->image;
            
            // Verificar si el archivo existe
            if (file_exists(public_path($path))) {
                return asset($path);
            }
        }
        
        // Devolver imagen por defecto
        return asset('stokity-icon.png');
    }

    /**
     * Determine if the product is low in stock.
     *
     * @return bool
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
}
