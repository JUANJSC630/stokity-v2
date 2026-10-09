/*
 * Adapted from the chart of Bencho's "Pull to refresh" card (https://bencho.dev/blocks/pull, MIT, Lorenzo Cabra).
 * Kept: the Catmull-Rom curve that passes through every value, and the scrub that glides a tip along it.
 * Changed for Stokity: controlled scrub (the parent shows the scrubbed value), a keyboard path (arrow keys),
 * a summary for screen readers, and the brand color.
 */
import { type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import styles from './spark-line.module.css';

const W = 100;
const H = 40;
const PAD = 4;

const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));

export function sparkCurve(values: number[]) {
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const span = hi - lo || 1;
    const points = values.map((v, i) => ({
        x: values.length === 1 ? 0 : (i / (values.length - 1)) * W,
        y: values.every((v0) => v0 === values[0]) ? H / 2 : H - PAD - ((v - lo) / span) * (H - PAD * 2),
    }));

    const segments = points.slice(0, -1).map((p1, i) => {
        const p0 = points[i - 1] ?? p1;
        const p2 = points[i + 1];
        const p3 = points[i + 2] ?? p2;

        return {
            p1,
            p2,
            c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
            c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
        };
    });

    let d = `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    for (const s of segments) {
        d += ` C${s.c1.x.toFixed(2)} ${s.c1.y.toFixed(2)} ${s.c2.x.toFixed(2)} ${s.c2.y.toFixed(2)} ${s.p2.x.toFixed(2)} ${s.p2.y.toFixed(2)}`;
    }

    /** Point on the curve at a fractional index (0 to values.length - 1). */
    const at = (u: number) => {
        if (segments.length === 0) return points[0];
        const index = Math.min(segments.length - 1, Math.max(0, Math.floor(u)));
        const s = segments[index];
        const t = clamp(u - index, 0, 1);
        const m = 1 - t;

        return {
            x: m ** 3 * s.p1.x + 3 * m * m * t * s.c1.x + 3 * m * t * t * s.c2.x + t ** 3 * s.p2.x,
            y: m ** 3 * s.p1.y + 3 * m * m * t * s.c1.y + 3 * m * t * t * s.c2.y + t ** 3 * s.p2.y,
        };
    };

    return { d, area: `${d} L${W} ${H} L0 ${H} Z`, at };
}

interface SparkLineProps {
    values: number[];
    /** Fractional index being scrubbed, or null at rest. */
    scrub: number | null;
    onScrub: (index: number | null) => void;
    /** Describes the whole series for screen readers. */
    label: string;
    /** Describes one point, announced while moving with the keyboard. */
    describe: (index: number) => string;
    className?: string;
}

export function SparkLine({ values, scrub, onScrub, label, describe, className }: SparkLineProps) {
    if (values.length === 0) return null;
    const last = values.length - 1;
    const curve = sparkCurve(values);
    const shown = scrub ?? last;
    const tip = curve.at(shown);
    const nearest = Math.round(shown);

    const scrubAt = (event: ReactPointerEvent) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const t = clamp((event.clientX - rect.left) / (rect.width || 1), 0, 1);
        onScrub(t * last);
    };

    const onKeyDown = (event: KeyboardEvent) => {
        const step = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : 0;
        if (step !== 0) {
            event.preventDefault();
            onScrub(clamp(Math.round(scrub ?? last) + step, 0, last));
        } else if (event.key === 'Home') {
            event.preventDefault();
            onScrub(0);
        } else if (event.key === 'End' || event.key === 'Escape') {
            event.preventDefault();
            onScrub(event.key === 'End' ? last : null);
        }
    };

    return (
        <span
            className={[styles.plot, className].filter(Boolean).join(' ')}
            data-scrub={scrub !== null || undefined}
            role="slider"
            tabIndex={0}
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={last}
            aria-valuenow={nearest}
            aria-valuetext={describe(nearest)}
            onPointerDown={scrubAt}
            onPointerMove={scrubAt}
            onPointerLeave={() => onScrub(null)}
            onPointerCancel={() => onScrub(null)}
            onKeyDown={onKeyDown}
            onBlur={() => onScrub(null)}
        >
            <svg className={styles.line} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
                <path className={styles.area} d={curve.area} />
                <path className={styles.curve} d={curve.d} />
            </svg>
            <i className={styles.guide} style={{ left: `${tip.x}%` }} />
            <i className={styles.tip} style={{ left: `${tip.x}%`, ['--tip' as string]: (tip.y / H).toFixed(4) } as CSSProperties} />
        </span>
    );
}
