/*
 * Adapted from the odometer count of Bencho's "Like" (https://bencho.dev/blocks/like, MIT, Lorenzo Cabra).
 * Kept: one wheel per digit, only the digits that change roll, in the direction the number moved,
 * with the higher places following a beat later. Changed for Stokity: any formatter (so currency keeps its
 * separators), the full number is exposed to screen readers, and motion stops under prefers-reduced-motion.
 */
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import styles from './rolling-number.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;
const DURATION = 0.42;
const STAGGER = 0.04;

interface RollingNumberProps {
    value: number;
    format: (value: number) => string;
    className?: string;
    /** Rolls up from zero the first time it appears instead of showing the value straight away. */
    intro?: boolean;
}

export function RollingNumber({ value, format, className, intro = false }: RollingNumberProps) {
    const reduced = useReducedMotion() ?? false;
    const [shown, setShown] = useState(intro && !reduced ? 0 : value);
    const previous = useRef(shown);
    const up = shown >= previous.current;

    useEffect(() => {
        previous.current = shown;
    }, [shown]);

    useEffect(() => {
        setShown(value);
    }, [value]);

    const text = format(shown);
    const chars = Array.from(text);

    return (
        <span className={className}>
            <span className="sr-only">{format(value)}</span>
            <span className={styles.roll} aria-hidden="true">
                {chars.map((char, index) => {
                    const place = chars.length - 1 - index;
                    if (!/\d/.test(char)) {
                        return (
                            <span key={`s${place}${char}`} className={styles.fixed}>
                                {char}
                            </span>
                        );
                    }

                    return (
                        <span key={`p${place}`} className={styles.wheel}>
                            <AnimatePresence initial={false} mode="popLayout">
                                <motion.span
                                    key={char}
                                    className={styles.digit}
                                    initial={{ y: up ? '100%' : '-100%', opacity: 0 }}
                                    animate={{ y: '0%', opacity: 1 }}
                                    exit={{ y: up ? '-100%' : '100%', opacity: 0 }}
                                    transition={{ duration: reduced ? 0 : DURATION, ease: EASE, delay: reduced ? 0 : place * STAGGER }}
                                >
                                    {char}
                                </motion.span>
                            </AnimatePresence>
                        </span>
                    );
                })}
            </span>
        </span>
    );
}
