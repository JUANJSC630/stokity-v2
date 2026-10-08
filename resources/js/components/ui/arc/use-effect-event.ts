import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * Stand-in for React 19.2's `useEffectEvent`, which the installed React (19.1)
 * does not ship: returns a stable function that always calls the latest callback.
 */
export function useEffectEvent<Args extends unknown[], Result>(callback: (...args: Args) => Result): (...args: Args) => Result {
    const latest = useRef(callback);

    useLayoutEffect(() => {
        latest.current = callback;
    });

    return useCallback((...args: Args) => latest.current(...args), []);
}
