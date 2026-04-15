<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExpenseTemplate extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'branch_id',
        'expense_category_id',
        'name',
        'reference_amount',
        'due_day',
        'is_active',
        'deleted_by',
        'deletion_reason',
    ];

    protected $casts = [
        'reference_amount' => 'decimal:2',
        'due_day'          => 'integer',
        'is_active'        => 'boolean',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'expense_category_id');
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    /**
     * Returns true if this template already has an expense registered
     * for the given year+month (prevents duplicate registrations).
     */
    public function isRegisteredForMonth(int $year, int $month): bool
    {
        return $this->expenses()
            ->whereYear('expense_date', $year)
            ->whereMonth('expense_date', $month)
            ->exists();
    }
}
