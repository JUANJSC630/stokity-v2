import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface PaymentRow {
    method: string;
    group: 'cash' | 'card' | 'transfer' | 'other';
    count: number;
    total: number;
}

const GROUPS = [
    { key: 'cash', label: 'Efectivo', color: 'bg-emerald-500' },
    { key: 'card', label: 'Tarjeta', color: 'bg-sky-500' },
    { key: 'transfer', label: 'Transferencia', color: 'bg-violet-500' },
    { key: 'other', label: 'Otros', color: 'bg-neutral-400' },
] as const;

/** How today's money came in: one bar split by payment family, with the amount and share of each. */
export function PaymentMix({ rows, className }: { rows: PaymentRow[]; className?: string }) {
    const totals = GROUPS.map((group) => ({
        ...group,
        total: rows.filter((row) => row.group === group.key).reduce((sum, row) => sum + row.total, 0),
    })).filter((group) => group.total > 0);
    const grand = totals.reduce((sum, group) => sum + group.total, 0);

    if (grand <= 0) return null;

    const share = (total: number) => Math.round((total / grand) * 100);
    const summary = totals.map((group) => `${group.label} ${share(group.total)} %`).join(', ');

    return (
        <div className={cn('flex flex-col gap-3', className)}>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Cómo pagaron hoy</p>
            <div role="img" aria-label={`Formas de pago de hoy: ${summary}`} className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full">
                {totals.map((group) => (
                    <span
                        key={group.key}
                        className={cn('h-full min-w-1 first:rounded-l-full last:rounded-r-full', group.color)}
                        style={{ flexGrow: group.total }}
                    />
                ))}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                {totals.map((group) => (
                    <div key={group.key} className="min-w-0">
                        <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', group.color)} />
                            <span className="truncate">{group.label}</span>
                            <span className="tabular-nums">{share(group.total)} %</span>
                        </dt>
                        <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums">{formatCurrency(group.total)}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}
