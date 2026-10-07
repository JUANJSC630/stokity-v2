import { useCallback, useRef, useState } from 'react';

/**
 * Guards a submit action against double triggers (e.g. F9 pressed twice).
 * `start()` claims the slot synchronously through a ref, so a second call in the
 * same tick is rejected before React re-renders `submitting`.
 */
export function useSubmitGuard() {
    const inFlight = useRef(false);
    const [submitting, setSubmitting] = useState(false);

    const start = useCallback((): boolean => {
        if (inFlight.current) {
            return false;
        }
        inFlight.current = true;
        setSubmitting(true);
        return true;
    }, []);

    const finish = useCallback((): void => {
        inFlight.current = false;
        setSubmitting(false);
    }, []);

    return { submitting, start, finish };
}
