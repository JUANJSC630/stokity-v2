import { describe, expect, it } from 'vitest';
import { suggestBills } from '../pos-cash';

describe('suggestBills', () => {
    it('falls back to the usual bills when there is no total', () => {
        expect(suggestBills(0)).toEqual([10000, 20000, 50000, 100000]);
    });

    it('rounds a total up to each denomination, unique and ascending', () => {
        expect(suggestBills(45000)).toEqual([45000, 46000, 50000, 60000, 100000]);
    });

    it('includes the exact total when it already is a round amount', () => {
        expect(suggestBills(20000)).toContain(20000);
    });

    it('never suggests an amount below the total', () => {
        for (const total of [1, 999, 1001, 7350, 38250, 123456, 999999]) {
            expect(suggestBills(total).every((bill) => bill >= total)).toBe(true);
        }
    });

    it('returns at most six suggestions in ascending order', () => {
        const bills = suggestBills(1234);
        expect(bills.length).toBeLessThanOrEqual(6);
        expect([...bills].sort((a, b) => a - b)).toEqual(bills);
    });

    it('treats a total of 1 peso as needing the smallest denomination first', () => {
        expect(suggestBills(1)[0]).toBe(1000);
    });
});
