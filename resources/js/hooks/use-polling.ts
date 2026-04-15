import { router } from '@inertiajs/react';
import { useEffect } from 'react';

/**
 * Polls an Inertia page by reloading only the specified props at a given interval.
 * Stops polling when the component unmounts or when the tab is hidden.
 *
 * @param only  - Array of prop keys to reload (e.g. ['products', 'metrics'])
 * @param intervalMs - Polling interval in milliseconds (default: 60000)
 */
export function usePolling(only: string[], intervalMs = 60_000) {
    useEffect(() => {
        const tick = () => {
            // Skip reload if tab is not visible to avoid unnecessary requests
            if (document.visibilityState === 'hidden') return;
            router.reload({ only });
        };

        const id = setInterval(tick, intervalMs);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [intervalMs]);
}
