import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem, type CashSession, type PaginatedData } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

type SessionRow = CashSession & {
    opened_by: { id: number; name: string };
    branch: { id: number; name: string };
    closed_by?: { id: number; name: string } | null;
};

interface Props {
    sessions: PaginatedData<SessionRow>;
    filters: {
        date_from?: string;
        date_to?: string;
        branch_id?: string;
    };
    availableBranches: Branch[];
}

function formatCOP(value: number | string | null | undefined) {
    const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
    if (isNaN(num as number)) return '$0';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(num as number);
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Historial de Caja', href: '/cash-sessions' }];

export default function CashSessionIndex({ sessions, filters, availableBranches }: Props) {
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? '');
    const [branchId, setBranchId] = useState(filters.branch_id ?? '');

    function applyFilters() {
        router.get(
            route('cash-sessions.index'),
            {
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                branch_id: branchId || undefined,
            },
            { preserveState: true },
        );
    }

    function clearFilters() {
        setDateFrom('');
        setDateTo('');
        setBranchId('');
        router.get(route('cash-sessions.index'), {}, { preserveState: false });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Historial de Caja" />

            <div className="space-y-4 p-4">
                {/* Filters */}
                <div className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Desde</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Hasta</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                        />
                    </div>
                    {availableBranches.length > 1 && (
                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">Sucursal</label>
                            <select
                                value={branchId}
                                onChange={(e) => setBranchId(e.target.value)}
                                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                            >
                                <option value="">Todas</option>
                                {availableBranches.map((b) => (
                                    <option key={b.id} value={String(b.id)}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={applyFilters}
                            className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
                        >
                            Filtrar
                        </button>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-muted-foreground hover:bg-neutral-50 dark:border-neutral-700"
                        >
                            Limpiar
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-200 text-xs text-muted-foreground dark:border-neutral-700">
                                    <th className="px-4 py-3 text-left">#</th>
                                    <th className="px-4 py-3 text-left">Sucursal</th>
                                    <th className="px-4 py-3 text-left">Cajero</th>
                                    <th className="px-4 py-3 text-left">Apertura</th>
                                    <th className="px-4 py-3 text-left">Cierre</th>
                                    <th className="px-4 py-3 text-right">Fondo</th>
                                    <th className="px-4 py-3 text-right">Total ventas</th>
                                    <th className="px-4 py-3 text-right">Diferencia</th>
                                    <th className="px-4 py-3 text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {sessions.data.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                                            No hay sesiones registradas
                                        </td>
                                    </tr>
                                )}
                                {sessions.data.map((s) => {
                                    const totalSales =
                                        Number(s.total_sales_cash) +
                                        Number(s.total_sales_card) +
                                        Number(s.total_sales_transfer) +
                                        Number(s.total_sales_other);
                                    const disc = Number(s.discrepancy ?? 0);
                                    const discColor = disc === 0 ? 'text-green-600' : disc < 0 ? 'text-red-600' : 'text-amber-600';
                                    return (
                                        <tr
                                            key={s.id}
                                            onClick={() => router.visit(route('cash-sessions.show', s.id))}
                                            className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800"
                                        >
                                            <td className="px-4 py-3 font-mono text-muted-foreground">#{s.id}</td>
                                            <td className="px-4 py-3">{s.branch?.name ?? '—'}</td>
                                            <td className="px-4 py-3">{s.opened_by?.name ?? '—'}</td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {new Date(s.opened_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {s.closed_at
                                                    ? new Date(s.closed_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right">{formatCOP(s.opening_amount)}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-green-700 dark:text-green-300">
                                                {formatCOP(totalSales)}
                                            </td>
                                            <td
                                                className={`px-4 py-3 text-right font-semibold ${s.status === 'open' ? 'text-muted-foreground' : discColor}`}
                                            >
                                                {s.status === 'open' ? '—' : (disc > 0 ? '+' : '') + formatCOP(disc)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {s.status === 'open' ? (
                                                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                                        Abierta
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                                                        Cerrada
                                                    </Badge>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {sessions.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 dark:border-neutral-700">
                            <p className="text-xs text-muted-foreground">
                                Mostrando {sessions.from}–{sessions.to} de {sessions.total}
                            </p>
                            <div className="flex gap-1">
                                {sessions.links.map((link, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.visit(link.url)}
                                        className={`rounded px-2 py-1 text-xs transition-colors ${link.active ? 'bg-orange-500 font-bold text-white' : link.url ? 'border border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700' : 'cursor-default text-muted-foreground opacity-40'}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
