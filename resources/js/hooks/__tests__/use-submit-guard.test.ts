import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSubmitGuard } from '../use-submit-guard';

describe('useSubmitGuard', () => {
    it('starts idle', () => {
        const { result } = renderHook(() => useSubmitGuard());
        expect(result.current.submitting).toBe(false);
    });

    it('lets only the first of two synchronous starts through', () => {
        const { result } = renderHook(() => useSubmitGuard());
        let first = false;
        let second = false;

        act(() => {
            first = result.current.start();
            second = result.current.start();
        });

        expect(first).toBe(true);
        expect(second).toBe(false);
        expect(result.current.submitting).toBe(true);
    });

    it('allows a new submit after finish', () => {
        const { result } = renderHook(() => useSubmitGuard());

        act(() => {
            result.current.start();
        });
        act(() => {
            result.current.finish();
        });

        expect(result.current.submitting).toBe(false);

        let again = false;
        act(() => {
            again = result.current.start();
        });
        expect(again).toBe(true);
    });

    it('keeps start and finish referentially stable across renders', () => {
        const { result, rerender } = renderHook(() => useSubmitGuard());
        const { start, finish } = result.current;

        rerender();

        expect(result.current.start).toBe(start);
        expect(result.current.finish).toBe(finish);
    });
});
