import { useEffect } from 'react';

/**
 * Scrolls to the first form error when Inertia form errors change.
 * Works by finding elements with `text-destructive` or `text-red-500` class
 * that are direct children of form fields.
 */
export function useScrollToError(errors: Record<string, string | undefined>) {
    useEffect(() => {
        const hasErrors = Object.values(errors).some(Boolean);
        if (!hasErrors) return;

        // Small delay to ensure error messages are rendered
        const timer = setTimeout(() => {
            const errorEl = document.querySelector('.text-destructive, .text-red-500');
            if (errorEl) {
                errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 50);

        return () => clearTimeout(timer);
    }, [errors]);
}
