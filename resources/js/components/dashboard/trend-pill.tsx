import { cn } from '@/lib/utils';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

/** A signed percentage change as a small green / red / neutral pill. */
export function TrendPill({ value }: { value: number }) {
    const Icon = value === 0 ? Minus : value > 0 ? TrendingUp : TrendingDown;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                value === 0
                    ? 'bg-muted text-muted-foreground'
                    : value > 0
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
            )}
        >
            <Icon className="h-3 w-3" aria-hidden="true" />
            {value > 0 ? '+' : ''}
            {value}%
        </span>
    );
}
