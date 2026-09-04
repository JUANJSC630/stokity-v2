import { describe, expect, it } from 'vitest';
import { resolveWholesaleDiscount } from '../wholesale-discount';
import type { Client } from '@/types';

function makeClient(overrides: Partial<Client> = {}): Client {
    return { id: 1, name: 'Test', ...overrides };
}

describe('resolveWholesaleDiscount', () => {
    it('returns null when no client is selected', () => {
        expect(resolveWholesaleDiscount(undefined)).toBeNull();
    });

    it('returns null for a non-wholesale client', () => {
        expect(resolveWholesaleDiscount(makeClient({ is_wholesale: false }))).toBeNull();
    });

    it('returns null for a wholesale client with no discount configured', () => {
        expect(resolveWholesaleDiscount(makeClient({ is_wholesale: true, wholesale_discount_pct: null }))).toBeNull();
    });

    it('returns the percentage discount for a wholesale client', () => {
        expect(resolveWholesaleDiscount(makeClient({ is_wholesale: true, wholesale_discount_pct: '15.00' }))).toEqual({
            type: 'percentage',
            value: '15',
        });
    });

    it('returns null for a wholesale client with a zero discount', () => {
        expect(resolveWholesaleDiscount(makeClient({ is_wholesale: true, wholesale_discount_pct: '0.00' }))).toBeNull();
    });
});
