/*
 * Adapted from Bencho's "Pull to refresh" (https://bencho.dev/blocks/pull, MIT, Lorenzo Cabra).
 * Kept: the sheet stretches with the finger under a resistance curve, the pull is held at the line
 * while it works, springs back with a small overshoot, and a ring of drops spins behind it.
 * Changed for Stokity: it refreshes real data (onRefresh may return a promise and the spinner waits for
 * it), it only starts when the page is scrolled to the top, touch uses non-passive touch events so a
 * normal swipe still scrolls the page, the sheet content gets a `refresh` function (a visible button
 * is the keyboard / screen-reader path) and motion stops under prefers-reduced-motion.
 */
import { useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import styles from './pull-to-refresh.module.css';

const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));

const DEADZONE = 4;
const SQUASH = 8;
const GROW = 110;
const DROPS = 6;
const RING = 12;
const TUNE = 58;

type Phase = 'idle' | 'hold' | 'work';

const springOf = (tune: number) => ({ k: 0.08 + (tune / 100) * 0.16, d: 0.62 + (tune / 100) * 0.2 });

function useSpring(target: number, instant: boolean): number {
    const [at, setAt] = useState(target);
    const current = useRef(target);
    const velocity = useRef(0);

    useEffect(() => {
        if (instant) {
            current.current = target;
            velocity.current = 0;
            setAt(target);
            return;
        }

        const { k, d } = springOf(TUNE);
        let previous = 0;
        let frame = 0;
        const tick = (time: number) => {
            const dt = previous ? clamp((time - previous) / 16.67, 0, 2.5) : 1;
            previous = time;
            velocity.current += (target - current.current) * k * dt;
            velocity.current *= Math.pow(d, dt);
            current.current += velocity.current * dt;
            if (Math.abs(target - current.current) < 0.02 && Math.abs(velocity.current) < 0.02) {
                current.current = target;
                velocity.current = 0;
                setAt(target);
                return;
            }
            setAt(current.current);
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frame);
    }, [target, instant]);

    return at;
}

export interface PullToRefreshRenderProps {
    refresh: () => void;
    refreshing: boolean;
}

interface PullToRefreshProps {
    onRefresh: () => Promise<unknown> | void;
    children: (props: PullToRefreshRenderProps) => ReactNode;
    className?: string;
    /** Pixels the sheet is held at while refreshing, and the pull needed to commit. */
    threshold?: number;
    /** 0 to 100: how hard the sheet resists the pull. */
    resistance?: number;
    /** The drops stay at least this long so a fast response does not look like a glitch. */
    minDuration?: number;
    /** Announced to screen readers while refreshing. */
    busyLabel?: string;
}

