<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $wholesale_sale_id
 * @property string $description
 * @property int $quantity
 * @property float $unit_price
 * @property float $subtotal
 * @property \App\Models\WholesaleSale $wholesaleSale
 */
class WholesaleSaleItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'wholesale_sale_id',
        'description',
        'quantity',
        'unit_price',
        'subtotal',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'subtotal' => 'decimal:2',
    ];

    public function wholesaleSale(): BelongsTo
    {
        return $this->belongsTo(WholesaleSale::class);
    }
}
