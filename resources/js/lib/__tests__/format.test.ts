import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatDateTime, formatTime } from '../format';

describe('formatDate', () => {
    it('formats an ISO string', () => {
        const result = formatDate('2026-03-13T15:45:00Z');
        expect(result).toContain('13');
        expect(result).toContain('2026');
    });

    it('formats a Date object', () => {
        const result = formatDate(new Date('2026-03-13T15:45:00Z'));
        expect(result).toContain('13');
        expect(result).toContain('2026');
    });

    it('returns dash for null', () => {
        expect(formatDate(null)).toBe('—');
    });

    it('returns dash for undefined', () => {
        expect(formatDate(undefined)).toBe('—');
    });

    it('returns dash for invalid date string', () => {
        expect(formatDate('not-a-date')).toBe('—');
    });
});

describe('formatDateTime', () => {
    it('includes date and time parts', () => {
        const result = formatDateTime('2026-03-13T15:45:00Z');
        expect(result).toContain('13');
        expect(result).toContain('2026');
    });

    it('returns dash for null', () => {
        expect(formatDateTime(null)).toBe('—');
    });

    it('returns dash for invalid date', () => {
        expect(formatDateTime('invalid')).toBe('—');
    });
});

describe('formatTime', () => {
    it('returns a time string', () => {
        const result = formatTime('2026-03-13T15:45:00Z');
        // Should contain hour:minute pattern
        expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('returns dash for null', () => {
        expect(formatTime(null)).toBe('—');
    });

    it('returns dash for undefined', () => {
        expect(formatTime(undefined)).toBe('—');
    });
});

describe('formatCurrency', () => {
    it('formats 12500 as COP currency', () => {
        const result = formatCurrency(12500);
        // Colombian format: $ 12.500 or similar
        expect(result).toContain('12.500');
    });

    it('formats 0 as $ 0', () => {
        const result = formatCurrency(0);
        // Intl may use non-breaking space between $ and 0
        expect(result.replace(/\u00a0/g, ' ')).toBe('$ 0');
    });

    it('returns $ 0 for null', () => {
        expect(formatCurrency(null)).toBe('$ 0');
    });

    it('returns $ 0 for undefined', () => {
        expect(formatCurrency(undefined)).toBe('$ 0');
    });

    it('returns $ 0 for NaN', () => {
        expect(formatCurrency(NaN)).toBe('$ 0');
    });

    it('formats negative amounts', () => {
        const result = formatCurrency(-5000);
        expect(result).toContain('5.000');
    });

    it('formats large numbers with separators', () => {
        const result = formatCurrency(1500000);
        expect(result).toContain('1.500.000');
    });
});
