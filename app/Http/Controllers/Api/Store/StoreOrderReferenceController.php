<?php

namespace App\Http\Controllers\Api\Store;

use App\Http\Controllers\Controller;
use App\Models\StorefrontOrderCounter;
use App\Tenancy\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

/**
 * The Lu Accesorios storefront has no orders table of its own — its
 * "checkout" builds a WhatsApp message with the cart summary and sends it
 * to wa.me/{number}; the actual Sale is entered manually in Stokity's POS
 * once the seller confirms over WhatsApp (see
 * LU_ACCESORIOS_STOREFRONT_PLAN.md §5.3 — nothing here creates a pedido).
 * This endpoint only mints the human-readable reference number ("LUACCESORIOS-000123")
 * that message quotes, so the conversation is professional and the buyer
 * has something to point back to. It never touches Sale/Order or any table
 * besides the counter itself.
 */
class StoreOrderReferenceController extends Controller
{
    public function store(): JsonResponse
    {
        $tenant = app(TenantManager::class)->get();

        $number = StorefrontOrderCounter::claimNext($tenant->id);

        $orderNumber = Str::upper($tenant->slug).'-'.str_pad((string) $number, 6, '0', STR_PAD_LEFT);

        return response()->json(['order_number' => $orderNumber], 201);
    }
}
