/*
 * Adapted from Bencho's "Slide to confirm" (https://bencho.dev/blocks/slide-confirm, MIT, Lorenzo Cabra).
 * Kept: the handle follows the finger exactly, past the end it takes over, and on commit it
 * unfurls leftward to fill the track while its right edge stays put (width = GRIP + anchor - x,
 * so the edge is stationary by arithmetic, not by two animations agreeing).
 * Changed for Stokity: fluid width, onConfirm / disabled / labels in props, a keyboard and
 * screen-reader path (the original is pointer-only), reduced-motion support and brand colors.
 */
import { ArrowRight, Check } from 'lucide-react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import styles from './slide-confirm.module.css';

const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));

const HEIGHT = 56;
const PAD = 4;
const GRIP = HEIGHT - PAD * 2;
const MIN_SPAN = 200;
const FALLBACK_SPAN = 280;
const CORNER = HEIGHT / 2;
const SWELL = 1.03;
/** How long the finished state stands before the control resets, so a rejected action can be retried. */
const HOLD_MS = 1500;
/** Stiffness of the commit spring; the damping is derived to sit exactly on critical so nothing overshoots the wall. */
const STIFFNESS = 560;

const SPRING = { type: 'spring' as const, stiffness: STIFFNESS, damping: 2 * Math.sqrt(STIFFNESS * 0.9), mass: 0.9 };
const HOME = { ...SPRING, damping: SPRING.damping * 0.62 };

export interface SlideConfirmProps {
    label: string;
    confirmedLabel: string;
    onConfirm: () => void;
    disabled?: boolean;
    /** Fill of the handle and the crossed ground. Defaults to the foreground color. */
    ink?: string;
    /** Color of the content drawn on the ink. Defaults to the background color. */
    onInk?: string;
    className?: string;
}

