<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int|null $sale_id
 * @property int $client_id
 * @property int $branch_id
 * @property int $seller_id
 * @property string $code
 * @property string $type
 * @property float $total_amount
 * @property float $amount_paid
 * @property float $balance
 * @property int|null $installments_count
 * @property float|null $installment_amount
 * @property \Illuminate\Support\Carbon|null $due_date
 * @property string|null $notes
 * @property string $status
 * @property \App\Models\Sale|null $sale
 * @property \App\Models\Client $client
 * @property \App\Models\Branch $branch
 * @property \App\Models\User $seller
 * @property \Illuminate\Database\Eloquent\Collection<int, \App\Models\CreditSaleItem> $items
 * @property \Illuminate\Database\Eloquent\Collection<int, \App\Models\CreditPayment> $payments
 */
class CreditSale extends Model
{
    use HasFactory;

    protected $fillable = [
        'sale_id',
        'client_id',
        'branch_id',
        'seller_id',
        'code',
        'type',
        'total_amount',
        'amount_paid',
        'balance',
        'installments_count',
        'installment_amount',
        'due_date',
        'notes',
        'status',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'balance' => 'decimal:2',
        'installment_amount' => 'decimal:2',
        'due_date' => 'date',
        'installments_count' => 'integer',
    ];

    // --- Type constants ---
    public const TYPE_LAYAWAY = 'layaway';
    public const TYPE_INSTALLMENTS = 'installments';
    public const TYPE_DUE_DATE = 'due_date';
    public const TYPE_HOLD = 'hold';

    // --- Status constants ---
    public const STATUS_ACTIVE = 'active';
    public const STATUS_OVERDUE = 'overdue';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';

    /** Types that create a Sale immediately */
    public const IMMEDIATE_SALE_TYPES = [self::TYPE_INSTALLMENTS, self::TYPE_DUE_DATE];

    /** Types that defer Sale creation until fully paid */
    public const DEFERRED_SALE_TYPES = [self::TYPE_LAYAWAY, self::TYPE_HOLD];

    /** Types that reserve stock instead of deducting */
    public const RESERVE_STOCK_TYPES = [self::TYPE_LAYAWAY, self::TYPE_HOLD];

    // --- Relationships ---

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(CreditSaleItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(CreditPayment::class);
    }

    // --- Business logic ---

    public function isOverdue(): bool
    {
        return $this->due_date
            && $this->due_date->isPast()
            && $this->status === self::STATUS_ACTIVE;
    }

    public function isFullyPaid(): bool
    {
        return bccomp((string) $this->balance, '0', 2) <= 0;
    }

    public function requiresSaleOnCompletion(): bool
    {
        return in_array($this->type, self::DEFERRED_SALE_TYPES);
    }

    public function reservesStock(): bool
    {
        return in_array($this->type, self::RESERVE_STOCK_TYPES);
    }

    public function createsImmediateSale(): bool
    {
        return in_array($this->type, self::IMMEDIATE_SALE_TYPES);
    }

    // --- Scopes ---

    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function scopeOverdue($query)
    {
        return $query->where('status', self::STATUS_ACTIVE)
            ->whereNotNull('due_date')
            ->where('due_date', '<', now())
            ->where('balance', '>', 0);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    public function scopeForBranch($query, int $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    // --- Code generation ---

    public static function generateCode(int $branchId): string
    {
        $count = self::where('branch_id', $branchId)->count() + 1;

        return 'CR-' . str_pad((string) $branchId, 2, '0', STR_PAD_LEFT)
            . '-' . str_pad((string) $count, 5, '0', STR_PAD_LEFT);
    }

    // --- Label helpers ---

    public function getTypeLabelAttribute(): string
    {
        return match ($this->type) {
            self::TYPE_LAYAWAY => 'Separado',
            self::TYPE_INSTALLMENTS => 'Cuotas',
            self::TYPE_DUE_DATE => 'Fecha acordada',
            self::TYPE_HOLD => 'Reservado',
            default => $this->type,
        };
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            self::STATUS_ACTIVE => 'Activo',
            self::STATUS_OVERDUE => 'Vencido',
            self::STATUS_COMPLETED => 'Completado',
            self::STATUS_CANCELLED => 'Cancelado',
            default => $this->status,
        };
    }
}
