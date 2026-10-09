import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

/** Fades and lifts a list row in, one beat after the previous one; static under prefers-reduced-motion. */
export function StaggerItem({ index, children, className }: { index: number; children: ReactNode; className?: string }) {
    const reduced = useReducedMotion() ?? false;

    return (
        <motion.div
            className={className}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 8) * 0.05 }}
        >
            {children}
        </motion.div>
    );
}
