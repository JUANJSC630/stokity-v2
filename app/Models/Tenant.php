<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string $status
 * @property string|null $plan
 * @property bool $web_store_enabled
 * @property \Illuminate\Support\Carbon|null $trial_ends_at
 */
class Tenant extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_ACTIVE = 'active';

    public const STATUS_SUSPENDED = 'suspended';

    public const STATUS_TRIAL = 'trial';

    protected $fillable = [
        'name',
        'slug',
        'status',
        'plan',
        'trial_ends_at',
    ];

    /**
     * web_store_enabled is deliberately NOT fillable: only the SuperAdmin
     * switch (Admin\TenantApiKeyController::toggleWebStore) changes it.
     */
    protected $casts = [
        'trial_ends_at' => 'datetime',
        'web_store_enabled' => 'boolean',
    ];

    /**
     * A tenant can operate while active, or on trial that has not expired.
     */
    public function isActive(): bool
    {
        if ($this->status === self::STATUS_ACTIVE) {
            return true;
        }

        if ($this->status === self::STATUS_TRIAL) {
            return $this->trial_ends_at === null || $this->trial_ends_at->isFuture();
        }

        return false;
    }

    public function isSuspended(): bool
    {
        return $this->status === self::STATUS_SUSPENDED;
    }

    // --- Relationships ---

    public function businessSetting(): HasOne
    {
        return $this->hasOne(BusinessSetting::class);
    }

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function apiKeys(): HasMany
    {
        return $this->hasMany(TenantApiKey::class);
    }

    /**
     * A tenant "has a web store" when the SuperAdmin switch is on AND at
     * least one storefront API key is not revoked. The switch only controls
     * the panel UI — it never blocks the API itself.
     */
    public function hasWebStore(): bool
    {
        return $this->web_store_enabled && $this->apiKeys()->whereNull('revoked_at')->exists();
    }
}
