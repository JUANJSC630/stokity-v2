import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Download, TrendingUp, Building, Award, Calendar } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reportes',
        href: '/reports',
    },
    {
        title: 'Reporte de Sucursales',
        href: '/reports/branches',
    },
];

interface BranchPerformance {
    id: number;
    name: string;
    business_name: string;
    address: string;
    total_sales: number;
    total_amount: number;
    average_sale: number;
    active_sellers: number;
}

interface BranchComparison {
    id: number;
    name: string;
    sales_count: number;
    total_amount: number;
    average_sale: number;
    active_days: number;
}

interface BranchByRegion {
    id: number;
    name: string;
    business_name: string;
    region: string;
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
    branchesData?: {
        branches_performance: BranchPerformance[];
        branches_comparison: BranchComparison[];
        branches_by_region: BranchByRegion[];
    };
    filters: Filters;
    branches?: Array<{ id: number; name: string; business_name?: string }>;
    categories?: Array<{ id: number; name: string }>;
}

export default function BranchesReport({ branchesData = { branches_performance: [], branches_comparison: [], branches_by_region: [] }, filters, branches = [], categories = [] }: Props) {
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

        router.get('/reports/branches', filters, {
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

        const url = new URL(`/reports/branches/export/${type}`, window.location.origin);
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

    const totalBranches = branchesData?.branches_performance?.length || 0;
    const totalSales = branchesData?.branches_performance?.reduce((sum, branch) => sum + branch.total_sales, 0) || 0;
    const totalRevenue = branchesData?.branches_performance?.reduce((sum, branch) => sum + branch.total_amount, 0) || 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reporte de Sucursales" />
            
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
                    <h1 className="text-3xl font-bold">Reporte de Sucursales</h1>
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
                            <CardDescription>Configura los filtros para el análisis de sucursales</CardDescription>
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
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Sucursales Activas</CardTitle>
                                <Building className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(totalBranches)}</div>
                                <p className="text-xs text-muted-foreground">
                                    Sucursales con ventas
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(totalSales)}</div>
                                <p className="text-xs text-muted-foreground">
                                    Ventas realizadas
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                                <Award className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                                <p className="text-xs text-muted-foreground">
                                    Ingresos generados
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Rendimiento de sucursales */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Rendimiento de Sucursales</CardTitle>
                            <CardDescription>
                                Análisis detallado por sucursal
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-neutral-200 dark:border-neutral-700">
                                            <th className="text-left p-2">Sucursal</th>
                                            <th className="text-left p-2">Nombre Comercial</th>
                                            <th className="text-left p-2">Dirección</th>
                                            <th className="text-right p-2">Ventas</th>
                                            <th className="text-right p-2">Monto Total</th>
                                            <th className="text-right p-2">Promedio</th>
                                            <th className="text-right p-2">Vendedores</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {branchesData?.branches_performance?.map((branch) => (
                                            <tr key={branch.id} className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                                                <td className="p-2 font-medium">{branch.name}</td>
                                                <td className="p-2 text-sm text-muted-foreground">{branch.business_name}</td>
                                                <td className="p-2 text-sm text-muted-foreground">{branch.address}</td>
                                                <td className="text-right p-2">{formatNumber(branch.total_sales)}</td>
                                                <td className="text-right p-2 font-medium">{formatCurrency(branch.total_amount)}</td>
                                                <td className="text-right p-2">{formatCurrency(branch.average_sale)}</td>
                                                <td className="text-right p-2">{formatNumber(branch.active_sellers)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Comparación de sucursales */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Comparación de Sucursales</CardTitle>
                            <CardDescription>
                                Métricas comparativas entre sucursales
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-neutral-200 dark:border-neutral-700">
                                            <th className="text-left p-2">Sucursal</th>
                                            <th className="text-right p-2">Ventas</th>
                                            <th className="text-right p-2">Monto Total</th>
                                            <th className="text-right p-2">Promedio</th>
                                            <th className="text-right p-2">Días Activos</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {branchesData?.branches_comparison?.map((branch) => (
                                            <tr key={branch.id} className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                                                <td className="p-2 font-medium">{branch.name}</td>
                                                <td className="text-right p-2">{formatNumber(branch.sales_count)}</td>
                                                <td className="text-right p-2 font-medium">{formatCurrency(branch.total_amount)}</td>
                                                <td className="text-right p-2">{formatCurrency(branch.average_sale)}</td>
                                                <td className="text-right p-2">{formatNumber(branch.active_days)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sucursales por región */}
                    {branchesData?.branches_by_region?.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Sucursales por Región</CardTitle>
                                <CardDescription>
                                    Desglose de sucursales por región geográfica
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-neutral-200 dark:border-neutral-700">
                                                <th className="text-left p-2">Sucursal</th>
                                                <th className="text-left p-2">Nombre Comercial</th>
                                                <th className="text-left p-2">Región</th>
                                                <th className="text-right p-2">Ventas</th>
                                                <th className="text-right p-2">Monto Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {branchesData?.branches_by_region?.map((branch) => (
                                                <tr key={branch.id} className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                                                    <td className="p-2 font-medium">{branch.name}</td>
                                                    <td className="p-2 text-sm text-muted-foreground">{branch.business_name}</td>
                                                    <td className="p-2">
                                                        <Badge variant="outline">{branch.region}</Badge>
                                                    </td>
                                                    <td className="text-right p-2">{formatNumber(branch.total_sales)}</td>
                                                    <td className="text-right p-2 font-medium">{formatCurrency(branch.total_amount)}</td>
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