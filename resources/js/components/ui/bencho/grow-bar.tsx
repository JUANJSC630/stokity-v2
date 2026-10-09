import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

/**
 * A bar that fills from empty when it first appears and eases to a new value afterwards.
 * Decorative: the figure it represents must be exposed as text next to it.
 */
export function GrowBar({ percent, className, delay = 0 }: { percent: number; className?: string; delay?: number }) {
    const [shown, setShown] = useState(false);

    useEffect(() => {
        setShown(true);
    }, []);

    return (
        <div
            className={cn('h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none', className)}
            style={{ width: shown ? `${percent}%` : '0%', transitionDelay: `${delay}ms` }}
        />
    );
}
