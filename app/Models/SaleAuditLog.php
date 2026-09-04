<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Immutable log row — one per changed field on a sale update, or one per
 * cancellation. Never updated after creation.
 *
 * @property int $id
 * @property int $sale_id
 * @property int $user_id
 * @property string $action
 * @property string|null $field_changed
 * @property string|null $old_value
 * @property string|null $new_value
 * @property string|null $ip_address
 * @property \Illuminate\Support\Carbon $created_at
 */
class SaleAuditLog extends Model
{
    use BelongsToTenant;

    // Create-only timestamp — Eloquent still auto-stamps created_at on
    // insert, it just never touches it again.
    const UPDATED_AT = null;

    protected $fillable = [
        'sale_id',
        'user_id',
        'action',
        'field_changed',
        'old_value',
        'new_value',
        'ip_address',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
