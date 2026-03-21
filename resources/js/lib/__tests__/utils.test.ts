import { describe, expect, it } from 'vitest';
import { cn } from '../utils';

describe('cn (class names merger)', () => {
    it('merges two class strings', () => {
        expect(cn('px-2', 'py-3')).toBe('px-2 py-3');
    });

    it('resolves Tailwind conflicts (last wins)', () => {
        const result = cn('px-2', 'px-4');
        expect(result).toBe('px-4');
    });

    it('handles conditional classes', () => {
        const isHidden = false;
        const result = cn('base', isHidden && 'hidden', 'visible');
        expect(result).toBe('base visible');
    });

    it('handles undefined and null inputs', () => {
        const result = cn('base', undefined, null, 'end');
        expect(result).toBe('base end');
    });

    it('returns empty string for no inputs', () => {
        expect(cn()).toBe('');
    });

    it('handles array inputs', () => {
        const result = cn(['px-2', 'py-3']);
        expect(result).toBe('px-2 py-3');
    });

    it('deduplicates equivalent Tailwind classes', () => {
        const result = cn('text-red-500', 'text-blue-500');
        expect(result).toBe('text-blue-500');
    });
});
