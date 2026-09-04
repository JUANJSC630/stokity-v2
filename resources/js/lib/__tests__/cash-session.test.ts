import { describe, expect, it } from 'vitest';
import { isSessionOpenTooLong } from '../cash-session';

describe('isSessionOpenTooLong', () => {
    const openedAt = '2026-01-01T00:00:00Z';
    const oneHourMs = 60 * 60 * 1000;

    it('is false right after opening', () => {
        const now = new Date(openedAt).getTime();
        expect(isSessionOpenTooLong(openedAt, now)).toBe(false);
    });

    it('is false just under the 10h threshold', () => {
        const now = new Date(openedAt).getTime() + 10 * oneHourMs - 1;
        expect(isSessionOpenTooLong(openedAt, now)).toBe(false);
    });

    it('is true just over the 10h threshold', () => {
        const now = new Date(openedAt).getTime() + 10 * oneHourMs + 1;
        expect(isSessionOpenTooLong(openedAt, now)).toBe(true);
    });

    it('respects a custom threshold', () => {
        const now = new Date(openedAt).getTime() + 3 * oneHourMs;
        expect(isSessionOpenTooLong(openedAt, now, 2)).toBe(true);
        expect(isSessionOpenTooLong(openedAt, now, 4)).toBe(false);
    });
});
