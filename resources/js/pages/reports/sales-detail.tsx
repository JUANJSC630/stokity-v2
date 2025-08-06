import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Calendar, Download } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reportes',
        href: '/reports',
    },
    {
        title: 'Detalle de Ventas',
        href: '/reports/sales-detail',
    },
];

interface SalesData {
    period: string;
    completed: {
        total_sales: number;
        total_amount: number;
        net_amount: number;
        tax_amount: number;
        average_sale: number;
    };
    cancelled: {
        total_sales: number;
        total_amount: number;
        net_amount: number;
        tax_amount: number;
        average_sale: number;
    };
    pending: {
        total_sales: number;
        total_amount: number;
        net_amount: number;
        tax_amount: number;
        average_sale: number;
    };
}

interface Filters {
    date_from?: string;
    date_to?: string;
    branch_id?: string;
    seller_id?: string;
    category_id?: string;
    status?: string;
}

interface Props {
    salesData: SalesData[];
    filters: Filters;
    branches?: Array<{ id: number; name: string; business_name?: string }>;
    categories?: Array<{ id: number; name: string }>;
    groupBy: string;
}

export default function SalesDetail({ salesData = [], filters, branches = [], categories = [], groupBy }: Props) {
    const [localFilters, setLocalFilters] = useState<Filters>(filters);
    const [dateRange, setDateRange] = useState({
        from: filters.date_from || '',
        to: filters.date_to || '',
    });

    const applyFilters = () => {
        const filters = {
            ...localFilters,
            date_from: dateRange.from,
            date_to: dateRange.to,
        };

        if (filters.branch_id === 'all') delete filters.branch_id;
        if (filters.category_id === 'all') delete filters.category_id;

        router.get('/reports/sales-detail', filters, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const exportReport = (type: 'excel' | 'pdf' = 'excel') => {
        const filters = {
            ...localFilters,
            date_from: dateRange.from,
            date_to: dateRange.to,
        };

        if (filters.branch_id === 'all') delete filters.branch_id;
        if (filters.category_id === 'all') delete filters.category_id;

        const url = new URL(`/reports/sales-detail/export/${type}`, window.location.origin);
        Object.keys(filters).forEach((key) => {
            if (filters[key as keyof typeof filters]) {
                url.searchParams.append(key, filters[key as keyof typeof filters]!);
            }
        });

        window.open(url.toString(), '_blank');
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('es-CO').format(num);
    };

    // Calcular totales por estado
    const getTotalsByStatus = (status: 'completed' | 'cancelled' | 'pending') => {
        return salesData.reduce(
            (acc, item) => {
                acc.total_sales += Number(item[status]?.total_sales || 0);
                acc.total_amount += Number(item[status]?.total_amount || 0);
                acc.net_amount += Number(item[status]?.net_amount || 0);
                acc.tax_amount += Number(item[status]?.tax_amount || 0);
                acc.total_average += Number(item[status]?.average_sale || 0);
                acc.count += 1;
                return acc;
            },
            { total_sales: 0, total_amount: 0, net_amount: 0, tax_amount: 0, total_average: 0, count: 0 },
        );
    };

    const completedTotals = getTotalsByStatus('completed');
    const cancelledTotals = getTotalsByStatus('cancelled');
    const pendingTotals = getTotalsByStatus('pending');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Detalle de Ventas" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
                    <h1 className="text-3xl font-bold">Detalle de Ventas</h1>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => exportReport('excel')}>
                            <Download className="h-4 w-4" />
                            Exportar Excel
                        </Button>
                        <Button size="sm" className="flex items-center gap-1" onClick={() => exportReport('pdf')}>
                            <Download className="h-4 w-4" />
                            Exportar PDF
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Filtros</CardTitle>
                            <CardDescription>Configura los filtros para el análisis de ventas</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="space-y-2">
                                    <Label htmlFor="date_from" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                        Fecha Desde
                                    </Label>
                                    <Input
                                        id="date_from"
                                        type="date"
                                        value={dateRange.from}
                                        onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="date_to" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                        Fecha Hasta
                                    </Label>
                                    <Input
                                        id="date_to"
                                        type="date"
                                        value={dateRange.to}
                                        onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="branch" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                        Sucursal
                                    </Label>
                                    <Select
                                        value={localFilters.branch_id || 'all'}
                                        onValueChange={(value) =>
                                            setLocalFilters((prev) => ({ ...prev, branch_id: value === 'all' ? undefined : value }))
                                        }
                                    >
                                        <SelectTrigger id="branch" className="h-8 text-sm">
                                            <SelectValue placeholder="Todas las sucursales" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas las sucursales</SelectItem>
                                            {branches?.map((branch) => (
                                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                                    {branch.business_name || branch.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                        Categoría
                                    </Label>
                                    <Select
                                        value={localFilters.category_id || 'all'}
                                        onValueChange={(value) =>
                                            setLocalFilters((prev) => ({ ...prev, category_id: value === 'all' ? undefined : value }))
                                        }
                                    >
                                        <SelectTrigger id="category" className="h-8 text-sm">
                                            <SelectValue placeholder="Todas las categorías" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas las categorías</SelectItem>
                                            {categories?.map((category) => (
                                                <SelectItem key={category.id} value={category.id.toString()}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <Button onClick={applyFilters} variant="outline" size="sm" className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    Aplicar Filtros
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Resumen por estado */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Completadas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(completedTotals.total_sales)}</div>
                                <div className="text-xs text-muted-foreground">Ventas</div>
                                <div className="mt-2 text-lg font-semibold">{formatCurrency(completedTotals.total_amount)}</div>
                                <div className="text-xs text-muted-foreground">Monto total</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(cancelledTotals.total_sales)}</div>
                                <div className="text-xs text-muted-foreground">Ventas</div>
                                <div className="mt-2 text-lg font-semibold">{formatCurrency(cancelledTotals.total_amount)}</div>
                                <div className="text-xs text-muted-foreground">Monto total</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(pendingTotals.total_sales)}</div>
                                <div className="text-xs text-muted-foreground">Ventas</div>
                                <div className="mt-2 text-lg font-semibold">{formatCurrency(pendingTotals.total_amount)}</div>
                                <div className="text-xs text-muted-foreground">Monto total</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tabla de datos */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalle por Período</CardTitle>
                            <CardDescription>
                                Ventas desglosadas por{' '}
                                {groupBy === 'day' ? 'día' : groupBy === 'week' ? 'semana' : groupBy === 'month' ? 'mes' : 'año'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-neutral-200 dark:border-neutral-700">
                                            <th className="p-2 text-left">Período</th>
                                            <th className="p-2 text-center" colSpan={5}>
                                                Completadas
                                            </th>
                                            <th className="p-2 text-center" colSpan={5}>
                                                Canceladas
                                            </th>
                                            <th className="p-2 text-center" colSpan={5}>
                                                Pendientes
                                            </th>
                                        </tr>
                                        <tr className="border-b border-neutral-200 dark:border-neutral-700">
                                            <th className="p-2 text-left">Fecha</th>
                                            <th className="p-2 text-right">Ventas</th>
                                            <th className="p-2 text-right">Monto</th>
                                            <th className="p-2 text-right">Neto</th>
                                            <th className="p-2 text-right">Imp.</th>
                                            <th className="p-2 text-right">Prom.</th>
                                            <th className="p-2 text-right">Ventas</th>
                                            <th className="p-2 text-right">Monto</th>
                                            <th className="p-2 text-right">Neto</th>
                                            <th className="p-2 text-right">Imp.</th>
                                            <th className="p-2 text-right">Prom.</th>
                                            <th className="p-2 text-right">Ventas</th>
                                            <th className="p-2 text-right">Monto</th>
                                            <th className="p-2 text-right">Neto</th>
                                            <th className="p-2 text-right">Imp.</th>
                                            <th className="p-2 text-right">Prom.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {salesData.map((item, index) => (
                                            <tr
                                                key={index}
                                                className="border-b border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                                            >
                                                <td className="p-2">
                                                    <Badge variant="outline">{item.period}</Badge>
                                                </td>
                                                {/* Completadas */}
                                                <td className="p-2 text-right">{formatNumber(Number(item.completed?.total_sales) || 0)}</td>
                                                <td className="p-2 text-right font-medium">
                                                    {formatCurrency(Number(item.completed?.total_amount) || 0)}
                                                </td>
                                                <td className="p-2 text-right">{formatCurrency(Number(item.completed?.net_amount) || 0)}</td>
                                                <td className="p-2 text-right">{formatCurrency(Number(item.completed?.tax_amount) || 0)}</td>
                                                <td className="p-2 text-right">{formatCurrency(Number(item.completed?.average_sale) || 0)}</td>
                                                {/* Canceladas */}
                                                <td className="p-2 text-right">{formatNumber(Number(item.cancelled?.total_sales) || 0)}</td>
                                                <td className="p-2 text-right font-medium">
                                                    {formatCurrency(Number(item.cancelled?.total_amount) || 0)}
                                                </td>
                                                <td className="p-2 text-right">{formatCurrency(Number(item.cancelled?.net_amount) || 0)}</td>
                                                <td className="p-2 text-right">{formatCurrency(Number(item.cancelled?.tax_amount) || 0)}</td>
                                                <td className="p-2 text-right">{formatCurrency(Number(item.cancelled?.average_sale) || 0)}</td>
                                                {/* Pendientes */}
                                                <td className="p-2 text-right">{formatNumber(Number(item.pending?.total_sales) || 0)}</td>
                                                <td className="p-2 text-right font-medium">
                                                    {formatCurrency(Number(item.pending?.total_amount) || 0)}
                                                </td>
                                                <td className="p-2 text-right">{formatCurrency(Number(item.pending?.net_amount) || 0)}</td>
                                                <td className="p-2 text-right">{formatCurrency(Number(item.pending?.tax_amount) || 0)}</td>
                                                <td className="p-2 text-right">{formatCurrency(Number(item.pending?.average_sale) || 0)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
