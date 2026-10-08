import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEffectEvent } from '../use-effect-event';

describe('useEffectEvent', () => {
    it('returns a function with a stable identity across renders', () => {
        const { result, rerender } = renderHook(({ value }) => useEffectEvent(() => value), { initialProps: { value: 1 } });
        const first = result.current;

        rerender({ value: 2 });

        expect(result.current).toBe(first);
    });

    it('always calls the latest callback', () => {
        const { result, rerender } = renderHook(({ value }) => useEffectEvent(() => value), { initialProps: { value: 1 } });
        expect(result.current()).toBe(1);

        rerender({ value: 2 });

        expect(result.current()).toBe(2);
    });

    it('forwards arguments and the return value', () => {
        const callback = vi.fn((a: number, b: number) => a + b);
        const { result } = renderHook(() => useEffectEvent(callback));

        expect(result.current(2, 3)).toBe(5);
        expect(callback).toHaveBeenCalledWith(2, 3);
    });
});
