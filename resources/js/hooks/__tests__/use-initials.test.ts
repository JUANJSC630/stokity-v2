import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useInitials } from '../use-initials';

describe('useInitials', () => {
    it('returns two initials for "Juan Pérez"', () => {
        const { result } = renderHook(() => useInitials());
        expect(result.current('Juan Pérez')).toBe('JP');
    });

    it('returns one initial for a single name', () => {
        const { result } = renderHook(() => useInitials());
        expect(result.current('Admin')).toBe('A');
    });

    it('uses first and last name for three-word names', () => {
        const { result } = renderHook(() => useInitials());
        expect(result.current('Juan Carlos García')).toBe('JG');
    });

    it('returns empty string for empty input', () => {
        const { result } = renderHook(() => useInitials());
        expect(result.current('')).toBe('');
    });

    it('uppercases lowercase names', () => {
        const { result } = renderHook(() => useInitials());
        expect(result.current('maria lopez')).toBe('ML');
    });

    it('handles leading/trailing whitespace', () => {
        const { result } = renderHook(() => useInitials());
        expect(result.current('  Ana Ruiz  ')).toBe('AR');
    });

    it('callback is referentially stable', () => {
        const { result, rerender } = renderHook(() => useInitials());
        const first = result.current;
        rerender();
        expect(result.current).toBe(first);
    });
});
