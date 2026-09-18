<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

/**
 * One row per tenant, holding the next storefront order-reference number to
 * hand out — see StoreOrderReferenceController. Deliberately does NOT use
 * BelongsToTenant/TenantScope: claimNext() takes an explicit tenant id and
 * talks to the table directly (query builder, not Eloquent), because the
 * atomicity this exists for (insertOrIgnore + lockForUpdate + update, all
 * in one transaction) needs precise control over exactly which statements
 * run — an implicit global scope woven into that would only obscure it.
 *
 * This table has nothing to do with Sale/Order — no row here ever creates,
 * mirrors, or links to a Sale. It only ever produces a string like
 * "LUACCESORIOS-000123" for a storefront's WhatsApp-checkout message (see
 * LU_ACCESORIOS_STOREFRONT_PLAN.md §5.3: nothing here creates a pedido).
 */
class StorefrontOrderCounter extends Model
{
    protected $fillable = [
        'tenant_id',
        'next_number',
    ];

    protected $casts = [
        'next_number' => 'integer',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Atomically claims and returns the next order-reference number for
     * $tenantId, incrementing the stored counter so two concurrent callers
     * never receive the same value.
     *
     * insertOrIgnore() runs first so a tenant's very first claim isn't
     * itself a race: two concurrent first-ever calls would otherwise both
     * try to INSERT the same (unique) tenant_id and one would fail. Once
     * the row is known to exist, SELECT ... FOR UPDATE inside the
     * transaction blocks a second concurrent caller until the first
     * commits its UPDATE — the standard read-increment-write pattern for a
     * shared counter, not the count()+retry pattern used elsewhere in this
     * codebase for *codes* (Sale/CreditSale/WholesaleSale), which tolerates
     * occasional collisions by retrying; a counter must never collide at
     * all, so it needs the row lock instead.
     */
    public static function claimNext(int $tenantId): int
    {
        return DB::transaction(function () use ($tenantId) {
            DB::table('storefront_order_counters')->insertOrIgnore([
                'tenant_id' => $tenantId,
                'next_number' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $row = DB::table('storefront_order_counters')
                ->where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->first();

            DB::table('storefront_order_counters')
                ->where('tenant_id', $tenantId)
                ->update([
                    'next_number' => $row->next_number + 1,
                    'updated_at' => now(),
                ]);

            return (int) $row->next_number;
        });
    }
}
