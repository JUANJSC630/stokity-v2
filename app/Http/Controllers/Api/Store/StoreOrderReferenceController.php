<?php

namespace App\Http\Controllers\Api\Store;

use App\Http\Controllers\Controller;
use App\Models\StorefrontIdempotencyKey;
use App\Models\StorefrontOrderCounter;
use App\Models\TenantApiKey;
use App\Tenancy\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * The Lu Accesorios storefront has no orders table of its own — its
 * "checkout" builds a WhatsApp message with the cart summary and sends it
 * to wa.me/{number}; the actual Sale is entered manually in Stokity's POS
 * once the seller confirms over WhatsApp (see
 * LU_ACCESORIOS_STOREFRONT_PLAN.md §5.3 — nothing here creates a pedido).
 * This endpoint only mints the human-readable reference number ("000123")
 * that message quotes, so the conversation is professional and the buyer
 * has something to point back to. It never touches Sale/Order or any table
 * besides the counter itself.
 */
class StoreOrderReferenceController extends Controller
{
    /**
     * The number is the business's own counter, zero-padded to 6 digits, with
     * no prefix (decided by Juan: shorter codes read and scan better, e.g. on
     * barcodes). Counters are per business, so two businesses can both have a
     * "000001".
     *
     * Optional `Idempotency-Key` header (8-64 chars of A-Z a-z 0-9 _ -): the
     * same key from the same API key within 24 hours returns the SAME
     * number (200 + `Idempotency-Replayed: true`) instead of consuming a
     * new one (201). Without the header every call mints a new number, as
     * before.
     */
    public function store(Request $request): JsonResponse
    {
        $tenant = app(TenantManager::class)->get();

        $idempotencyKey = $request->header('Idempotency-Key');

        if ($idempotencyKey === null) {
            return $this->respond(StorefrontOrderCounter::claimNext($tenant->id), 201);
        }

        Validator::make(
            ['idempotency_key' => $idempotencyKey],
            ['idempotency_key' => ['required', 'string', 'regex:/^[A-Za-z0-9_-]{8,64}$/']],
            ['idempotency_key.regex' => 'La cabecera Idempotency-Key debe tener entre 8 y 64 caracteres (letras, números, guion y guion bajo).'],
        )->validate();

        /** @var TenantApiKey $apiKey */
        $apiKey = $request->attributes->get('storeApiKey');

        $result = StorefrontIdempotencyKey::claimOrReplay(
            $tenant->id,
            $apiKey->id,
            $idempotencyKey,
            fn (int $tenantId) => StorefrontOrderCounter::claimNext($tenantId),
        );

        return $this->respond($result['number'], $result['replayed'] ? 200 : 201, $result['replayed']);
    }

    private function respond(int $number, int $status, bool $replayed = false): JsonResponse
    {
        $orderNumber = str_pad((string) $number, 6, '0', STR_PAD_LEFT);

        return response()->json(
            ['order_number' => $orderNumber],
            $status,
            $replayed ? ['Idempotency-Replayed' => 'true'] : [],
        );
    }
}
