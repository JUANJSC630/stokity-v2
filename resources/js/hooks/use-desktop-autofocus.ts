import { useEffect, type RefObject } from 'react';

const DESKTOP_MIN_WIDTH = 768;

/** Focuses the field on large screens only: on a phone it would open the keyboard over the form. */
export function useDesktopAutofocus(ref: RefObject<HTMLElement | null>) {
    useEffect(() => {
        if (window.innerWidth >= DESKTOP_MIN_WIDTH) ref.current?.focus();
    }, [ref]);
}
