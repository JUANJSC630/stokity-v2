<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Platform-level security log of every "enter as this user" action taken
 * from the super-admin panel. Not tenant business data — deliberately does
 * not use BelongsToTenant.
 *
 * @property int $id
 * @property int|null $super_admin_id
 * @property int|null $tenant_id
 * @property int|null $impersonated_user_id
 * @property \Illuminate\Support\Carbon $started_at
 * @property \Illuminate\Support\Carbon|null $ended_at
 * @property string|null $ip_address
 */
class TenantImpersonation extends Model
{
    protected $fillable = [
        'super_admin_id',
        'tenant_id',
        'impersonated_user_id',
        'started_at',
        'ended_at',
        'ip_address',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    public function superAdmin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'super_admin_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function impersonatedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'impersonated_user_id');
    }

    /**
     * Close an open log entry. Used by every exit path (explicit "Salir",
     * a plain /logout mid-impersonation, or a failed session hand-back) so
     * the audit trail never depends on a single call site staying in sync.
     */
    public static function close(mixed $logId): void
    {
        if ($logId) {
            static::whereKey($logId)->update(['ended_at' => now()]);
        }
    }
}
