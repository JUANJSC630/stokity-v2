<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * @property int $id
 * @property int $sale_id
 * @property int $user_id
 * @property string|null $reason
 * @property \App\Models\Sale $sale
 * @property \App\Models\User $user
 * @property \Illuminate\Database\Eloquent\Collection<int, \App\Models\Product> $products
 */
class SaleReturn extends Model
{
    use HasFactory;

    protected $fillable = [
        'sale_id',
        'user_id',
        'reason',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'sale_return_products')
            ->withPivot('quantity', 'effective_price')
            ->withTimestamps();
    }
}