export function SlideConfirm({ label, confirmedLabel, onConfirm, disabled = false, ink, onInk, className }: SlideConfirmProps) {
    const reduced = useReducedMotion() ?? false;
    const rootRef = useRef<HTMLDivElement | null>(null);
    const track = useRef<HTMLDivElement | null>(null);
    const [measured, setMeasured] = useState<number | null>(null);
    const [done, setDone] = useState(false);
    const [held, setHeld] = useState(false);
    const [hot, setHot] = useState(false);
    const grip = useRef<{ id: number; grab: number | null } | null>(null);
    const resetTimer = useRef(0);
    const loose = useRef<(() => void) | null>(null);
    const live = useRef<{ move: (e: PointerEvent) => void; up: (e: PointerEvent) => void }>({ move: () => {}, up: () => {} });

    const x = useMotionValue(0);
    const anchor = useMotionValue(0);
    const pulse = useMotionValue(1);
    const shown = useMotionValue(1);

    const span = Math.max(MIN_SPAN, Math.round(measured ?? FALLBACK_SPAN));
    const travel = span - PAD * 2 - GRIP;
    const travelRef = useRef(travel);
    travelRef.current = travel;

    useLayoutEffect(() => {
        const el = rootRef.current;
        if (!el) return;
        setMeasured(el.getBoundingClientRect().width);
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(([entry]) => entry && setMeasured(entry.contentRect.width));
        observer.observe(el);

        return () => observer.disconnect();
    }, []);

    useEffect(
        () => () => {
            window.clearTimeout(resetTimer.current);
            loose.current?.();
        },
        [],
    );

    const radius = CORNER;
    const gripRadius = Math.max(0, radius - PAD);

    const seen = useTransform(x, (v) => clamp(v, 0, travelRef.current));
    const wide = useTransform([seen, anchor], ([v, a]: number[]) => GRIP + clamp(a - v, 0, travelRef.current));
    const over = useTransform(x, (v) => Math.max(0, -v));
    const squash = useTransform(over, (o) => 1 - Math.min(0.08, o / 110));
    const wash = useTransform(seen, (v) => v + GRIP);
    const say = useTransform(seen, (v) => 1 - clamp(v / (travelRef.current * 0.55 || 1), 0, 1));
    const arrow = useTransform([seen, shown], ([v, on]: number[]) => on * clamp(1 - (v - travelRef.current * 0.55) / (travelRef.current * 0.4 || 1), 0, 1));
    const swelling = hot && !held && !done && !disabled;
    const sx = useTransform(squash, (q) => q * (swelling ? SWELL : 1));
    const sy = useTransform(squash, (q) => (1 / q) * (swelling ? SWELL : 1));

    const local = (clientX: number) => {
        const box = track.current?.getBoundingClientRect();
        if (!box) return 0;

        return (clientX - box.left) / ((box.width / span) || 1);
    };

    const finish = () => {
        if (done || disabled) return;
        setDone(true);
        anchor.set(x.get());
        animate(shown, 0, { duration: reduced ? 0 : 0.12 });
        animate(x, 0, reduced ? { duration: 0 } : SPRING);
        if (!reduced) animate(pulse, [1, 0.974, 1], { duration: 0.46, times: [0, 0.62, 1], ease: [0.33, 0.55, 0.2, 1], delay: 0.1 });
        onConfirm();
        resetTimer.current = window.setTimeout(() => {
            setDone(false);
            animate(shown, 1, { duration: reduced ? 0 : 0.2, delay: reduced ? 0 : 0.12 });
            animate(anchor, 0, reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 34, mass: 0.9 });
        }, HOLD_MS);
    };

    const watch = () => {
        loose.current?.();
        const onMove = (e: PointerEvent) => live.current.move(e);
        const onUp = (e: PointerEvent) => {
            live.current.up(e);
            loose.current?.();
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        loose.current = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            loose.current = null;
        };
    };

    const down = (e: ReactPointerEvent) => {
        if (done || disabled) return;
        e.stopPropagation();
        grip.current = { id: e.pointerId, grab: null };
        setHeld(true);
        try {
            track.current?.setPointerCapture(e.pointerId);
        } catch {
            /* a synthetic pointer is not live; the drag works without capture */
        }
        watch();
    };

    const move = (e: PointerEvent) => {
        const g = grip.current;
        if (!g || g.id !== e.pointerId) return;
        const at = local(e.clientX);
        if (g.grab === null) {
            g.grab = at - x.get();
            return;
        }
        x.set(clamp(at - g.grab, 0, travelRef.current));
    };

    const up = (e: PointerEvent) => {
        if (!grip.current) return;
        grip.current = null;
        try {
            track.current?.releasePointerCapture?.(e.pointerId);
        } catch {
            /* never captured */
        }
        setHeld(false);
        if (x.get() >= travelRef.current) finish();
        else animate(x, 0, reduced ? { duration: 0 } : HOME);
    };

    live.current = { move, up };

    const activateFromKeyboard = (e: ReactMouseEvent) => {
        // A pointer click reports detail >= 1; Enter and Space on the focused handle report 0.
        if (e.detail === 0) finish();
    };

    const rootStyle = { '--slide-ink': ink, '--slide-on-ink': onInk } as CSSProperties;

    return (
        <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')} style={rootStyle} data-disabled={disabled || undefined}>
            <motion.div
                className={styles.track}
                ref={track}
                style={{ borderRadius: radius, scale: pulse }}
                data-held={held || undefined}
                data-done={done || undefined}
                onPointerDown={down}
            >
                <motion.i className={styles.wash} aria-hidden="true" style={{ width: wash, borderRadius: gripRadius }} />
                <motion.span className={styles.say} style={{ opacity: say }} aria-hidden="true">
                    {label}
                </motion.span>
                <motion.button
                    type="button"
                    className={styles.grip}
                    disabled={disabled}
                    aria-label={done ? confirmedLabel : label}
                    onPointerEnter={() => setHot(true)}
                    onPointerLeave={() => setHot(false)}
                    onClick={activateFromKeyboard}
                    style={{ x: seen, scaleX: sx, scaleY: sy, width: wide, borderRadius: gripRadius }}
                >
                    <motion.span className={styles.arrow} style={{ opacity: arrow }} aria-hidden="true">
                        <ArrowRight size={20} strokeWidth={2.4} />
                    </motion.span>
                    <motion.span
                        className={styles.done}
                        aria-hidden="true"
                        initial={false}
                        animate={{ opacity: done ? 1 : 0, scale: done ? 1 : 0.7 }}
                        transition={{ duration: reduced ? 0 : 0.18, ease: [0.33, 0.55, 0.2, 1] }}
                    >
                        <Check size={19} strokeWidth={2.8} />
                        {confirmedLabel}
                    </motion.span>
                </motion.button>
            </motion.div>
            <span className="sr-only" role="status">
                {done ? confirmedLabel : ''}
            </span>
        </div>
    );
}
