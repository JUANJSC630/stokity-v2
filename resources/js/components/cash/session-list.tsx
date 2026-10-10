import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type Branch, type CashSession } from '@/types';
import { router } from '@inertiajs/react';
import { SessionMarker, SessionStatusPill, differenceText, differenceWord, formatCOP, formatDifference } from './cash-meta';

export type SessionRow = CashSession & {
    opened_by: { id: number; name: string };
    branch: Pick<Branch, 'id' | 'name'>;
    closed_by?: { id: number; name: string } | null;
};

const salesOf = (s: SessionRow): number =>
    Number(s.total_sales_cash) + Number(s.total_sales_card) + Number(s.total_sales_transfer) + Number(s.total_sales_other);

const open = (id: number) => router.visit(route('cash-sessions.show', id));

/** Phones: a card per shift with the sales, the difference and the state. */
export function SessionCards({ sessions }: { sessions: SessionRow[] }) {
    return (
        <ul className="divide-y divide-border/40" aria-label={`${sessions.length} turno(s)`}>
            {sessions.map((s) => {
                const isOpen = s.status === 'open';
                const diff = Number(s.discrepancy ?? 0);

                return (
                    <li key={s.id}>
                        <button
                            type="button"
                            onClick={() => open(s.id)}
                            className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted/60"
                        >
                            <SessionMarker open={isOpen} />
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="flex items-center justify-between gap-2">
                                    <span className="min-w-0 truncate text-[15px] font-semibold">
                                        <span className="font-mono text-xs font-normal text-muted-foreground">#{s.id}</span> {s.branch?.name ?? '—'}
                                    </span>
                                    <span className="shrink-0 text-[15px] font-bold text-green-700 tabular-nums dark:text-green-300">
                                        {formatCOP(salesOf(s))}
                                    </span>
                                </span>
                                <span className="text-xs text-muted-foreground">{s.opened_by?.name ?? '—'}</span>
                                <span className="text-xs text-muted-foreground">Apertura: {formatDateTime(s.opened_at)}</span>
                                {s.closed_at && <span className="text-xs text-muted-foreground">Cierre: {formatDateTime(s.closed_at)}</span>}
                                <span className="mt-1 flex items-center justify-between gap-2">
                                    <SessionStatusPill open={isOpen} className="px-2 py-0.5" />
                                    {!isOpen && (
                                        <span className={cn('text-xs font-semibold tabular-nums', differenceText(diff))}>
                                            {differenceWord(diff)} {diff !== 0 && formatDifference(diff)}
                                        </span>
                                    )}
                                </span>
                            </span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

const HEAD = 'px-3 py-3 font-medium';

/** Desktop: the history as a table whose rows open the shift. */
export function SessionTable({ sessions }: { sessions: SessionRow[] }) {
    return (
        <table className="w-full text-sm">
            <caption className="sr-only">Historial de turnos de caja</caption>
            <thead>
                <tr className="border-b border-border/60 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                    <th scope="col" className="px-6 py-3 font-medium">
                        #
                    </th>
                    <th scope="col" className={HEAD}>
                        Sucursal
                    </th>
                    <th scope="col" className={HEAD}>
                        Cajero
                    </th>
                    <th scope="col" className={HEAD}>
                        Apertura
                    </th>
                    <th scope="col" className={HEAD}>
                        Cierre
                    </th>
                    <th scope="col" className={cn(HEAD, 'text-right')}>
                        Fondo
                    </th>
                    <th scope="col" className={cn(HEAD, 'text-right')}>
                        Total ventas
                    </th>
                    <th scope="col" className={cn(HEAD, 'text-right')}>
                        Diferencia
                    </th>
                    <th scope="col" className={cn(HEAD, 'pr-6 text-center')}>
                        Estado
                    </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
                {sessions.map((s) => {
                    const isOpen = s.status === 'open';
                    const diff = Number(s.discrepancy ?? 0);

                    return (
                        <tr key={s.id} onClick={() => open(s.id)} className="cursor-pointer transition-colors hover:bg-muted/40">
                            <td className="px-6 py-3 font-mono text-muted-foreground">#{s.id}</td>
                            <td className="px-3 py-3 font-medium">{s.branch?.name ?? '—'}</td>
                            <td className="px-3 py-3">{s.opened_by?.name ?? '—'}</td>
                            <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{formatDateTime(s.opened_at)}</td>
                            <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{s.closed_at ? formatDateTime(s.closed_at) : '—'}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{formatCOP(s.opening_amount)}</td>
                            <td className="px-3 py-3 text-right font-semibold text-green-700 tabular-nums dark:text-green-300">
                                {formatCOP(salesOf(s))}
                            </td>
                            <td
                                className={cn(
                                    'px-3 py-3 text-right font-semibold tabular-nums',
                                    isOpen ? 'text-muted-foreground' : differenceText(diff),
                                )}
                            >
                                {isOpen ? '—' : formatDifference(diff)}
                            </td>
                            <td className="px-3 py-3 pr-6 text-center">
                                <SessionStatusPill open={isOpen} />
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
