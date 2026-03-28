<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $branch_id
 * @property int|null $session_id
 * @property string $code
 * @property int|null $client_id
 * @property int|null $seller_id
 * @property string $status
 * @property string|null $payment_method
 * @property string|null $notes
 * @property \Illuminate\Support\Carbon $date
 * @property \App\Models\Branch|null $branch
 * @property \App\Models\Client|null $client
 * @property \App\Models\User|null $seller
 * @property \App\Models\CashSession|null $cashSession
 * @property \Illuminate\Database\Eloquent\Collection<int, \App\Models\SaleProduct> $saleProducts
 * @property \Illuminate\Database\Eloquent\Collection<int, \App\Models\SaleReturn> $saleReturns
 * @property \Illuminate\Database\Eloquent\Collection<int, \App\Models\Product> $products
 */
class Sale extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'branch_id',
        'session_id',
        'credit_sale_id',
        'code',
        'client_id',
        'seller_id',
        'tax',
        'discount_type',
        'discount_value',
        'discount_amount',
        'net',
        'total',
        'amount_paid',
        'change_amount',
        'payment_method',
        'date',
        'status',
        'notes',
    ];

    protected $casts = [
        'date' => 'datetime',
        'tax' => 'decimal:2',
        'discount_value' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'net' => 'decimal:2',
        'total' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'change_amount' => 'decimal:2',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function cashSession(): BelongsTo
    {
        return $this->belongsTo(CashSession::class, 'session_id');
    }

    public function saleProducts(): HasMany
    {
        return $this->hasMany(SaleProduct::class);
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'sale_products')
            ->withPivot(['quantity', 'price', 'subtotal'])
            ->withTimestamps();
    }

    public function saleReturns(): HasMany
    {
        return $this->hasMany(SaleReturn::class);
    }

    public function creditSale(): BelongsTo
    {
        return $this->belongsTo(CreditSale::class);
    }
}
