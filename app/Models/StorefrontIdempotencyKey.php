<?php

namespace App\Models;

use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Remembers which order-reference number a given `Idempotency-Key` header
 * produced, per API key, for 24 hours — so a retried POST /order-reference
 * (network timeout, double click) returns the SAME number instead of burning
 * a new one. Like StorefrontOrderCounter, deliberately not tenant-scoped:
 * claimOrReplay() always receives the tenant and key explicitly.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $tenant_api_key_id
 * @property string $idempotency_key
 * @property int|null $order_number
 * @property \Illuminate\Support\Carbon $expires_at
 */
class StorefrontIdempotencyKey extends Model
{
    public const TTL_HOURS = 24;

    /** Expired rows deleted per claim, so the table cannot grow without bound. */
    private const PRUNE_BATCH = 100;

    protected $fillable = [
        'tenant_id',
        'tenant_api_key_id',
        'idempotency_key',
        'order_number',
        'expires_at',
    ];

    protected $casts = [
        'order_number' => 'integer',
        'expires_at' => 'datetime',
    ];

    /**
     * Returns the order number for this (tenant, API key, idempotency key)
     * and whether it was just created or replayed.
     *
     * Concurrency: the first request INSERTs the row inside a transaction
     * and, in that same transaction, claims the number from the counter. A
     * concurrent request with the same header hits the unique index: on
     * MySQL it blocks until the first transaction ends, then fails with a
     * duplicate-key error, is rolled back (so it never touches the counter)
     * and re-reads the committed row. A unique index + catch-and-reread was
     * chosen over a lock because it needs no lock on a row that doesn't
     * exist yet and works the same on every database driver.
     *
     * @param  Closure(int): int  $claimNumber  claims the next number for a tenant id
     * @return array{number: int, replayed: bool}
     */
    public static function claimOrReplay(int $tenantId, int $apiKeyId, string $idempotencyKey, Closure $claimNumber): array
    {
        if ($existing = static::findLive($tenantId, $apiKeyId, $idempotencyKey)) {
            return ['number' => (int) $existing->order_number, 'replayed' => true];
        }

        try {
            $number = DB::transaction(function () use ($tenantId, $apiKeyId, $idempotencyKey, $claimNumber) {
                static::pruneExpired();

                // An expired row for the same key must make room for the new one.
                DB::table('storefront_idempotency_keys')
                    ->where('tenant_id', $tenantId)
                    ->where('tenant_api_key_id', $apiKeyId)
                    ->where('idempotency_key', $idempotencyKey)
                    ->where('expires_at', '<=', now())
                    ->delete();

                $row = static::create([
                    'tenant_id' => $tenantId,
                    'tenant_api_key_id' => $apiKeyId,
                    'idempotency_key' => $idempotencyKey,
                    'expires_at' => now()->addHours(self::TTL_HOURS),
                ]);

                $number = $claimNumber($tenantId);
                $row->forceFill(['order_number' => $number])->save();

                return $number;
            });

            return ['number' => $number, 'replayed' => false];
        } catch (UniqueConstraintViolationException $e) {
            $winner = static::findLive($tenantId, $apiKeyId, $idempotencyKey);

            if (! $winner || $winner->order_number === null) {
                throw $e;
            }

            return ['number' => (int) $winner->order_number, 'replayed' => true];
        }
    }

    private static function findLive(int $tenantId, int $apiKeyId, string $idempotencyKey): ?self
    {
        return static::query()
            ->where('tenant_id', $tenantId)
            ->where('tenant_api_key_id', $apiKeyId)
            ->where('idempotency_key', $idempotencyKey)
            ->where('expires_at', '>', now())
            ->whereNotNull('order_number')
            ->first();
    }

    public static function pruneExpired(): int
    {
        return DB::table('storefront_idempotency_keys')
            ->where('expires_at', '<=', now())
            ->orderBy('expires_at')
            ->limit(self::PRUNE_BATCH)
            ->delete();
    }
}
