<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $branch_id
 * @property int $client_id
 * @property int $seller_id
 * @property int|null $sale_id
 * @property string $code
 * @property float $total
 * @property float|null $estimated_cost
 * @property string $payment_method
 * @property \Illuminate\Support\Carbon $date
 * @property string $status
 * @property string|null $notes
 * @property \App\Models\Branch $branch
 * @property \App\Models\Client $client
 * @property \App\Models\User $seller
 * @property \App\Models\Sale|null $sale
 * @property \Illuminate\Database\Eloquent\Collection<int, \App\Models\WholesaleSaleItem> $items
 */
class WholesaleSale extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected $fillable = [
        'branch_id',
        'client_id',
        'seller_id',
        'sale_id',
        'code',
        'total',
        'estimated_cost',
        'payment_method',
        'date',
        'status',
        'notes',
    ];

    protected $casts = [
        'total' => 'decimal:2',
        'estimated_cost' => 'decimal:2',
        'date' => 'datetime',
    ];

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

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

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(WholesaleSaleItem::class);
    }

    /**
     * withTrashed() on both the seed count and the collision check is load-bearing:
     * a plain count() excludes archived (soft-deleted) orders, so after
     * cancelling+deleting order #1 the next create would recompute "1" again
     * and collide with the still-present (tenant_id, code) unique row —
     * exactly what caused a 500 in production. See ImmediateSaleStrategy's
     * Sale code generation for the same withTrashed()-guarded pattern.
     */
    public static function generateCode(int $branchId): string
    {
        $prefix = 'MAY-'.str_pad((string) $branchId, 2, '0', STR_PAD_LEFT).'-';
        $sequence = self::withTrashed()->where('branch_id', $branchId)->count() + 1;

        do {
            $code = $prefix.str_pad((string) $sequence, 5, '0', STR_PAD_LEFT);
            $sequence++;
        } while (self::withTrashed()->where('code', $code)->exists());

        return $code;
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            self::STATUS_COMPLETED => 'Completado',
            self::STATUS_CANCELLED => 'Cancelado',
            default => $this->status,
        };
    }
}
