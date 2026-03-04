import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
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
    cash:         'Efectivo',
    credit_card:  'Tarjeta de crédito',
    debit_card:   'Tarjeta débito',
    transfer:     'Transferencia',
    nequi:        'Nequi',
    daviplata:    'Daviplata',
};

function paymentLabel(code: string) {
    return PAYMENT_LABELS[code] ?? code;
}

function formatCOP(value: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

export default function CashBalance({ data, filters, availableBranches, isAdmin }: Props) {
    const [date, setDate]       = useState(filters.date);
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

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold">
                            <Vault className="h-6 w-6 text-[#C850C0]" />
                            Balance de Caja
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Resumen de ingresos por sucursal y método de pago
                        </p>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex flex-col gap-1">
                            <Label className="text-xs">Fecha</Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => {
                                    setDate(e.target.value);
                                    applyFilters(e.target.value, branchId);
                                }}
                                className="h-9 w-44 text-sm"
                            />
                        </div>

                        {isAdmin && availableBranches.length > 0 && (
                            <div className="flex flex-col gap-1">
                                <Label className="text-xs">Sucursal</Label>
                                <Select
                                    value={branchId || 'all'}
                                    onValueChange={(v) => {
                                        const val = v === 'all' ? '' : v;
                                        setBranchId(val);
                                        applyFilters(date, val);
                                    }}
                                >
                                    <SelectTrigger className="h-9 w-44 text-sm">
                                        <SelectValue placeholder="Todas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las sucursales</SelectItem>
                                        {availableBranches.map((b) => (
                                            <SelectItem key={b.id} value={String(b.id)}>
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Grand totals */}
                {data.length > 0 && (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <Card>
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-green-600" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Total ingresos</p>
                                        <p className="text-lg font-bold text-green-700 dark:text-green-300">{formatCOP(grandTotal)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-2">
                                    <Vault className="h-5 w-5 text-amber-600" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Efectivo neto en caja</p>
                                        <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{formatCOP(grandNetCash)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Sucursales activas</p>
                                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{data.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Branch cards */}
                {data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                        <Vault className="h-12 w-12 opacity-20" />
                        <p className="text-sm">No hay ventas registradas para esta fecha</p>
                    </div>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-2">
                        {data.map((branch) => (
                            <Card key={branch.branch_id}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center justify-between text-base">
                                        <span className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-[#C850C0]" />
                                            {branch.branch_name}
                                        </span>
                                        <span className="text-sm font-bold text-green-700 dark:text-green-300">
                                            {formatCOP(branch.total_revenue)}
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {/* Payment method rows */}
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-neutral-100 text-xs text-muted-foreground dark:border-neutral-800">
                                                <th className="py-1 text-left font-normal">Método de pago</th>
                                                <th className="py-1 text-center font-normal">Ventas</th>
                                                <th className="py-1 text-right font-normal">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-50 dark:divide-neutral-900">
                                            {branch.payment_rows.map((row) => (
                                                <tr key={row.payment_method}>
                                                    <td className="py-1.5">{paymentLabel(row.payment_method)}</td>
                                                    <td className="py-1.5 text-center text-muted-foreground">{row.sale_count}</td>
                                                    <td className="py-1.5 text-right font-medium">{formatCOP(row.revenue)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Net cash row (highlighted) */}
                                    {branch.payment_rows.some((r) => r.payment_method === 'cash') && (
                                        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-900/20">
                                            <div>
                                                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                                                    Efectivo neto en caja
                                                </p>
                                                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                                                    Cobrado − cambio entregado
                                                </p>
                                            </div>
                                            <span className="text-base font-bold text-amber-700 dark:text-amber-300">
                                                {formatCOP(branch.net_cash)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Returns */}
                                    {branch.return_count > 0 && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <RotateCcw className="h-3.5 w-3.5 text-red-400" />
                                            <span>
                                                {branch.return_count} devolución{branch.return_count !== 1 ? 'es' : ''} registrada{branch.return_count !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
