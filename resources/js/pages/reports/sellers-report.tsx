import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Award, Calendar, Download, TrendingUp, Users2 } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reportes',
        href: '/reports',
    },
    {
        title: 'Reporte de Vendedores',
        href: '/reports/sellers',
    },
];

interface SellerPerformance {
    id: number;
    name: string;
    email: string;
    total_sales: number;
    total_amount: number;
    average_sale: number;
}

interface SellerComparison {
    id: number;
    name: string;
    current_period_sales: number;
    previous_period_sales: number;
    growth_percentage: number;
}

interface SellerByBranch {
    id: number;
    name: string;
    email: string;
    branch_name: string;
    total_sales: number;
    total_amount: number;
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
    sellersData?: {
        sellers_performance: SellerPerformance[];
        sellers_comparison: SellerComparison[];
        sellers_by_branch: SellerByBranch[];
    };
    filters: Filters;
    branches?: Array<{ id: number; name: string; business_name?: string }>;
    categories?: Array<{ id: number; name: string }>;
    user?: {
        is_admin: boolean;
        branch_id?: number;
        branch_name?: string;
    };
}

export default function SellersReport({
    sellersData = { sellers_performance: [], sellers_comparison: [], sellers_by_branch: [] },
    filters,
    branches = [],
    categories = [],
    user,
}: Props) {
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

        // Para usuarios no administradores, forzar el filtro de sucursal
        if (!user?.is_admin && user?.branch_id) {
            filters.branch_id = user.branch_id.toString();
        }

        router.get('/reports/sellers', filters, {
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

        // Para usuarios no administradores, forzar el filtro de sucursal
        if (!user?.is_admin && user?.branch_id) {
            filters.branch_id = user.branch_id.toString();
        }

        const url = new URL(`/reports/sellers/export/${type}`, window.location.origin);
        Object.keys(filters).forEach((key) => {
            if (filters[key as keyof typeof filters]) {
                url.searchParams.append(key, filters[key as keyof typeof filters]!);
            }
        });

        window.open(url.toString(), '_blank');
    };

    const formatCurrency = (amount: number | null | undefined) => {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return '$ 0';
        }
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatNumber = (num: number | null | undefined) => {
        if (num === null || num === undefined || isNaN(num)) {
            return '0';
        }
        return new Intl.NumberFormat('es-CO').format(num);
    };

    const getGrowthIcon = (growth: number) => {
        return growth >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingUp className="h-4 w-4 rotate-180 text-red-500" />;
    };

    const getGrowthColor = (growth: number) => {
        return growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    };

    const totalSellers = sellersData?.sellers_performance?.length ?? 0;
    const totalSales = sellersData?.sellers_performance?.reduce((sum, seller) => sum + seller.total_sales, 0) || 0;
    const totalRevenue = sellersData?.sellers_performance?.reduce((sum, seller) => sum + seller.total_amount, 0) || 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reporte de Vendedores" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
                    <h1 className="text-3xl font-bold">Reporte de Vendedores</h1>
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
                            <CardDescription>Configura los filtros para el análisis de vendedores</CardDescription>
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
                                {user?.is_admin && (
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
                                )}
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

                    {/* Resumen */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Vendedores Activos</CardTitle>
                                <Users2 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(totalSellers)}</div>
                                <p className="text-xs text-muted-foreground">Vendedores con ventas</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(totalSales)}</div>
                                <p className="text-xs text-muted-foreground">Ventas realizadas</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                                <Award className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                                <p className="text-xs text-muted-foreground">Ingresos generados</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Rendimiento de vendedores */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Rendimiento de Vendedores</CardTitle>
                            <CardDescription>Top vendedores por volumen de ventas</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-neutral-200 dark:border-neutral-700">
                                            <th className="p-2 text-left">Vendedor</th>
                                            <th className="p-2 text-left">Email</th>
                                            <th className="p-2 text-right">Ventas</th>
                                            <th className="p-2 text-right">Monto Total</th>
                                            <th className="p-2 text-right">Promedio</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.isArray(sellersData?.sellers_performance) &&
                                            sellersData.sellers_performance.map((seller) => (
                                                <tr
                                                    key={seller.id}
                                                    className="border-b border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                                                >
                                                    <td className="p-2 font-medium">{seller.name}</td>
                                                    <td className="p-2 text-sm text-muted-foreground">{seller.email}</td>
                                                    <td className="p-2 text-right">{formatNumber(seller.total_sales)}</td>
                                                    <td className="p-2 text-right font-medium">{formatCurrency(seller.total_amount)}</td>
                                                    <td className="p-2 text-right">{formatCurrency(seller.average_sale)}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Comparación de períodos */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Comparación de Períodos</CardTitle>
                            <CardDescription>Crecimiento de ventas vs período anterior</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-neutral-200 dark:border-neutral-700">
                                            <th className="p-2 text-left">Vendedor</th>
                                            <th className="p-2 text-right">Período Actual</th>
                                            <th className="p-2 text-right">Período Anterior</th>
                                            <th className="p-2 text-right">Crecimiento</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.isArray(sellersData?.sellers_comparison) &&
                                            sellersData.sellers_comparison.map((seller) => (
                                                <tr
                                                    key={seller.id}
                                                    className="border-b border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                                                >
                                                    <td className="p-2 font-medium">{seller.name}</td>
                                                    <td className="p-2 text-right">{formatNumber(seller.current_period_sales)}</td>
                                                    <td className="p-2 text-right">{formatNumber(seller.previous_period_sales)}</td>
                                                    <td className="p-2 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {getGrowthIcon(seller.growth_percentage)}
                                                            <span className={getGrowthColor(seller.growth_percentage)}>
                                                                {seller.growth_percentage > 0 ? '+' : ''}
                                                                {seller.growth_percentage}%
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

                    {/* Vendedores por sucursal */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Vendedores por Sucursal</CardTitle>
                            <CardDescription>Desglose de vendedores por sucursal</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-neutral-200 dark:border-neutral-700">
                                            <th className="p-2 text-left">Vendedor</th>
                                            <th className="p-2 text-left">Email</th>
                                            <th className="p-2 text-left">Sucursal</th>
                                            <th className="p-2 text-right">Ventas</th>
                                            <th className="p-2 text-right">Monto Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.isArray(sellersData?.sellers_by_branch) &&
                                            sellersData.sellers_by_branch.map((seller) => (
                                                <tr
                                                    key={seller.id}
                                                    className="border-b border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                                                >
                                                    <td className="p-2 font-medium">{seller.name}</td>
                                                    <td className="p-2 text-sm text-muted-foreground">{seller.email}</td>
                                                    <td className="p-2">
                                                        <Badge variant="outline">{seller.branch_name}</Badge>
                                                    </td>
                                                    <td className="p-2 text-right">{formatNumber(seller.total_sales)}</td>
                                                    <td className="p-2 text-right font-medium">{formatCurrency(seller.total_amount)}</td>
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
