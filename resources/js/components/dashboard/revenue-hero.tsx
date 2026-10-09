import { PullToRefresh } from '@/components/ui/bencho/pull-to-refresh';
import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { SparkLine } from '@/components/ui/bencho/spark-line';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Minus, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';

export interface DailySale {
    date: string;
    total_sales: number;
    total_amount: number;
}

interface RevenueHeroProps {
    revenueToday: number;
    revenueGrowth: number;
    salesToday: number;
    averageSale: number;
    dailySales: DailySale[];
    onRefresh: () => Promise<unknown> | void;
}

/** A plain Y-m-d day as that calendar day, so the timezone cannot move it. */
const dayOf = (date: string): Date => {
    const [year, month, day] = date.split('-').map(Number);

    return new Date(year, (month || 1) - 1, day || 1);
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const formatCount = (value: number) => value.toLocaleString('es-CO');

function TrendPill({ value }: { value: number }) {
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

export function RevenueHero({ revenueToday, revenueGrowth, salesToday, averageSale, dailySales, onRefresh }: RevenueHeroProps) {
    const [scrub, setScrub] = useState<number | null>(null);
    const values = dailySales.map((day) => day.total_amount);
    const index = scrub === null ? null : Math.round(scrub);
    const scrubbed = index === null ? null : dailySales[index];

    const describe = (i: number) => {
        const day = dailySales[i];

        return day
            ? `${capitalize(format(dayOf(day.date), "EEEE d 'de' MMMM", { locale: es }))}: ${formatCurrency(day.total_amount)}, ${day.total_sales} ventas`
            : '';
    };

    return (
        <PullToRefresh onRefresh={onRefresh} className="rounded-2xl">
            {({ refresh, refreshing }) => (
                <section aria-label="Ingresos" className="p-4 md:p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                {scrubbed ? capitalize(format(dayOf(scrubbed.date), "EEEE d 'de' MMM", { locale: es })) : 'Ingresos hoy'}
                            </p>
                            <p className="mt-1.5 text-4xl leading-none font-semibold tracking-tight md:text-5xl">
                                {scrubbed ? (
                                    <span className="tabular-nums">{formatCurrency(scrubbed.total_amount)}</span>
                                ) : (
                                    <RollingNumber value={revenueToday} format={formatCurrency} />
                                )}
                            </p>
                            <div className="mt-3 flex min-h-6 items-center gap-2 text-xs text-muted-foreground">
                                {scrubbed ? (
                                    <span>
                                        {scrubbed.total_sales} {scrubbed.total_sales === 1 ? 'venta' : 'ventas'}
                                    </span>
                                ) : (
                                    <>
                                        <TrendPill value={revenueGrowth} />
                                        <span>frente a ayer</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={refresh}
                            disabled={refreshing}
                            aria-label="Actualizar datos"
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
                        >
                            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden="true" />
                        </button>
                    </div>

                    {values.length > 1 && (
                        <div className="mt-4">
                            <SparkLine values={values} scrub={scrub} onScrub={setScrub} label="Ingresos de los últimos 7 días" describe={describe} />
                            <div className="mt-1 flex justify-between text-[11px] font-medium text-muted-foreground" aria-hidden="true">
                                {dailySales.map((day, i) => (
                                    <span key={day.date} className={cn('w-4 text-center', index === i && 'text-foreground')}>
                                        {format(dayOf(day.date), 'EEEEE', { locale: es }).toUpperCase()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-border/60 pt-4">
                        <div className="min-w-0">
                            <dt className="text-xs text-muted-foreground">Ventas hoy</dt>
                            <dd className="mt-0.5 text-xl font-semibold">
                                <RollingNumber value={salesToday} format={formatCount} />
                            </dd>
                        </div>
                        <div className="min-w-0">
                            <dt className="text-xs text-muted-foreground">Ticket promedio</dt>
                            <dd className="mt-0.5 truncate text-xl font-semibold">
                                <RollingNumber value={averageSale} format={formatCurrency} />
                            </dd>
                        </div>
                    </dl>
                </section>
            )}
        </PullToRefresh>
    );
}
