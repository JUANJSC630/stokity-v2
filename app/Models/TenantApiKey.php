<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * A bearer key that authenticates the public storefront API
 * (`routes/api.php`, `api/v1/store/*`) as a specific tenant, without a
 * logged-in panel user. Created and revoked from the SuperAdmin panel only
 * (Admin\TenantApiKeyController) — never self-service from a tenant's own
 * /settings, so issuing external API access always goes through the
 * platform owner.
 *
 * The plaintext key is only ever available once, at generate() time — only
 * its SHA-256 hash and a short display prefix are persisted. Losing the
 * plaintext means generating a new key; there is no "reveal again".
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $name
 * @property string $key_prefix
 * @property string $hashed_key
 * @property bool $can_manage_media
 * @property bool $can_generate_order_references
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $last_used_at
 * @property \Illuminate\Support\Carbon|null $revoked_at
 */
class TenantApiKey extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'name',
        'key_prefix',
        'hashed_key',
        'created_by',
        'can_manage_media',
        'can_generate_order_references',
    ];

    protected $casts = [
        'can_manage_media' => 'boolean',
        'can_generate_order_references' => 'boolean',
        'last_used_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    /**
     * Never expose the hash — it is not a secret the app needs to render,
     * and being an equality-lookup hash (not bcrypt/argon2) it deserves the
     * same treatment as a session token, not a password field.
     */
    protected $hidden = [
        'hashed_key',
    ];

    /**
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isRevoked(): bool
    {
        return $this->revoked_at !== null;
    }

    /**
     * revoked_at is deliberately NOT in $fillable — like tenant_id on
     * BelongsToTenant, a field that flips off external API access must
     * never be settable through a generic mass-assignment call, only
     * through this explicit, single-purpose method.
     */
    public function revoke(): void
    {
        $this->forceFill(['revoked_at' => now()])->save();
    }

    /**
     * Create a new key for a tenant. Returns the model AND the one-time
     * plaintext key — the only place in the app this plaintext ever exists.
     *
     * $canManageMedia and $canGenerateOrderReferences default to false and
     * are independent of each other — only these explicit params set them
     * (never a raw request array), so each write capability is an opt-in
     * choice a SuperAdmin makes per key, never something an older key (or a
     * key granted the OTHER scope) gains retroactively.
     *
     * @return array{key: self, plainTextKey: string}
     */
    public static function generate(
        Tenant $tenant,
        string $name,
        ?User $creator = null,
        bool $canManageMedia = false,
        bool $canGenerateOrderReferences = false,
    ): array {
        // 40 random chars of entropy is plenty for a bearer token looked up
        // by exact hash match (not brute-forceable at network-request
        // speed); the "sk_store_" prefix makes a leaked key recognizable as
        // this specific credential in logs/scans, same idea as Stripe's
        // `sk_live_` convention.
        $plainTextKey = 'sk_store_'.Str::random(40);

        $key = static::create([
            'tenant_id' => $tenant->id,
            'name' => $name,
            // First 16 chars, not 8: the "sk_store_" literal alone is
            // already 9 chars, so an 8-char slice was just that constant —
            // identical for every key ever generated, and useless as a
            // display identifier. 16 chars carries ~7 random chars past the
            // constant part, enough to tell two keys apart in the admin UI.
            'key_prefix' => substr($plainTextKey, 0, 16),
            'hashed_key' => static::hash($plainTextKey),
            'created_by' => $creator?->id,
            'can_manage_media' => $canManageMedia,
            'can_generate_order_references' => $canGenerateOrderReferences,
        ]);

        return ['key' => $key, 'plainTextKey' => $plainTextKey];
    }

    public static function hash(string $plainTextKey): string
    {
        return hash('sha256', $plainTextKey);
    }

    /**
     * Look up the active (non-revoked) key matching a plaintext bearer
     * token. Used only by ResolveTenantFromApiKey — deliberately bypasses
     * the tenant scope (allTenants()) since the request has no tenant
     * context yet; that's exactly what this lookup is resolving.
     */
    public static function findActiveByPlainKey(string $plainTextKey): ?self
    {
        return static::allTenants()
            ->where('hashed_key', static::hash($plainTextKey))
            ->whereNull('revoked_at')
            ->first();
    }
}