export function PullToRefresh({ onRefresh, children, className, threshold = 58, resistance = 50, minDuration = 900, busyLabel = 'Actualizando…' }: PullToRefreshProps) {
    const reduced = useReducedMotion() ?? false;
    const sheet = useRef<HTMLDivElement | null>(null);
    const grab = useRef<{ x: number; y: number; on: boolean; touch: boolean } | null>(null);
    const alive = useRef(true);
    const timer = useRef(0);
    const [raw, setRaw] = useState(0);
    const [phase, setPhase] = useState<Phase>('idle');
    const phaseRef = useRef<Phase>('idle');
    const rawRef = useRef(0);
    const onRefreshRef = useRef(onRefresh);
    onRefreshRef.current = onRefresh;

    const move = (next: Phase) => {
        phaseRef.current = next;
        setPhase(next);
    };

    useEffect(() => {
        alive.current = true;

        return () => {
            alive.current = false;
            window.clearTimeout(timer.current);
        };
    }, []);

    const R = 700 - (resistance / 100) * 380;
    const drawn = (R * raw) / (R + raw);
    const target = phase === 'work' ? threshold : phase === 'hold' ? drawn : 0;
    const sprung = useSpring(target, reduced || phase === 'hold');
    const at = Math.max(0, sprung);
    const grow = sprung >= 0 ? GROW * Math.tanh(sprung / GROW) : Math.max(-SQUASH, sprung);
    const p = clamp(at / threshold, 0, 1);

    const refresh = useCallback(() => {
        if (phaseRef.current === 'work') return;
        move('work');
        const started = performance.now();
        const finish = () => {
            const wait = Math.max(0, minDuration - (performance.now() - started));
            timer.current = window.setTimeout(() => {
                if (alive.current) move('idle');
            }, wait);
        };
        let pending: Promise<unknown>;
        try {
            pending = Promise.resolve(onRefreshRef.current());
        } catch {
            pending = Promise.resolve();
        }
        pending.catch(() => undefined).finally(finish);
    }, [minDuration]);

    const begin = (x: number, y: number, touch: boolean) => {
        if (phaseRef.current === 'work' || window.scrollY > 0) return;
        grab.current = { x, y, on: false, touch };
    };

    /** Returns true once the gesture has become a pull, so touch can stop the page from scrolling. */
    const track = (x: number, y: number): boolean => {
        const g = grab.current;
        if (!g) return false;
        const dy = y - g.y;
        const dx = x - g.x;

        if (!g.on) {
            if (dy < -DEADZONE) {
                grab.current = null;
                return false;
            }
            if (Math.abs(dx) > DEADZONE && Math.abs(dx) > Math.abs(dy)) {
                grab.current = null;
                return false;
            }
            if (dy < DEADZONE) return false;
            g.on = true;
            window.getSelection()?.removeAllRanges();
        }

        move('hold');
        rawRef.current = Math.max(0, dy);
        setRaw(rawRef.current);

        return true;
    };

    const end = () => {
        const g = grab.current;
        grab.current = null;
        if (!g || !g.on) return;
        const pulled = rawRef.current;
        rawRef.current = 0;
        setRaw(0);
        const drawnNow = (R * pulled) / (R + pulled);
        if (drawnNow >= threshold) refresh();
        else move('idle');
    };

    useEffect(() => {
        const el = sheet.current;
        if (!el) return;
        const onStart = (e: TouchEvent) => {
            const t = e.touches[0];
            if (t) begin(t.clientX, t.clientY, true);
        };
        const onMove = (e: TouchEvent) => {
            const t = e.touches[0];
            if (t && track(t.clientX, t.clientY) && e.cancelable) e.preventDefault();
        };
        el.addEventListener('touchstart', onStart, { passive: true });
        el.addEventListener('touchmove', onMove, { passive: false });
        el.addEventListener('touchend', end);
        el.addEventListener('touchcancel', end);

        return () => {
            el.removeEventListener('touchstart', onStart);
            el.removeEventListener('touchmove', onMove);
            el.removeEventListener('touchend', end);
            el.removeEventListener('touchcancel', end);
        };
    });

    const onPointerDown = (e: ReactPointerEvent) => {
        if (e.pointerType === 'touch' || e.button !== 0) return;
        begin(e.clientX, e.clientY, false);
    };

    const onPointerMove = (e: ReactPointerEvent) => {
        if (e.pointerType === 'touch') return;
        if (track(e.clientX, e.clientY)) {
            try {
                e.currentTarget.setPointerCapture?.(e.pointerId);
            } catch {
                /* a synthetic pointer is not live; the pull works without capture */
            }
        }
    };

    const onPointerEnd = (e: ReactPointerEvent) => {
        if (e.pointerType === 'touch') return;
        end();
    };

    const spread = phase === 'work' ? RING : RING + 3 - p * 3;
    const turn = phase === 'work' ? 0 : p * 220;
    const style = {
        '--at': `${at.toFixed(2)}px`,
        '--grow': `${Math.max(0, grow).toFixed(2)}px`,
        '--p': p.toFixed(3),
        '--rpm': '1000ms',
    } as CSSProperties;

    return (
        <div className={[styles.root, className].filter(Boolean).join(' ')} data-phase={phase} style={style}>
            <div className={styles.goo} aria-hidden="true">
                {Array.from({ length: DROPS }, (_, i) => {
                    const angle = (((i / DROPS) * 360 + turn) * Math.PI) / 180;

                    return (
                        <span
                            key={i}
                            className={styles.drop}
                            style={{ '--dx': (Math.sin(angle) * spread).toFixed(2), '--dy': (-Math.cos(angle) * spread).toFixed(2) } as CSSProperties}
                        />
                    );
                })}
            </div>
            <div
                ref={sheet}
                className={styles.sheet}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
                onLostPointerCapture={onPointerEnd}
            >
                {children({ refresh, refreshing: phase === 'work' })}
            </div>
            <span className="sr-only" role="status">
                {phase === 'work' ? busyLabel : ''}
            </span>
        </div>
    );
}
