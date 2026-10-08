import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePolling } from '../use-polling';

type ReloadOptions = { only: string[]; onSuccess?: () => void; onCancel?: () => void; onFinish?: () => void };

const reload = vi.hoisted(() => vi.fn());
vi.mock('@inertiajs/react', () => ({ router: { reload } }));

const lastOptions = (): ReloadOptions => reload.mock.calls.at(-1)![0];

function setVisibility(state: 'visible' | 'hidden') {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
}

describe('usePolling', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        reload.mockReset();
        setVisibility('visible');
    });

    afterEach(() => vi.useRealTimers());

    it('reloads only the requested props after each interval', () => {
        renderHook(() => usePolling(['metrics', 'products'], 1000));

        vi.advanceTimersByTime(999);
        expect(reload).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(reload).toHaveBeenCalledTimes(1);
        expect(lastOptions().only).toEqual(['metrics', 'products']);
    });

    it('skips the reload while the tab is hidden and resumes when it is visible', () => {
        renderHook(() => usePolling(['metrics'], 1000));
        setVisibility('hidden');

        vi.advanceTimersByTime(3000);
        expect(reload).not.toHaveBeenCalled();

        setVisibility('visible');
        vi.advanceTimersByTime(1000);
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('does not start a new reload while the previous one is still in flight', () => {
        renderHook(() => usePolling(['metrics'], 1000));

        vi.advanceTimersByTime(1000);
        expect(reload).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(5000);
        expect(reload).toHaveBeenCalledTimes(1);

        lastOptions().onSuccess?.();
        lastOptions().onFinish?.();
        vi.advanceTimersByTime(1000);
        expect(reload).toHaveBeenCalledTimes(2);
    });

    it('backs off exponentially while reloads fail, up to the cap', () => {
        renderHook(() => usePolling(['metrics'], 1000, 4000));
        const fail = () => lastOptions().onFinish?.();

        vi.advanceTimersByTime(1000); // 1st reload at 1s
        fail();
        vi.advanceTimersByTime(1999); // next one waits 2s
        expect(reload).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(1);
        expect(reload).toHaveBeenCalledTimes(2);

        fail();
        vi.advanceTimersByTime(3999); // then 4s (the cap)
        expect(reload).toHaveBeenCalledTimes(2);
        vi.advanceTimersByTime(1);
        expect(reload).toHaveBeenCalledTimes(3);

        fail();
        vi.advanceTimersByTime(4000); // stays at the cap
        expect(reload).toHaveBeenCalledTimes(4);
    });

    it('goes back to the normal interval after a successful reload', () => {
        renderHook(() => usePolling(['metrics'], 1000, 8000));

        vi.advanceTimersByTime(1000);
        lastOptions().onFinish?.(); // failure -> next in 2s
        vi.advanceTimersByTime(2000);
        lastOptions().onSuccess?.();
        lastOptions().onFinish?.();

        vi.advanceTimersByTime(1000);
        expect(reload).toHaveBeenCalledTimes(3);
    });

    it('does not count a cancelled visit (the user navigated) as a failure', () => {
        renderHook(() => usePolling(['metrics'], 1000));

        vi.advanceTimersByTime(1000);
        lastOptions().onCancel?.();
        lastOptions().onFinish?.();

        vi.advanceTimersByTime(1000);
        expect(reload).toHaveBeenCalledTimes(2);
    });

    it('uses the latest props list without restarting the timer', () => {
        const { rerender } = renderHook(({ only }) => usePolling(only, 1000), { initialProps: { only: ['a'] } });

        vi.advanceTimersByTime(600);
        rerender({ only: ['b'] });
        vi.advanceTimersByTime(400);

        expect(reload).toHaveBeenCalledTimes(1);
        expect(lastOptions().only).toEqual(['b']);
    });

    it('stops polling when the component unmounts', () => {
        const { unmount } = renderHook(() => usePolling(['metrics'], 1000));

        unmount();
        vi.advanceTimersByTime(5000);

        expect(reload).not.toHaveBeenCalled();
    });
});
