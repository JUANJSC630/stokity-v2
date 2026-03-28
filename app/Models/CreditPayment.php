<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $credit_sale_id
 * @property float $amount
 * @property string $payment_method
 * @property int $registered_by
 * @property int|null $cash_movement_id
 * @property \Illuminate\Support\Carbon $payment_date
 * @property string|null $notes
 * @property \App\Models\CreditSale $creditSale
 * @property \App\Models\User $registeredBy
 * @property \App\Models\CashMovement|null $cashMovement
 */
class CreditPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'credit_sale_id',
        'amount',
        'payment_method',
        'registered_by',
        'cash_movement_id',
        'payment_date',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_date' => 'datetime',
    ];

    public function creditSale(): BelongsTo
    {
        return $this->belongsTo(CreditSale::class);
    }

    public function registeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    public function cashMovement(): BelongsTo
    {
        return $this->belongsTo(CashMovement::class);
    }
}
