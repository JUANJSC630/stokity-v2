import { Badge } from '@/components/ui/badge';
import { usePrinter } from '@/hooks/use-printer';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/format';
import { type BreadcrumbItem, type CashMovement, type CashSession } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface SalesDetail {
    method: string;
    name: string;
    count: number;
    total: number;
}

interface Props {
    session: CashSession;
    movements: (CashMovement & { user?: { id: number; name: string } })[];
    salesDetail: SalesDetail[];
}

function formatCOP(value: number | string | null | undefined) {
    const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
    if (isNaN(num as number)) return '$0';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(num as number);
}

function formatDuration(from: string, to: string | null) {
    if (!to) return '—';
    const mins = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Historial de Caja', href: '/cash-sessions' },
    { title: 'Arqueo', href: '#' },
];

export default function CashSessionShow({ session, movements, salesDetail }: Props) {
    const printer = usePrinter();
    const [printing, setPrinting] = useState(false);

    async function handlePrint() {
        if (printer.status !== 'connected' || !printer.selectedPrinter) {
            window.print();
            return;
        }
        setPrinting(true);
        try {
            await printer.printCashSession(session.id);
        } catch {
            window.print(); // fallback
        } finally {
            setPrinting(false);
        }
    }

    const openedAt = new Date(session.opened_at);
    const closedAt = session.closed_at ? new Date(session.closed_at) : null;

    const cashIn = movements.filter((m) => m.type === 'cash_in').reduce((s, m) => s + Number(m.amount), 0);
    const cashOut = movements.filter((m) => m.type === 'cash_out').reduce((s, m) => s + Number(m.amount), 0);

    const discrepancy = Number(session.discrepancy ?? 0);
    const discrepancyColor =
        discrepancy === 0
            ? 'text-green-600 dark:text-green-400'
            : discrepancy < 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-amber-600 dark:text-amber-400';

    const totalSales = salesDetail.reduce((s, r) => s + Number(r.total), 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Arqueo — Turno #${session.id}`} />

            <div className="mx-auto max-w-2xl space-y-4 p-4">
                {/* Header card */}
                <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                            <h1 className="text-lg font-bold">Turno #{session.id}</h1>
                            {session.branch && <p className="text-sm text-muted-foreground">Sucursal: {session.branch.name}</p>}
                            {session.opened_by && <p className="text-sm text-muted-foreground">Cajero: {session.opened_by.name}</p>}
                            <p className="text-sm text-muted-foreground">Apertura: {formatDateTime(openedAt)}</p>
                            {closedAt && <p className="text-sm text-muted-foreground">Cierre: {formatDateTime(closedAt)}</p>}
                            <p className="text-sm text-muted-foreground">Duración: {formatDuration(session.opened_at, session.closed_at)}</p>
                        </div>
                        <Badge
                            className={
                                session.status === 'open'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                    : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                            }
                        >
                            {session.status === 'open' ? 'Abierta' : 'Cerrada'}
                        </Badge>
                    </div>
                </div>

                {/* Sales by method */}
                <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                    <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
                        <h2 className="font-semibold">Ventas por método de pago</h2>
                    </div>
                    {salesDetail.length === 0 ? (
                        <p className="px-4 py-4 text-sm text-muted-foreground">Sin ventas en este turno</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-100 text-xs text-muted-foreground dark:border-neutral-800">
                                    <th className="px-4 py-2 text-left">Método</th>
                                    <th className="px-4 py-2 text-center"># Ventas</th>
                                    <th className="px-4 py-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {salesDetail.map((row) => (
                                    <tr key={row.method}>
                                        <td className="px-4 py-2">{row.name}</td>
                                        <td className="px-4 py-2 text-center">{row.count}</td>
                                        <td className="px-4 py-2 text-right font-semibold">{formatCOP(row.total)}</td>
                                    </tr>
                                ))}
                                <tr className="border-t-2 border-neutral-200 font-bold dark:border-neutral-700">
                                    <td className="px-4 py-2">Total</td>
                                    <td />
                                    <td className="px-4 py-2 text-right text-green-700 dark:text-green-300">{formatCOP(totalSales)}</td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Manual movements */}
                {movements.length > 0 && (
                    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                        <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
                            <h2 className="font-semibold">Movimientos manuales</h2>
                        </div>
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {movements.map((m) => (
                                <div key={m.id} className="flex items-center justify-between px-4 py-2 text-sm">
                                    <div>
                                        <span
                                            className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-semibold ${m.type === 'cash_in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                        >
                                            {m.type === 'cash_in' ? 'INGRESO' : 'EGRESO'}
                                        </span>
                                        {m.concept}
                                        {m.user && <span className="text-xs text-muted-foreground"> · {m.user.name}</span>}
                                    </div>
                                    <span className={`font-semibold ${m.type === 'cash_in' ? 'text-green-700' : 'text-red-600'}`}>
                                        {m.type === 'cash_in' ? '+' : '-'}
                                        {formatCOP(m.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Cuadre de caja */}
                {session.status === 'closed' && (
                    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                        <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
                            <h2 className="font-semibold">Cuadre de caja</h2>
                        </div>
                        <div className="divide-y divide-neutral-100 px-4 py-2 text-sm dark:divide-neutral-800">
                            <div className="flex justify-between py-1.5">
                                <span className="text-muted-foreground">+ Fondo inicial</span>
                                <span className="font-medium">{formatCOP(session.opening_amount)}</span>
                            </div>
                            <div className="flex justify-between py-1.5">
                                <span className="text-muted-foreground">+ Ventas en efectivo</span>
                                <span className="font-medium text-green-700">{formatCOP(session.total_sales_cash)}</span>
                            </div>
                            <div className="flex justify-between py-1.5">
                                <span className="text-muted-foreground">+ Ingresos manuales</span>
                                <span className="font-medium text-green-700">+{formatCOP(cashIn)}</span>
                            </div>
                            <div className="flex justify-between py-1.5">
                                <span className="text-muted-foreground">− Egresos manuales</span>
                                <span className="font-medium text-red-600">-{formatCOP(cashOut)}</span>
                            </div>
                            <div className="flex justify-between py-1.5">
                                <span className="text-muted-foreground">− Devoluciones efectivo</span>
                                <span className="font-medium text-red-600">-{formatCOP(session.total_refunds_cash)}</span>
                            </div>
                            <div className="flex justify-between py-2 font-bold">
                                <span>= Efectivo esperado</span>
                                <span>{formatCOP(session.expected_cash)}</span>
                            </div>
                            <div className="flex justify-between py-1.5">
                                <span className="text-muted-foreground">Efectivo contado</span>
                                <span className="font-semibold">{formatCOP(session.closing_amount_declared)}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="font-bold">Diferencia</span>
                                <span className={`text-lg font-bold ${discrepancyColor}`}>
                                    {discrepancy > 0 ? '+' : ''}
                                    {formatCOP(discrepancy)}
                                </span>
                            </div>
                        </div>

                        {session.total_sales_card > 0 || session.total_sales_transfer > 0 || session.total_sales_other > 0 ? (
                            <div className="border-t border-neutral-200 px-4 py-3 dark:border-neutral-700">
                                <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">Otros métodos</p>
                                <div className="space-y-1 text-sm">
                                    {Number(session.total_sales_card) > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Tarjeta</span>
                                            <span className="font-semibold">{formatCOP(session.total_sales_card)}</span>
                                        </div>
                                    )}
                                    {Number(session.total_sales_transfer) > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Transferencia</span>
                                            <span className="font-semibold">{formatCOP(session.total_sales_transfer)}</span>
                                        </div>
                                    )}
                                    {Number(session.total_sales_other) > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Otro</span>
                                            <span className="font-semibold">{formatCOP(session.total_sales_other)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => router.visit(route('cash-sessions.index'))}
                        className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700"
                    >
                        Historial
                    </button>
                    <button
                        type="button"
                        onClick={handlePrint}
                        disabled={printing}
                        className="flex-1 rounded-xl bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
                    >
                        {printing ? 'Imprimiendo...' : 'Imprimir'}
                    </button>
                </div>
            </div>
        </AppLayout>
    );
}
