/*
 * Adapted from Bencho's "Drag stepper" (https://bencho.dev/blocks/stepper, MIT, Lorenzo Cabra).
 * Kept: tap for one step, hold to sweep (after WAKE ms the rail appears and a horizontal drag runs the value),
 * the pressed end sinking and the pill widening while it sweeps, pointer capture that can never block the handler.
 * Changed for Stokity: the value is controlled and typed (the number is a real input that keeps its text while
 * it is edited and normalizes on blur), a configurable min/max/sweep range, the buttons are real buttons with
 * names and a keyboard path (arrow keys on the number), 44 px height, and motion stops under prefers-reduced-motion.
 */
import { cn } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import styles from './drag-stepper.module.css';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** How long a press has to last before it turns from a tap into a sweep. */
const WAKE = 260;

/** Pointer capture is best effort: it throws for a pointer the element does not own and must never skip the rest of the handler. */
function grab(event: ReactPointerEvent) {
    try {
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
        // the gesture still works through ordinary bubbling
    }
}

interface DragStepperProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    /** What a full pill width of dragging is worth while sweeping. */
    sweepRange?: number;
    /** Names the control for assistive technology, e.g. "Cantidad de Manillas". */
    label: string;
    className?: string;
    height?: number;
    placeholder?: string;
}

export function DragStepper({ value, onChange, min = 1, max = 9999, sweepRange = 100, label, className, height = 44, placeholder }: DragStepperProps) {
    const [draft, setDraft] = useState(String(value));
    const [sweeping, setSweeping] = useState(false);
    const [held, setHeld] = useState<-1 | 0 | 1>(0);
    const rail = useRef<HTMLDivElement | null>(null);
    const timer = useRef<number | undefined>(undefined);
    const from = useRef({ x: 0, value: 0, dir: 1 as 1 | -1, stepped: false });
    const sweepingRef = useRef(false);
    /** A pointer gesture already did what the click that follows it would do (assistive tech and keyboards click without pointer events). */
    const pointerHandled = useRef(false);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    useEffect(() => {
        setDraft((current) => (Number(current) === value ? current : String(value)));
    }, [value]);

    function commit(next: number) {
        const normalized = clamp(Math.round(next), min, max);
        setDraft(String(normalized));
        onChange(normalized);
    }

    function press(dir: 1 | -1) {
        return (event: ReactPointerEvent) => {
            event.stopPropagation();
            from.current = { x: event.clientX, value, dir, stepped: false };
            setHeld(dir);
            sweepingRef.current = false;
            timer.current = window.setTimeout(() => {
                sweepingRef.current = true;
                setSweeping(true);
            }, WAKE);
            grab(event);
        };
    }

    function drag(event: ReactPointerEvent) {
        if (!sweepingRef.current) return;
        const width = rail.current?.offsetWidth || 200;
        commit(from.current.value + ((event.clientX - from.current.x) / width) * sweepRange);
    }

    function lift() {
        window.clearTimeout(timer.current);
        setHeld(0);
        if (!sweepingRef.current && !from.current.stepped) {
            from.current.stepped = true;
            commit(value + from.current.dir);
        }
        pointerHandled.current = true;
        sweepingRef.current = false;
        setSweeping(false);
    }

    function activate(dir: 1 | -1) {
        return () => {
            if (pointerHandled.current) {
                pointerHandled.current = false;
                return;
            }
            commit(value + dir);
        };
    }

    const span = max - min || 1;

    return (
        <div className={cn(styles.well, className)} style={{ '--stepper-height': `${height}px` } as CSSProperties}>
            <div className={styles.pill} data-sweep={sweeping} data-press={!sweeping && held ? (held < 0 ? 'l' : 'r') : undefined} ref={rail}>
                <button
                    type="button"
                    className={styles.side}
                    aria-label={`Menos ${label}`}
                    disabled={value <= min}
                    onPointerDown={press(-1)}
                    onPointerMove={drag}
                    onPointerUp={lift}
                    onPointerCancel={lift}
                    onClick={activate(-1)}
                >
                    <Minus size={16} strokeWidth={2} aria-hidden="true" />
                </button>

                <input
                    className={styles.value}
                    type="number"
                    inputMode="numeric"
                    min={min}
                    max={max}
                    step={1}
                    placeholder={placeholder}
                    aria-label={label}
                    value={draft}
                    onChange={(event) => {
                        const text = event.target.value;
                        setDraft(text);
                        const parsed = Math.floor(Number(text));
                        if (text !== '' && parsed >= min) onChange(clamp(parsed, min, max));
                    }}
                    onBlur={() => {
                        const parsed = Math.floor(Number(draft));
                        commit(draft !== '' && parsed >= min ? parsed : min);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'ArrowUp') {
                            event.preventDefault();
                            commit(value + 1);
                        } else if (event.key === 'ArrowDown') {
                            event.preventDefault();
                            commit(value - 1);
                        }
                    }}
                    onFocus={(event) => event.target.select()}
                />

                <button
                    type="button"
                    className={styles.side}
                    aria-label={`Más ${label}`}
                    disabled={value >= max}
                    onPointerDown={press(1)}
                    onPointerMove={drag}
                    onPointerUp={lift}
                    onPointerCancel={lift}
                    onClick={activate(1)}
                >
                    <Plus size={16} strokeWidth={2} aria-hidden="true" />
                </button>

                <i className={styles.fill} style={{ transform: `scaleX(${clamp((value - min) / span, 0, 1)})` }} aria-hidden="true" />
            </div>
        </div>
    );
}
