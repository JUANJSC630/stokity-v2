import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Download, TrendingUp, RotateCcw, AlertTriangle, Calendar } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reportes',
        href: '/reports',
    },
    {
        title: 'Reporte de Devoluciones',
        href: '/reports/returns',
    },
];

interface ReturnSummary {
    total_returns: number;
    total_amount: number;
    average_return: number;
    return_rate: number;
}

interface ReturnByProduct {
    id: number;
    name: string;
    code: string;
    total_returns: number;
    total_quantity: number;
    total_amount: number;
    return_rate: number;
}

interface ReturnByReason {
    reason: string;
    count: number;
    total_amount: number;
    percentage: number;
}

interface ReturnTrend {
    date: string;
    returns_count: number;
    returns_amount: number;
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
    returnsData?: {
        returns_summary: ReturnSummary;
        returns_by_product: ReturnByProduct[];
        returns_by_reason: ReturnByReason[];
        returns_trend: ReturnTrend[];
    };
    filters: Filters;
    branches?: Array<{ id: number; name: string; business_name?: string }>;
    categories?: Array<{ id: number; name: string }>;
}

export default function ReturnsReport({ returnsData = { returns_summary: { total_returns: 0, total_amount: 0, average_return: 0, return_rate: 0 }, returns_by_product: [], returns_by_reason: [], returns_trend: [] }, filters, branches = [], categories = [] }: Props) {
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

        router.get('/reports/returns', filters, {
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

        const url = new URL(`/reports/returns/export/${type}`, window.location.origin);
        Object.keys(filters).forEach(key => {
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

    const formatPercentage = (value: number) => {
        if (value === undefined || value === null) return '0.00%';
        return `${value.toFixed(2)}%`;
    };

    const getReturnRateColor = (rate: number) => {
        if (rate > 10) return 'text-red-600 dark:text-red-400';
        if (rate > 5) return 'text-orange-600 dark:text-orange-400';
        return 'text-green-600 dark:text-green-400';
    };

    const getReturnRateBadge = (rate: number) => {
        if (rate > 10) return <Badge variant="destructive">Alto</Badge>;
        if (rate > 5) return <Badge variant="secondary">Medio</Badge>;
        return <Badge variant="default">Bajo</Badge>;
    };

    const summary = returnsData?.returns_summary || { total_returns: 0, total_amount: 0, average_return: 0, return_rate: 0 };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reporte de Devoluciones" />
            
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
                    <h1 className="text-3xl font-bold">Reporte de Devoluciones</h1>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => exportReport('excel')}
                        >
                            <Download className="h-4 w-4" />
                            Exportar Excel
                        </Button>
                        <Button 
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => exportReport('pdf')}
                        >
                            <Download className="h-4 w-4" />
                            Exportar PDF
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Filtros</CardTitle>
                            <CardDescription>Configura los filtros para el análisis de devoluciones</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="space-y-2">
                                    <Label htmlFor="date_from" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Fecha Desde</Label>
                                    <Input
                                        id="date_from"
                                        type="date"
                                        value={dateRange.from}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="date_to" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Fecha Hasta</Label>
                                    <Input
                                        id="date_to"
                                        type="date"
                                        value={dateRange.to}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="branch" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Sucursal</Label>
                                    <Select
                                        value={localFilters.branch_id || 'all'}
                                        onValueChange={(value) => setLocalFilters(prev => ({ ...prev, branch_id: value === 'all' ? undefined : value }))}
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
                                    <Label htmlFor="category" className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Categoría</Label>
                                    <Select
                                        value={localFilters.category_id || 'all'}
                                        onValueChange={(value) => setLocalFilters(prev => ({ ...prev, category_id: value === 'all' ? undefined : value }))}
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

                    {/* Resumen */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Devoluciones</CardTitle>
                                <RotateCcw className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(summary.total_returns)}</div>
                                <p className="text-xs text-muted-foreground">
                                    Devoluciones realizadas
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
                                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(summary.total_amount)}</div>
                                <p className="text-xs text-muted-foreground">
                                    Valor de devoluciones
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Promedio por Devolución</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(summary.average_return)}</div>
                                <p className="text-xs text-muted-foreground">
                                    Valor promedio
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Tasa de Devolución</CardTitle>
                                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${getReturnRateColor(summary.return_rate)}`}>
                                    {formatPercentage(summary.return_rate)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Porcentaje de devoluciones
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Devoluciones por producto */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Devoluciones por Producto</CardTitle>
                            <CardDescription>
                                Productos con mayor tasa de devolución
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-neutral-200 dark:border-neutral-700">
                                            <th className="text-left p-2">Código</th>
                                            <th className="text-left p-2">Producto</th>
                                            <th className="text-right p-2">Devoluciones</th>
                                            <th className="text-right p-2">Cantidad</th>
                                            <th className="text-right p-2">Monto Total</th>
                                            <th className="text-right p-2">Tasa</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {returnsData?.returns_by_product?.map((product) => (
                                            <tr key={product.id} className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                                                <td className="p-2">
                                                    <Badge variant="outline">{product.code}</Badge>
                                                </td>
                                                <td className="p-2 font-medium">{product.name}</td>
                                                <td className="text-right p-2">{formatNumber(product.total_returns)}</td>
                                                <td className="text-right p-2">{formatNumber(product.total_quantity)}</td>
                                                <td className="text-right p-2 font-medium">{formatCurrency(product.total_amount)}</td>
                                                <td className="text-right p-2">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {getReturnRateBadge(product.return_rate)}
                                                        <span className={getReturnRateColor(product.return_rate)}>
                                                            {formatPercentage(product.return_rate)}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Devoluciones por razón */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Devoluciones por Razón</CardTitle>
                            <CardDescription>
                                Análisis de motivos de devolución
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-neutral-200 dark:border-neutral-700">
                                            <th className="text-left p-2">Razón</th>
                                            <th className="text-right p-2">Cantidad</th>
                                            <th className="text-right p-2">Monto Total</th>
                                            <th className="text-right p-2">Porcentaje</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {returnsData?.returns_by_reason?.map((reason, index) => (
                                            <tr key={index} className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                                                <td className="p-2 font-medium">{reason.reason || 'Sin especificar'}</td>
                                                <td className="text-right p-2">{formatNumber(reason.count)}</td>
                                                <td className="text-right p-2 font-medium">{formatCurrency(reason.total_amount)}</td>
                                                <td className="text-right p-2">{formatPercentage(reason.percentage)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tendencia de devoluciones */}
                    {returnsData?.returns_trend?.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Tendencia de Devoluciones</CardTitle>
                                <CardDescription>
                                    Evolución de devoluciones en el tiempo
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-neutral-200 dark:border-neutral-700">
                                                <th className="text-left p-2">Fecha</th>
                                                <th className="text-right p-2">Devoluciones</th>
                                                <th className="text-right p-2">Monto Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {returnsData?.returns_trend?.map((trend, index) => (
                                                <tr key={index} className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                                                    <td className="p-2">
                                                        <Badge variant="outline">{trend.date}</Badge>
                                                    </td>
                                                    <td className="text-right p-2">{formatNumber(trend.returns_count)}</td>
                                                    <td className="text-right p-2 font-medium">{formatCurrency(trend.returns_amount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AppLayout>
    );
} 