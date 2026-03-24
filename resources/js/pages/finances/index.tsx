import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, ArrowUpRight, DollarSign, Receipt, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';

interface ExpenseByCategoryRow {
    category: string;
    icon: string | null;
    color: string | null;
    amount: number;
    pct: number;
}

interface MonthlyTrendRow {
    month: string;
    revenue: number;
    cogs: number;
    gross_profit: number;
    expenses: number;
    net_profit: number;
}

interface TopProductRow {
    id: number;
    name: string;
    code: string;
    units_sold: number;
    revenue: number;
    cogs: number;
    gross_profit: number;
    margin_pct: number;
}

interface Props {
    period: 'this_month' | 'last_month' | 'this_year' | 'custom';
    dateFrom: string;
    dateTo: string;
    periodLabel: string;
    selectedBranch: number | null;
    branches: Array<{ id: number; name: string }>;
    revenue: number;
    returnsTotal: number;
    netRevenue: number;
    cogs: number;
    grossProfit: number;
    grossMarginPct: number;
    totalExpenses: number;
    netProfit: number;
    hasCOGSWarning: boolean;
    expensesByCategory: ExpenseByCategoryRow[];
    monthlyTrend: MonthlyTrendRow[];
    topProducts: TopProductRow[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Finanzas', href: '/finances' },
];

function cop(value: number): string {
    return `$ ${Number(value).toLocaleString('es-CO')}`;
}

type PeriodOption = 'this_month' | 'last_month' | 'this_year' | 'custom';

const PERIOD_LABELS: Record<PeriodOption, string> = {
    this_month: 'Este mes',
    last_month: 'Mes anterior',
    this_year: 'Este año',
    custom: 'Personalizado',
};

export default function FinancesIndex({
    period,
    dateFrom,
    dateTo,
    selectedBranch,
    branches,
    revenue,
    returnsTotal,
    netRevenue,
    cogs,
    grossProfit,
    grossMarginPct,
    totalExpenses,
    netProfit,
    hasCOGSWarning,
    expensesByCategory,
    monthlyTrend,
    topProducts,
}: Props) {
    const [localPeriod, setLocalPeriod] = useState<PeriodOption>(period);
    const [localBranch, setLocalBranch] = useState<string>(selectedBranch ? String(selectedBranch) : 'all');
    const [dateFromLocal, setDateFromLocal] = useState(dateFrom);
    const [dateToLocal, setDateToLocal] = useState(dateTo);

    const applyFilters = (newPeriod?: PeriodOption, newBranch?: string) => {
        const p = newPeriod ?? localPeriod;
        const b = newBranch ?? localBranch;
        router.get(
            '/finances',
            {
                period: p,
                branch: b === 'all' ? '' : b,
                date_from: p === 'custom' ? dateFromLocal : '',
                date_to: p === 'custom' ? dateToLocal : '',
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handlePeriodClick = (p: PeriodOption) => {
        setLocalPeriod(p);
        if (p !== 'custom') {
            applyFilters(p, localBranch);
        }
    };

    const handleBranchChange = (val: string) => {
        setLocalBranch(val);
        applyFilters(localPeriod, val);
    };

    const netProfitPositive = netProfit >= 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Finanzas" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h1 className="text-2xl font-semibold">Finanzas</h1>
                    <Link href="/expenses">
                        <Button>
                            <Receipt className="mr-2 h-4 w-4" />
                            Registrar gasto
                        </Button>
                    </Link>
                </div>

                {/* COGS warning */}
                {hasCOGSWarning && (
                    <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200">
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <p className="text-sm">
                            El costo de algunas ventas es estimado (precio actual del producto), ya que son anteriores a la activación del módulo
                            financiero.
                        </p>
                    </div>
                )}

                {/* Period + Branch selectors */}
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex flex-wrap items-end gap-3">
                            {/* Period buttons */}
                            <div className="flex flex-wrap gap-1">
                                {(Object.keys(PERIOD_LABELS) as PeriodOption[]).map((p) => (
                                    <Button
                                        key={p}
                                        size="sm"
                                        variant={localPeriod === p ? 'default' : 'outline'}
                                        onClick={() => handlePeriodClick(p)}
                                    >
                                        {PERIOD_LABELS[p]}
                                    </Button>
                                ))}
                            </div>

                            {/* Branch selector */}
                            {branches.length > 0 && (
                                <div className="w-48">
                                    <Select value={localBranch} onValueChange={handleBranchChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Todas las sucursales" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas las sucursales</SelectItem>
                                            {branches.map((b) => (
                                                <SelectItem key={b.id} value={String(b.id)}>
                                                    {b.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Custom date inputs */}
                            {localPeriod === 'custom' && (
                                <>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Desde</label>
                                        <Input
                                            type="date"
                                            value={dateFromLocal}
                                            onChange={(e) => setDateFromLocal(e.target.value)}
                                            className="w-40"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Hasta</label>
                                        <Input type="date" value={dateToLocal} onChange={(e) => setDateToLocal(e.target.value)} className="w-40" />
                                    </div>
                                    <Button size="sm" onClick={() => applyFilters()}>
                                        Aplicar
                                    </Button>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Ingresos netos */}
                    <Card className="border-blue-100 dark:border-blue-900">
                        <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Ingresos netos</p>
                                    <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{cop(netRevenue)}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Ventas - devoluciones</p>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/40">
                                    <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Ganancia bruta */}
                    <Card className="border-green-100 dark:border-green-900">
                        <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Ganancia bruta</p>
                                    <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{cop(grossProfit)}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Ingresos - costo de ventas &bull; {grossMarginPct.toFixed(1)}%
                                    </p>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/40">
                                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Gastos */}
                    <Card className="border-orange-100 dark:border-orange-900">
                        <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Gastos</p>
                                    <p className="mt-1 text-2xl font-bold text-orange-600 dark:text-orange-400">{cop(totalExpenses)}</p>
                                    <Link
                                        href="/expenses"
                                        className="mt-1 flex items-center gap-1 text-xs text-orange-600 hover:underline dark:text-orange-400"
                                    >
                                        Ver detalle <ArrowUpRight className="h-3 w-3" />
                                    </Link>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-900/40">
                                    <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Ganancia neta — most prominent */}
                    <Card
                        className={`border-2 ${netProfitPositive ? 'border-green-300 dark:border-green-700' : 'border-red-300 dark:border-red-700'}`}
                    >
                        <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Ganancia neta</p>
                                    <p
                                        className={`mt-1 text-3xl font-extrabold ${netProfitPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                                    >
                                        {cop(netProfit)}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">Ganancia bruta - gastos</p>
                                </div>
                                <div
                                    className={`flex h-10 w-10 items-center justify-center rounded-full ${netProfitPositive ? 'bg-green-50 dark:bg-green-900/40' : 'bg-red-50 dark:bg-red-900/40'}`}
                                >
                                    {netProfitPositive ? (
                                        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                                    ) : (
                                        <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* P&L Statement */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Estado de Resultados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <table className="w-full text-sm">
                                <tbody>
                                    <tr className="border-b border-neutral-100 dark:border-neutral-800">
                                        <td className="py-2 text-muted-foreground">Ingresos por ventas</td>
                                        <td className="py-2 text-right">{cop(revenue)}</td>
                                    </tr>
                                    <tr className="border-b border-neutral-100 dark:border-neutral-800">
                                        <td className="py-2 text-muted-foreground">(-) Devoluciones</td>
                                        <td className="py-2 text-right text-red-600 dark:text-red-400">{cop(returnsTotal)}</td>
                                    </tr>
                                    <tr className="border-b-2 border-neutral-200 dark:border-neutral-700">
                                        <td className="py-2 font-semibold">= Ingresos netos</td>
                                        <td className="py-2 text-right font-semibold">{cop(netRevenue)}</td>
                                    </tr>
                                    <tr className="border-b border-neutral-100 dark:border-neutral-800">
                                        <td className="py-2 text-muted-foreground">(-) Costo de lo vendido</td>
                                        <td className="py-2 text-right text-red-600 dark:text-red-400">{cop(cogs)}</td>
                                    </tr>
                                    <tr className="border-b-2 border-neutral-200 dark:border-neutral-700">
                                        <td className="py-2 font-semibold text-green-700 dark:text-green-400">= Ganancia bruta</td>
                                        <td className="py-2 text-right font-semibold text-green-700 dark:text-green-400">{cop(grossProfit)}</td>
                                    </tr>
                                    <tr className="border-b border-neutral-100 dark:border-neutral-800">
                                        <td className="py-2 text-muted-foreground">(-) Gastos del período</td>
                                        <td className="py-2 text-right text-red-600 dark:text-red-400">{cop(totalExpenses)}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            className={`py-3 text-base font-bold ${netProfitPositive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}
                                        >
                                            = Ganancia neta
                                        </td>
                                        <td
                                            className={`py-3 text-right text-base font-bold ${netProfitPositive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}
                                        >
                                            {cop(netProfit)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>

                    {/* Expenses by Category */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Gastos por categoría</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {expensesByCategory.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Sin gastos registrados en el período.</p>
                            ) : (
                                <div className="space-y-3">
                                    {expensesByCategory.map((row) => (
                                        <div key={row.category}>
                                            <div className="mb-1 flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="inline-block h-2.5 w-2.5 rounded-full"
                                                        style={{ backgroundColor: row.color ?? '#94a3b8' }}
                                                    />
                                                    <span>{row.category}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-medium">{cop(row.amount)}</span>
                                                    <span className="w-10 text-right text-xs text-muted-foreground">{row.pct.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                                                <div
                                                    className="h-1.5 rounded-full"
                                                    style={{ width: `${Math.min(row.pct, 100)}%`, backgroundColor: row.color ?? '#94a3b8' }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Monthly trend */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tendencia mensual (últimos 6 meses)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {monthlyTrend.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Sin datos disponibles.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-neutral-200 text-left text-xs font-medium text-muted-foreground dark:border-neutral-700">
                                            <th className="pr-4 pb-2">Mes</th>
                                            <th className="pr-4 pb-2 text-right">Ingresos</th>
                                            <th className="pr-4 pb-2 text-right">G. bruta</th>
                                            <th className="pr-4 pb-2 text-right">Gastos</th>
                                            <th className="pb-2 text-right">G. neta</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthlyTrend.map((row) => (
                                            <tr key={row.month} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                                                <td className="py-2 pr-4 font-medium capitalize">{row.month}</td>
                                                <td className="py-2 pr-4 text-right">{cop(row.revenue)}</td>
                                                <td className="py-2 pr-4 text-right text-green-700 dark:text-green-400">{cop(row.gross_profit)}</td>
                                                <td className="py-2 pr-4 text-right text-red-600 dark:text-red-400">{cop(row.expenses)}</td>
                                                <td
                                                    className={`py-2 text-right font-semibold ${row.net_profit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                                                >
                                                    {cop(row.net_profit)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top products */}
                <Card>
                    <CardHeader>
                        <CardTitle>Productos más rentables</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {topProducts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Sin datos disponibles.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-neutral-200 text-left text-xs font-medium text-muted-foreground dark:border-neutral-700">
                                            <th className="pr-4 pb-2">Producto</th>
                                            <th className="pr-4 pb-2 text-right">Uds. vendidas</th>
                                            <th className="pr-4 pb-2 text-right">Ingresos</th>
                                            <th className="pr-4 pb-2 text-right">G. bruta</th>
                                            <th className="pb-2 text-right">Margen</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topProducts.map((p) => (
                                            <tr key={p.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                                                <td className="py-2 pr-4">
                                                    <div className="font-medium">{p.name}</div>
                                                    <div className="text-xs text-muted-foreground">{p.code}</div>
                                                </td>
                                                <td className="py-2 pr-4 text-right">{p.units_sold.toLocaleString('es-CO')}</td>
                                                <td className="py-2 pr-4 text-right">{cop(p.revenue)}</td>
                                                <td className="py-2 pr-4 text-right text-green-700 dark:text-green-400">{cop(p.gross_profit)}</td>
                                                <td className="py-2 text-right">
                                                    <Badge
                                                        className={
                                                            p.margin_pct >= 30
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                                : p.margin_pct >= 10
                                                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                        }
                                                    >
                                                        {p.margin_pct.toFixed(1)}%
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
