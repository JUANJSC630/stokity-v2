/*
 * Adapted from Bencho's "Icon bar" (https://bencho.dev/blocks/icon-bar, MIT, Lorenzo Cabra).
 * Kept: the indicator that stretches over the distance it travels and then settles
 * with a small overshoot. Changed for Stokity: items are real links driven by the
 * route, the indicator remembers where it was because every Inertia visit remounts
 * the layout, widths are fluid for a full-width phone bar, and the motion stops
 * under prefers-reduced-motion (see the CSS).
 */
import { Link } from '@inertiajs/react';
import { type LucideIcon } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import styles from './icon-nav.module.css';

export interface IconNavItem {
    key: string;
    label: string;
    icon: LucideIcon;
    href?: string;
    onSelect?: () => void;
    /** Raised, filled item in the middle (the main action). It never gets the indicator. */
    primary?: boolean;
}

interface Span {
    p: number;
    s: number;
}

type Phase = 'idle' | 'stretch' | 'settle';

const STRETCH_MS = 150;

export function IconNav({
    items,
    activeKey,
    label,
    memoryKey,
    primaryColors,
}: {
    items: IconNavItem[];
    activeKey: string | null;
    label: string;
    /** sessionStorage key used to start the indicator where it was before this page loaded. */
    memoryKey?: string;
    primaryColors?: { background: string; foreground: string };
}) {
    const trackRef = useRef<HTMLElement | null>(null);
    const refs = useRef<Record<string, HTMLElement | null>>({});
    const spanRef = useRef<Span | null>(null);
    const shownKey = useRef<string | null>(null);
    const timer = useRef<number | undefined>(undefined);
    const [span, setSpan] = useState<Span | null>(null);
    const [phase, setPhase] = useState<Phase>('idle');

    const isIndicated = (key: string | null): key is string => key !== null && items.some((item) => item.key === key && !item.primary);

    const measure = (key: string | null): Span | null => {
        if (!isIndicated(key)) return null;
        const el = refs.current[key];

        return el ? { p: el.offsetLeft, s: el.offsetWidth } : null;
    };

    const travel = (from: Span, to: Span) => {
        window.clearTimeout(timer.current);
        const start = Math.min(from.p, to.p);
        const end = Math.max(from.p + from.s, to.p + to.s);
        setPhase('stretch');
        setSpan({ p: start, s: end - start });
        timer.current = window.setTimeout(() => {
            spanRef.current = to;
            setPhase('settle');
            setSpan(to);
        }, STRETCH_MS);
    };

    const place = (to: Span | null) => {
        window.clearTimeout(timer.current);
        spanRef.current = to;
        setPhase('idle');
        setSpan(to);
    };

    useLayoutEffect(() => {
        const to = measure(activeKey);
        const lastKey = memoryKey ? safeRead(memoryKey) : null;
        const from = lastKey && lastKey !== activeKey ? measure(lastKey) : null;
        shownKey.current = activeKey;
        if (memoryKey && activeKey) safeWrite(memoryKey, activeKey);

        if (from && to) {
            place(from);
            const frame = requestAnimationFrame(() => requestAnimationFrame(() => travel(from, to)));

            return () => cancelAnimationFrame(frame);
        }
        place(to);
        // The first measurement only: later changes go through the effects below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (shownKey.current === activeKey) return;
        const from = spanRef.current;
        const to = measure(activeKey);
        shownKey.current = activeKey;
        if (memoryKey && activeKey) safeWrite(memoryKey, activeKey);
        if (from && to) travel(from, to);
        else place(to);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeKey]);

    useEffect(() => {
        const track = trackRef.current;
        if (!track || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => place(measure(shownKey.current)));
        observer.observe(track);

        return () => observer.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items.length]);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    const choose = (item: IconNavItem) => {
        item.onSelect?.();
        if (item.primary || item.onSelect || item.key === shownKey.current) return;
        const from = spanRef.current;
        const to = measure(item.key);
        shownKey.current = item.key;
        if (memoryKey) safeWrite(memoryKey, item.key);
        if (from && to) travel(from, to);
        else place(to);
    };

    const indicatorStyle: CSSProperties = span ? { transform: `translate3d(${span.p}px, 0, 0)`, width: span.s } : { opacity: 0 };
    const bubbleStyle = primaryColors ? ({ '--bubble-bg': primaryColors.background, '--bubble-fg': primaryColors.foreground } as CSSProperties) : undefined;

    return (
        <nav ref={trackRef} className={styles.nav} aria-label={label}>
            <span className={styles.ind} data-phase={phase} style={indicatorStyle} aria-hidden="true" />
            {items.map((item) => {
                const Icon = item.icon;
                const active = item.key === activeKey;
                const className = [styles.item, item.primary ? styles.primary : ''].filter(Boolean).join(' ');
                const content = (
                    <>
                        <span className={item.primary ? styles.bubble : styles.icon} style={item.primary ? bubbleStyle : undefined}>
                            <Icon size={item.primary ? 24 : 22} strokeWidth={2} aria-hidden="true" />
                        </span>
                        <span className={styles.label}>{item.label}</span>
                    </>
                );
                const setRef = (el: HTMLElement | null) => {
                    refs.current[item.key] = el;
                };

                return item.href ? (
                    <Link
                        key={item.key}
                        ref={setRef}
                        href={item.href}
                        prefetch
                        className={className}
                        data-active={active}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => choose(item)}
                    >
                        {content}
                    </Link>
                ) : (
                    <button key={item.key} ref={setRef} type="button" className={className} data-active={active} onClick={() => choose(item)}>
                        {content}
                    </button>
                );
            })}
        </nav>
    );
}

function safeRead(key: string): string | null {
    try {
        return sessionStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeWrite(key: string, value: string) {
    try {
        sessionStorage.setItem(key, value);
    } catch {
        /* storage unavailable: the indicator simply starts in place */
    }
}
