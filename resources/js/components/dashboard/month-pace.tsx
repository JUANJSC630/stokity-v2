import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { formatCurrency } from '@/lib/format';
import { Link } from '@inertiajs/react';
import { TrendPill } from './trend-pill';

export interface PreviousMonth {
    revenue: number;
    revenue_same_period: number;
}

interface MonthPaceProps {
    revenue: number;
    sales: number;
    averageSale: number;
    previous?: PreviousMonth | null;
    /** Where the detailed month lives; only offered to those who can see it. */
    financesHref?: string;
}

const formatCount = (value: number) => value.toLocaleString('es-CO');

/** How the month is going: its revenue against the same point of the previous month and against that whole month. */
export function MonthPace({ revenue, sales, averageSale, previous, financesHref }: MonthPaceProps) {
    const hasPrevious = !!previous && previous.revenue > 0;
    const growth =
        previous && previous.revenue_same_period > 0
            ? Math.round(((revenue - previous.revenue_same_period) / previous.revenue_same_period) * 100)
            : null;
    const reached = hasPrevious ? Math.min(100, (revenue / previous.revenue) * 100) : 0;
    const marker = hasPrevious ? Math.min(100, (previous.revenue_same_period / previous.revenue) * 100) : 0;

    return (
        <section aria-label="Este mes" className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Este mes</h2>
                    <p className="mt-1.5 text-3xl leading-none font-semibold tracking-tight">
                        <RollingNumber value={revenue} format={formatCurrency} intro />
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                        {formatCount(sales)} {sales === 1 ? 'transacción' : 'transacciones'} · ticket promedio {formatCurrency(averageSale)} · bruto
                        antes de devoluciones
                    </p>
                </div>
                {growth !== null && (
                    <div className="flex flex-col items-end gap-1">
                        <TrendPill value={growth} />
                        <span className="text-[11px] text-muted-foreground">vs mismo punto del mes pasado</span>
                    </div>
                )}
            </div>

            {hasPrevious ? (
                <div className="mt-4">
                    <div
                        role="img"
                        aria-label={`Llevas el ${Math.round(reached)} % de lo que vendiste todo el mes pasado`}
                        className="relative h-2 overflow-hidden rounded-full bg-muted"
                    >
                        <span className="absolute inset-y-0 left-0 rounded-full bg-[var(--brand-primary)]" style={{ width: `${reached}%` }} />
                        <span aria-hidden="true" className="absolute inset-y-0 w-0.5 bg-foreground/60" style={{ left: `calc(${marker}% - 1px)` }} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                        {Math.round(reached)} % de los {formatCurrency(previous.revenue)} que vendiste todo el mes pasado
                        <span className="text-muted-foreground/70"> · la marca es dónde ibas a esta altura</span>
                    </p>
                </div>
            ) : (
                <p className="mt-4 text-xs text-muted-foreground">Aún no hay un mes anterior con ventas para comparar.</p>
            )}

            {financesHref && (
                <Link
                    href={financesHref}
                    className="mt-3 inline-flex min-h-11 items-center text-xs font-medium underline underline-offset-2 hover:text-foreground sm:min-h-8"
                >
                    Ver en Finanzas
                </Link>
            )}
        </section>
    );
}
