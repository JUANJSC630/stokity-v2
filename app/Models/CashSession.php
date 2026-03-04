<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashSession extends Model
{
    protected $fillable = [
        'branch_id',
        'opened_by_user_id',
        'closed_by_user_id',
        'status',
        'opening_amount',
        'opening_notes',
        'opened_at',
        'closing_amount_declared',
        'closing_notes',
        'closed_at',
        'total_sales_cash',
        'total_sales_card',
        'total_sales_transfer',
        'total_sales_other',
        'total_cash_in',
        'total_cash_out',
        'total_refunds_cash',
        'expected_cash',
        'discrepancy',
    ];

    protected $casts = [
        'opening_amount'           => 'decimal:2',
        'closing_amount_declared'  => 'decimal:2',
        'total_sales_cash'         => 'decimal:2',
        'total_sales_card'         => 'decimal:2',
        'total_sales_transfer'     => 'decimal:2',
        'total_sales_other'        => 'decimal:2',
        'total_cash_in'            => 'decimal:2',
        'total_cash_out'           => 'decimal:2',
        'total_refunds_cash'       => 'decimal:2',
        'expected_cash'            => 'decimal:2',
        'discrepancy'              => 'decimal:2',
        'opened_at'                => 'datetime',
        'closed_at'                => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function openedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by_user_id');
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by_user_id');
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class, 'session_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(CashMovement::class, 'session_id');
    }

    public static function getOpenForUser(int $userId, int $branchId): ?self
    {
        return static::where('opened_by_user_id', $userId)
            ->where('branch_id', $branchId)
            ->where('status', 'open')
            ->latest()
            ->first();
    }
}
