import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type CreditSale } from '@/types';
import { Link } from '@inertiajs/react';
import { CreditStatusPill, CreditTypePill, DueDateNote } from './credit-meta';

const cop = (value: number): string => formatCurrency(Number(value));

interface CreditRowProps {
    credit: CreditSale;
    selected?: boolean;
    /** Desktop master-detail: pressing the row selects it instead of navigating. */
    onSelect?: (credit: CreditSale) => void;
}

/** One credit in the list: who, how it stands, how much is paid and how close the due date is. */
export function CreditRow({ credit, selected = false, onSelect }: CreditRowProps) {
    const paid = Number(credit.amount_paid);
    const total = Number(credit.total_amount);
    const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;

    return (
        <Link
            href={`/credits/${credit.id}`}
            aria-current={selected ? 'true' : undefined}
            onClick={(event) => {
                if (onSelect) {
                    event.preventDefault();
                    onSelect(credit);
                }
            }}
            className={cn(
                'relative flex flex-col gap-2.5 rounded-xl border p-4 transition-colors',
                selected ? 'border-[var(--brand-primary)]/40 bg-[var(--brand-primary-soft)]' : 'border-border/60 bg-card hover:bg-muted/50',
            )}
        >
            {selected && <span aria-hidden="true" className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-[var(--brand-primary)]" />}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate font-medium">{credit.client?.name ?? 'Sin cliente'}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span className="font-mono">{credit.code}</span>
                        <span>Vendedor: {credit.seller?.name}</span>
                    </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                    <CreditStatusPill status={credit.status} />
                    <CreditTypePill type={credit.type} className="border-0 px-0 py-0 text-[11px]" />
                </div>
            </div>

            <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold tabular-nums">
                        {cop(paid)} <span className="text-xs font-normal text-muted-foreground">/ {cop(total)}</span>
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">{Math.round(pct)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                        className={cn('h-full rounded-full', pct >= 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-blue-500' : 'bg-amber-500')}
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <div className="flex items-center justify-between gap-2">
                    <DueDateNote dueDate={credit.due_date} status={credit.status} />
                    {Number(credit.balance) > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground">
                            Falta: <span className="font-medium text-orange-600 dark:text-orange-400">{cop(credit.balance)}</span>
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
