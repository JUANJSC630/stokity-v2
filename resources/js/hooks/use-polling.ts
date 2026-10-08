import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';

/**
 * Polls an Inertia page by reloading only the specified props at a given interval.
 *
 * - Nothing is sent while the tab is hidden.
 * - A reload is never started while the previous one is still running, so a slow
 *   server is not buried under queued requests.
 * - While reloads keep failing (server or database down) the delay doubles up to
 *   `maxBackoffMs`, and goes back to `intervalMs` after the first success. A visit
 *   cancelled because the user navigated does not count as a failure.
 * - Stops when the component unmounts.
 *
 * @param only          - Prop keys to reload (e.g. ['products', 'metrics']); the latest list is always used
 * @param intervalMs    - Normal polling interval in milliseconds (default: 60000)
 * @param maxBackoffMs  - Longest delay while failing (default: 5 minutes)
 */
export function usePolling(only: string[], intervalMs = 60_000, maxBackoffMs = 5 * 60_000) {
    const latestOnly = useRef(only);
    latestOnly.current = only;

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        let stopped = false;
        let inFlight = false;
        let failures = 0;

        const schedule = () => {
            if (stopped) return;
            timer = setTimeout(tick, Math.min(intervalMs * 2 ** failures, maxBackoffMs));
        };

        const tick = () => {
            if (document.visibilityState === 'hidden' || inFlight) {
                schedule();
                return;
            }

            inFlight = true;
            let outcome: 'failed' | 'succeeded' | 'cancelled' = 'failed';

            router.reload({
                only: latestOnly.current,
                onSuccess: () => {
                    outcome = 'succeeded';
                },
                onCancel: () => {
                    outcome = 'cancelled';
                },
                onFinish: () => {
                    inFlight = false;
                    if (outcome === 'succeeded') failures = 0;
                    else if (outcome === 'failed') failures += 1;
                    schedule();
                },
            });
        };

        schedule();

        return () => {
            stopped = true;
            clearTimeout(timer);
        };
    }, [intervalMs, maxBackoffMs]);
}
