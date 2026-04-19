import { cn } from '@/lib/utils';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string | number;
    description?: React.ReactNode;
    icon?: React.ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    className?: string;
}

export function MetricCard({ title, value, description, icon, trend, className }: MetricCardProps) {
    return (
        <div className={cn('relative rounded-xl border border-border/60 bg-card px-3 py-3 md:px-5 md:py-4', className)}>
            {/* Trend bubble — floats in top-right corner */}
            {trend && (
                <span
                    className={cn(
                        'absolute top-3 right-3 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm',
                        trend.value === 0
                            ? 'bg-muted text-muted-foreground'
                            : trend.isPositive
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-800'
                              : 'bg-red-50 text-red-600 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-800',
                    )}
                >
                    {trend.value === 0 ? (
                        <Minus className="h-2.5 w-2.5" />
                    ) : trend.isPositive ? (
                        <TrendingUp className="h-2.5 w-2.5" />
                    ) : (
                        <TrendingDown className="h-2.5 w-2.5" />
                    )}
                    {trend.value > 0 ? '+' : ''}
                    {trend.value}%
                </span>
            )}

            {/* Title + icon (icon hidden when trend badge occupies the corner) */}
            <div className="flex items-center justify-between">
                <p className={cn('truncate text-xs font-medium tracking-wide text-muted-foreground uppercase', trend && 'pr-10')}>{title}</p>
                {icon && !trend && <span className="text-muted-foreground/50">{icon}</span>}
            </div>

            {/* Value */}
            <p className="mt-3 truncate text-xl leading-none font-bold tracking-tight md:text-2xl">{value}</p>

            {/* Description */}
            {description && <p className="mt-2 text-[11px] text-muted-foreground">{description}</p>}
        </div>
    );
}
