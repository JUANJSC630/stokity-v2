import type { Client } from '@/types';

export interface DiscountSuggestion {
    type: 'percentage';
    value: string;
}

/**
 * F1: the discount to auto-apply in the POS when a client is selected.
 * Pure function so the resolution logic is testable without mounting the
 * full POS page — the caller stays free to overwrite the discount for a
 * one-off sale that isn't actually wholesale (the POS's discount picker
 * has no permission gate, so this is never a hard rule, just a default).
 */
export function resolveWholesaleDiscount(client: Client | undefined): DiscountSuggestion | null {
    if (!client?.is_wholesale) return null;

    const pct = Number(client.wholesale_discount_pct);
    if (!Number.isFinite(pct) || pct <= 0) return null;

    return { type: 'percentage', value: String(pct) };
}
