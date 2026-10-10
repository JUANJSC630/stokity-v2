import { Section } from '@/components/sales/form-fields';
import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';
import { MovementKind, formatCOP } from './cash-meta';

export interface SalesRow {
    method: string;
    name: string;
    count: number;
    total?: number;
}

/** Sales of a shift by payment method; a blind cashier sees only the counts. */
export function SalesByMethod({
    title,
    rows,
    isBlind,
    totalLabel,
    total,
}: {
    title: string;
    rows: SalesRow[];
    isBlind: boolean;
    totalLabel: string;
    total: number;
}) {
    return (
        <Section title={title}>
            {rows.length === 0 ? (
                <p className="px-5 pb-5 text-sm text-muted-foreground">Sin ventas en este turno</p>
            ) : (
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-y border-border/60 text-[11px] tracking-wide text-muted-foreground uppercase">
                            <th scope="col" className="px-5 py-2.5 text-left font-medium">
                                Método
                            </th>
                            <th scope="col" className="px-3 py-2.5 text-center font-medium">
                                # Ventas
                            </th>
                            {!isBlind && (
                                <th scope="col" className="px-5 py-2.5 text-right font-medium">
                                    Total
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                        {rows.map((row) => (
                            <tr key={row.method}>
                                <td className="px-5 py-3">{row.name}</td>
                                <td className="px-3 py-3 text-center tabular-nums">{row.count}</td>
                                {!isBlind && <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatCOP(row.total ?? 0)}</td>}
                            </tr>
                        ))}
                        {!isBlind && (
                            <tr className="border-t-2 border-border font-bold">
                                <td className="px-5 py-3">{totalLabel}</td>
                                <td />
                                <td className="px-5 py-3 text-right text-green-700 tabular-nums dark:text-green-300">{formatCOP(total)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </Section>
    );
}

export interface ManualMovement {
    id: number;
    type: string;
    concept: string;
    amount?: number;
    notes?: string | null;
    user?: { id: number; name: string };
}

/** Cash put in or taken out by hand during the shift; the detail line is the cashier (history) or the note (close form). */
export function ManualMovements({
    movements,
    isBlind,
    detail,
    footer,
}: {
    movements: ManualMovement[];
    isBlind: boolean;
    detail: 'user' | 'notes';
    footer?: ReactNode;
}) {
    return (
        <Section title="Movimientos manuales">
            <ul className="divide-y divide-border/40 border-t border-border/60">
                {movements.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                        <div className="min-w-0">
                            <MovementKind type={m.type} /> <span className="ml-1">{m.concept}</span>
                            {detail === 'user' && m.user && <span className="text-xs text-muted-foreground"> · {m.user.name}</span>}
                            {detail === 'notes' && m.notes && <span className="text-xs text-muted-foreground"> · {m.notes}</span>}
                        </div>
                        {!isBlind && (
                            <span
                                className={cn(
                                    'shrink-0 font-semibold tabular-nums',
                                    m.type === 'cash_in' ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                                )}
                            >
                                {m.type === 'cash_in' ? '+' : '-'}
                                {formatCOP(m.amount ?? 0)}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
            {footer}
        </Section>
    );
}
