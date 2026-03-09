import { cn } from '@/lib/utils';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon?: React.ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    className?: string;
}

export function MetricCard({ title, value, description, icon, trend, className }: MetricCardProps) {
    return (
        <div className={cn('rounded-xl border border-border/60 bg-card px-5 py-4', className)}>
            {/* Title + icon */}
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
                {icon && <span className="text-muted-foreground/50">{icon}</span>}
            </div>

            {/* Value */}
            <p className="mt-3 text-2xl font-bold tracking-tight leading-none">{value}</p>

            {/* Description + trend */}
            <div className="mt-2 flex items-center gap-2">
                {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
                {trend && (
                    <span
                        className={cn(
                            'ml-auto inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            trend.value === 0
                                ? 'bg-muted text-muted-foreground'
                                : trend.isPositive
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
                        )}
                    >
                        {trend.value === 0 ? (
                            <Minus className="h-2.5 w-2.5" />
                        ) : trend.isPositive ? (
                            <TrendingUp className="h-2.5 w-2.5" />
                        ) : (
                            <TrendingDown className="h-2.5 w-2.5" />
                        )}
                        {trend.value > 0 ? '+' : ''}{trend.value}% hoy
                    </span>
                )}
            </div>
        </div>
    );
}
