<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $session_id
 * @property int $user_id
 * @property string $type
 * @property float $amount
 * @property string $concept
 * @property string|null $notes
 */
class CashMovement extends Model
{
    protected $fillable = [
        'session_id',
        'user_id',
        'type',
        'amount',
        'concept',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(CashSession::class, 'session_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
