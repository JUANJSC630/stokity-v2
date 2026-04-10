import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/format';
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
                    {sessions.data.length === 0 && (
                        <p className="px-4 py-8 text-center text-sm text-muted-foreground">No hay sesiones registradas</p>
                    )}

                    {/* Mobile: card list */}
                    <div className="divide-y divide-neutral-100 md:hidden dark:divide-neutral-800">
                        {sessions.data.map((s) => {
                            const totalSales =
                                Number(s.total_sales_cash) + Number(s.total_sales_card) +
                                Number(s.total_sales_transfer) + Number(s.total_sales_other);
                            const disc = Number(s.discrepancy ?? 0);
                            const discColor = disc === 0 ? 'text-green-600' : disc < 0 ? 'text-red-600' : 'text-amber-600';
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => router.visit(route('cash-sessions.show', s.id))}
                                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs text-muted-foreground">#{s.id}</span>
                                            <span className="font-medium">{s.branch?.name ?? '—'}</span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-muted-foreground">{s.opened_by?.name ?? '—'}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Apertura: {formatDateTime(s.opened_at)}
                                        </p>
                                        {s.closed_at && (
                                            <p className="text-xs text-muted-foreground">Cierre: {formatDateTime(s.closed_at)}</p>
                                        )}
                                    </div>
                                    <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                                        {s.status === 'open' ? (
                                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Abierta</Badge>
                                        ) : (
                                            <Badge className="bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">Cerrada</Badge>
                                        )}
                                        <span className="text-xs font-semibold text-green-700 dark:text-green-300">{formatCOP(totalSales)}</span>
                                        {s.status !== 'open' && (
                                            <span className={`text-xs font-medium ${discColor}`}>
                                                {(disc > 0 ? '+' : '') + formatCOP(disc)}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Desktop: full table */}
                    <div className="hidden overflow-x-auto md:block">
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
                                {sessions.data.map((s) => {
                                    const totalSales =
                                        Number(s.total_sales_cash) + Number(s.total_sales_card) +
                                        Number(s.total_sales_transfer) + Number(s.total_sales_other);
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
                                            <td className="px-4 py-3 text-muted-foreground">{formatDateTime(s.opened_at)}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{s.closed_at ? formatDateTime(s.closed_at) : '—'}</td>
                                            <td className="px-4 py-3 text-right">{formatCOP(s.opening_amount)}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-green-700 dark:text-green-300">{formatCOP(totalSales)}</td>
                                            <td className={`px-4 py-3 text-right font-semibold ${s.status === 'open' ? 'text-muted-foreground' : discColor}`}>
                                                {s.status === 'open' ? '—' : (disc > 0 ? '+' : '') + formatCOP(disc)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {s.status === 'open' ? (
                                                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Abierta</Badge>
                                                ) : (
                                                    <Badge className="bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">Cerrada</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {sessions.last_page > 1 && (() => {
                        const allLinks = sessions.links;
                        const pageLinks = allLinks.filter((l) => !isNaN(Number(l.label)));
                        const prevUrl = allLinks[0]?.url ?? null;
                        const nextUrl = allLinks[allLinks.length - 1]?.url ?? null;
                        const cur = sessions.current_page;
                        const last = sessions.last_page;
                        const start = Math.max(0, Math.min(cur - 3, pageLinks.length - 5));
                        const window5 = pageLinks.slice(start, start + 5);
                        const btnClass = (active: boolean, hasUrl: boolean) =>
                            `rounded px-2 py-1 text-xs transition-colors ${active ? 'bg-orange-500 font-bold text-white' : hasUrl ? 'border border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700' : 'cursor-default text-muted-foreground opacity-40'}`;
                        return (
                            <div className="flex flex-col items-center gap-2 border-t border-neutral-200 px-4 py-3 sm:flex-row sm:justify-between dark:border-neutral-700">
                                <p className="text-xs text-muted-foreground">
                                    Mostrando {sessions.from}–{sessions.to} de {sessions.total}
                                </p>
                                <div className="flex items-center gap-1">
                                    <button type="button" disabled={!prevUrl} onClick={() => prevUrl && router.visit(prevUrl)} className={btnClass(false, !!prevUrl)}>«</button>
                                    {start > 0 && (
                                        <>
                                            <button type="button" onClick={() => router.visit(pageLinks[0].url!)} className={btnClass(cur === 1, true)}>1</button>
                                            {start > 1 && <span className="px-0.5 text-xs text-muted-foreground">…</span>}
                                        </>
                                    )}
                                    {window5.map((link, i) => (
                                        <button key={i} type="button" disabled={!link.url} onClick={() => link.url && router.visit(link.url)} className={btnClass(!!link.active, !!link.url)}>
                                            {link.label}
                                        </button>
                                    ))}
                                    {start + 5 < pageLinks.length && (
                                        <>
                                            {start + 5 < pageLinks.length - 1 && <span className="px-0.5 text-xs text-muted-foreground">…</span>}
                                            <button type="button" onClick={() => router.visit(pageLinks[pageLinks.length - 1].url!)} className={btnClass(cur === last, true)}>{last}</button>
                                        </>
                                    )}
                                    <button type="button" disabled={!nextUrl} onClick={() => nextUrl && router.visit(nextUrl)} className={btnClass(false, !!nextUrl)}>»</button>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </AppLayout>
    );
}
