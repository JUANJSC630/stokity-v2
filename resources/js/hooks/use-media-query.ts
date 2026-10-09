import { useEffect, useState } from 'react';

/** Tracks a CSS media query; `false` where `matchMedia` does not exist (tests, SSR). */
export function useMediaQuery(query: string): boolean {
    const read = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false);
    const [matches, setMatches] = useState(read);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
        const list = window.matchMedia(query);
        const onChange = () => setMatches(list.matches);
        onChange();
        list.addEventListener?.('change', onChange);
        return () => list.removeEventListener?.('change', onChange);
    }, [query]);

    return matches;
}
