<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $credit_sale_id
 * @property int $product_id
 * @property string $product_name
 * @property int $quantity
 * @property float $unit_price
 * @property float $subtotal
 * @property float|null $purchase_price_snapshot
 * @property \App\Models\CreditSale $creditSale
 * @property \App\Models\Product $product
 */
class CreditSaleItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'credit_sale_id',
        'product_id',
        'product_name',
        'quantity',
        'unit_price',
        'subtotal',
        'purchase_price_snapshot',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'purchase_price_snapshot' => 'decimal:2',
    ];

    public function creditSale(): BelongsTo
    {
        return $this->belongsTo(CreditSale::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
