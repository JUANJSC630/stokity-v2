import { DateField, FilterSelect, ReportKpi } from '@/components/reports/report-parts';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency } from '@/lib/format';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Building2, RotateCcw, TrendingUp, Vault } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reportes', href: '/reports' },
    { title: 'Balance de Caja', href: '/reports/cash-balance' },
];

interface PaymentRow {
    payment_method: string;
    sale_count: number;
    revenue: number;
    total_received: number;
    total_change: number;
}

interface BranchBalance {
    branch_id: number;
    branch_name: string;
    return_count: number;
    payment_rows: PaymentRow[];
    net_cash: number;
    total_revenue: number;
}

interface AvailableBranch {
    id: number;
    name: string;
}

interface Props {
    data: BranchBalance[];
    filters: { date: string; branch_id?: string | number | null };
    availableBranches: AvailableBranch[];
    isAdmin: boolean;
}

const PAYMENT_LABELS: Record<string, string> = {
    cash: 'Efectivo',
    credit_card: 'Tarjeta de crédito',
    debit_card: 'Tarjeta débito',
    transfer: 'Transferencia',
    nequi: 'Nequi',
    daviplata: 'Daviplata',
};

function paymentLabel(code: string) {
    return PAYMENT_LABELS[code] ?? code;
}

function formatCOP(value: number) {
    return formatCurrency(value);
}

export default function CashBalance({ data, filters, availableBranches, isAdmin }: Props) {
    const [date, setDate] = useState(filters.date);
    const [branchId, setBranchId] = useState(String(filters.branch_id ?? ''));

    function applyFilters(newDate = date, newBranch = branchId) {
        router.get(
            route('reports.cash-balance'),
            { date: newDate, ...(newBranch ? { branch_id: newBranch } : {}) },
            { preserveState: true, replace: true },
        );
    }

    const grandTotal = data.reduce((s, b) => s + b.total_revenue, 0);
    const grandNetCash = data.reduce((s, b) => s + b.net_cash, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Balance de Caja" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
                            <Vault className="size-6 text-[var(--brand-primary)]" aria-hidden="true" />
                            Balance de Caja
                        </h1>
                        <p className="text-sm text-muted-foreground">Resumen de ingresos por sucursal y método de pago</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:w-auto sm:grid-cols-[11rem_11rem]">
                        <DateField
                            id="cash-date"
                            label="Fecha"
                            value={date}
                            onChange={(value) => {
                                setDate(value);
                                applyFilters(value, branchId);
                            }}
                        />
                        {isAdmin && availableBranches.length > 0 && (
                            <FilterSelect
                                id="cash-branch"
                                label="Sucursal"
                                value={branchId || 'all'}
                                onChange={(v) => {
                                    const val = v === 'all' ? '' : v;
                                    setBranchId(val);
                                    applyFilters(date, val);
                                }}
                                allLabel="Todas las sucursales"
                                options={availableBranches.map((b) => ({ value: String(b.id), label: b.name }))}
                            />
                        )}
                    </div>
                </div>

                {data.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <ReportKpi label="Total ingresos" icon={<TrendingUp className="size-4" />} tone="text-green-700 dark:text-green-300">
                            {formatCOP(grandTotal)}
                        </ReportKpi>
                        <ReportKpi label="Efectivo neto en caja" icon={<Vault className="size-4" />} tone="text-amber-700 dark:text-amber-300">
                            {formatCOP(grandNetCash)}
                        </ReportKpi>
                        <ReportKpi label="Sucursales activas" icon={<Building2 className="size-4" />}>
                            {data.length}
                        </ReportKpi>
                    </div>
                )}

                {data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 py-20 text-muted-foreground">
                        <Vault className="size-12 opacity-20" aria-hidden="true" />
                        <p className="text-sm">No hay ventas registradas para esta fecha</p>
                    </div>
                ) : (
                    <div className="grid gap-5 md:grid-cols-2">
                        {data.map((branch) => (
                            <section
                                key={branch.branch_id}
                                aria-label={branch.branch_name}
                                className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 sm:p-5"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold">
                                        <Building2 className="size-4 shrink-0 text-[var(--brand-primary)]" aria-hidden="true" />
                                        <span className="truncate">{branch.branch_name}</span>
                                    </h2>
                                    <span className="text-sm font-bold text-green-700 tabular-nums dark:text-green-300">
                                        {formatCOP(branch.total_revenue)}
                                    </span>
                                </div>

                                <table className="w-full text-sm" aria-label={`Métodos de pago de ${branch.branch_name}`}>
                                    <thead>
                                        <tr className="border-b border-border/60 text-xs text-muted-foreground">
                                            <th className="py-1.5 text-left font-normal">Método de pago</th>
                                            <th className="py-1.5 text-center font-normal">Ventas</th>
                                            <th className="py-1.5 text-right font-normal">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                        {branch.payment_rows.map((row) => (
                                            <tr key={row.payment_method}>
                                                <td className="py-2">{paymentLabel(row.payment_method)}</td>
                                                <td className="py-2 text-center text-muted-foreground">{row.sale_count}</td>
                                                <td className="py-2 text-right font-medium tabular-nums">{formatCOP(row.revenue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {branch.payment_rows.some((r) => r.payment_method === 'cash') && (
                                    <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800 dark:bg-amber-900/20">
                                        <div>
                                            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Efectivo neto en caja</p>
                                            <p className="text-[11px] text-amber-600 dark:text-amber-400">Cobrado − cambio entregado</p>
                                        </div>
                                        <span className="text-base font-bold text-amber-700 tabular-nums dark:text-amber-300">
                                            {formatCOP(branch.net_cash)}
                                        </span>
                                    </div>
                                )}

                                {branch.return_count > 0 && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <RotateCcw className="size-3.5 text-red-400" aria-hidden="true" />
                                        <span>
                                            {branch.return_count} {branch.return_count === 1 ? 'devolución registrada' : 'devoluciones registradas'}
                                        </span>
                                    </div>
                                )}
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
