import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { 
    Download, 
    TrendingUp, 
    DollarSign, 
    ShoppingCart, 
    Package,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    Calendar
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reportes',
        href: '/reports',
    },
];

interface DashboardData {
    sales_summary: {
        current: {
            total_sales: number;
            total_amount: number;
            net_amount: number;
            tax_amount: number;
            average_sale: number;
            total_paid: number;
        };
        previous: {
            total_sales: number;
            total_amount: number;
        };
        growth: {
            sales_count: number;
            total_amount: number;
        };
    };
    top_products: Array<{
        id: number;
        name: string;
        code: string;
        total_quantity: number;
        total_amount: number;
        sales_count: number;
    }>;
    sales_by_branch: Array<{
        id: number;
        name: string;
        business_name: string;
        total_sales: number;
        total_amount: number;
        average_sale: number;
    }>;
    sales_by_seller: Array<{
        id: number;
        name: string;
        email: string;
        total_sales: number;
        total_amount: number;
        average_sale: number;
    }>;
    returns_summary: {
        total_returns: number;
        unique_sales_returned: number;
    };
    payment_methods: Array<{
        payment_method: string;
        transaction_count: number;
        total_amount: number;
        average_amount: number;
    }>;
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
    dashboardData: DashboardData;
    filters: Filters;
    branches: Array<{ id: number; name: string; business_name?: string }>;
    categories: Array<{ id: number; name: string }>;
}

export default function ReportsIndex({ dashboardData, filters, branches, categories }: Props) {
    const [localFilters, setLocalFilters] = useState<Filters>(filters);
    const [dateRange, setDateRange] = useState({
        from: filters.date_from || '',
        to: filters.date_to || '',
    });
    const [reportMonth, setReportMonth] = useState('current');
    const [customMonth, setCustomMonth] = useState('');

    const applyFilters = () => {
        const filters = {
            ...localFilters,
            date_from: dateRange.from,
            date_to: dateRange.to,
        };

        if (filters.branch_id === 'all') delete filters.branch_id;
        if (filters.category_id === 'all') delete filters.category_id;

        router.get('/reports', filters, {
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

        const url = new URL(`/reports/export/${type}`, window.location.origin);
        Object.keys(filters).forEach(key => {
            if (filters[key as keyof typeof filters]) {
                url.searchParams.append(key, filters[key as keyof typeof filters]!);
            }
        });

        window.open(url.toString(), '_blank');
    };

    const applyMonthFilter = () => {
        let fromDate = '';
        let toDate = '';

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        switch (reportMonth) {
            case 'current':
                fromDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
                toDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
                break;
            case 'last':
                fromDate = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
                toDate = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
                break;
            case 'custom':
                if (customMonth) {
                    const [year, month] = customMonth.split('-');
                    fromDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString().split('T')[0];
                    toDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
                }
                break;
        }

        setDateRange({ from: fromDate, to: toDate });
        applyFilters();
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

    const getGrowthIcon = (growth: number) => {
        return growth >= 0 ? (
            <ArrowUpRight className="h-4 w-4 text-green-500" />
        ) : (
            <ArrowDownRight className="h-4 w-4 text-red-500" />
        );
    };

    const getGrowthColor = (growth: number) => {
        if (growth > 0) return 'text-green-600 dark:text-green-400';
        if (growth < 0) return 'text-red-600 dark:text-red-400';
        return 'text-neutral-600 dark:text-neutral-400';
    };

    const getPaymentMethodLabel = (method: string) => {
        switch (method) {
            case 'cash':
                return 'Efectivo';
            case 'transfer':
                return 'Transferencia';
            default:
                return method;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reportes de Ventas" />
            
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
                    <h1 className="text-3xl font-bold">Reportes de Ventas</h1>
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
                            <CardTitle>Filtros y Período del Reporte</CardTitle>
                            <CardDescription>Configura los filtros y selecciona el período para generar el reporte</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {/* Selector de período */}
                                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                                    <Label className="text-sm font-medium mb-3 block text-neutral-500 dark:text-neutral-400">Período del Reporte</Label>
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                        <div className="flex-1">
                                            <Select 
                                                value={reportMonth} 
                                                onValueChange={setReportMonth}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona un período" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="current">Mes Actual</SelectItem>
                                                    <SelectItem value="last">Mes Anterior</SelectItem>
                                                    <SelectItem value="custom">Mes Personalizado</SelectItem>
                                                    <SelectItem value="manual">Fechas Manuales</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        
                                        {reportMonth === 'custom' && (
                                            <div className="flex-1">
                                                <input
                                                    type="month"
                                                    value={customMonth}
                                                    onChange={(e) => setCustomMonth(e.target.value)}
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                            </div>
                                        )}
                                        
                                        <Button 
                                            onClick={applyMonthFilter}
                                            variant="outline"
                                            size="sm"
                                            className="flex items-center gap-1"
                                        >
                                            <Calendar className="h-4 w-4" />
                                            Aplicar Período
                                        </Button>
                                    </div>
                                </div>

                                {/* Filtros de fechas manuales */}
                                {reportMonth === 'manual' && (
                                    <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                                        <Label className="text-sm font-medium mb-3 block text-neutral-500 dark:text-neutral-400">Fechas Específicas</Label>
                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                                        </div>
                                    </div>
                                )}

                                {/* Filtros adicionales */}
                                <div>
                                    <Label className="text-sm font-medium mb-3 block text-neutral-500 dark:text-neutral-400">Filtros Adicionales</Label>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                                                    {branches.map((branch) => (
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
                                                    {categories.map((category) => (
                                                        <SelectItem key={category.id} value={category.id.toString()}>
                                                            {category.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-6 flex justify-end">
                                <Button onClick={applyFilters} variant="outline" size="sm" className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    Aplicar Filtros
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Resumen de ventas */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
                                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(dashboardData.sales_summary.current.total_sales)}</div>
                                <p className="text-xs text-muted-foreground">
                                    Ventas realizadas
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(dashboardData.sales_summary.current.total_amount)}</div>
                                <p className="text-xs text-muted-foreground">
                                    Ingresos generados
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Promedio por Venta</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(dashboardData.sales_summary.current.average_sale)}</div>
                                <p className="text-xs text-muted-foreground">
                                    Promedio por venta
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Crecimiento</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2">
                                    {getGrowthIcon(dashboardData.sales_summary.growth.sales_count)}
                                    <span className={`text-2xl font-bold ${getGrowthColor(dashboardData.sales_summary.growth.sales_count)}`}>
                                        {dashboardData.sales_summary.growth.sales_count > 0 ? '+' : ''}{dashboardData.sales_summary.growth.sales_count}%
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    vs mes anterior
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tabs de reportes */}
                    <Tabs defaultValue="overview" className="w-full">
                        <div className="overflow-x-auto">
                            <TabsList className="flex w-max min-w-full gap-1 p-1">
                                <TabsTrigger value="overview" className="text-xs px-3 py-2 whitespace-nowrap">Resumen</TabsTrigger>
                                <TabsTrigger value="products" className="text-xs px-3 py-2 whitespace-nowrap">Productos</TabsTrigger>
                                <TabsTrigger value="branches" className="text-xs px-3 py-2 whitespace-nowrap">Sucursales</TabsTrigger>
                                <TabsTrigger value="sellers" className="text-xs px-3 py-2 whitespace-nowrap">Vendedores</TabsTrigger>
                                <TabsTrigger value="payments" className="text-xs px-3 py-2 whitespace-nowrap">Pagos</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="overview" className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Productos Más Vendidos</CardTitle>
                                        <CardDescription>Top productos por volumen de ventas</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {dashboardData.top_products.slice(0, 5).map((product) => (
                                                <div key={product.id} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Package className="h-4 w-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="font-medium">{product.name}</p>
                                                            <p className="text-sm text-muted-foreground">{product.code}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-medium">{formatCurrency(product.total_amount)}</p>
                                                        <p className="text-sm text-muted-foreground">{formatNumber(product.total_quantity)} unidades</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Devoluciones</CardTitle>
                                        <CardDescription>Resumen de devoluciones</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">Total Devoluciones</span>
                                                <span className="text-2xl font-bold">{formatNumber(dashboardData.returns_summary.total_returns)}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">Ventas con Devolución</span>
                                                <span className="text-lg font-medium">{formatNumber(dashboardData.returns_summary.unique_sales_returned)}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="products" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Productos Más Vendidos</CardTitle>
                                    <CardDescription>Top 20 productos con mayor volumen de ventas</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {dashboardData.top_products.map((product) => (
                                            <div key={product.id} className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 pb-2">
                                                <div className="flex items-center gap-3">
                                                    <Package className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <p className="font-medium">{product.name}</p>
                                                        <p className="text-sm text-muted-foreground">{product.code}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium">{formatCurrency(product.total_amount)}</p>
                                                    <p className="text-sm text-muted-foreground">{formatNumber(product.total_quantity)} unidades</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="branches" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Ventas por Sucursal</CardTitle>
                                    <CardDescription>Rendimiento de ventas por sucursal</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {dashboardData.sales_by_branch.map((branch) => (
                                            <div key={branch.id} className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 pb-2">
                                                <div>
                                                    <p className="font-medium">{branch.business_name || branch.name}</p>
                                                    <p className="text-sm text-muted-foreground">{formatNumber(branch.total_sales)} ventas</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium">{formatCurrency(branch.total_amount)}</p>
                                                    <p className="text-sm text-muted-foreground">Promedio: {formatCurrency(branch.average_sale)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="sellers" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Vendedores</CardTitle>
                                    <CardDescription>Rendimiento de vendedores</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {dashboardData.sales_by_seller.map((seller) => (
                                            <div key={seller.id} className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 pb-2">
                                                <div>
                                                    <p className="font-medium">{seller.name}</p>
                                                    <p className="text-sm text-muted-foreground">{seller.email}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium">{formatCurrency(seller.total_amount)}</p>
                                                    <p className="text-sm text-muted-foreground">{formatNumber(seller.total_sales)} ventas</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="payments" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Métodos de Pago</CardTitle>
                                    <CardDescription>Análisis de métodos de pago</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {dashboardData.payment_methods.map((method, index) => (
                                            <div key={index} className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 pb-2">
                                                <div>
                                                    <p className="font-medium">{getPaymentMethodLabel(method.payment_method)}</p>
                                                    <p className="text-sm text-muted-foreground">{formatNumber(method.transaction_count)} transacciones</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium">{formatCurrency(method.total_amount)}</p>
                                                    <p className="text-sm text-muted-foreground">Promedio: {formatCurrency(method.average_amount)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </AppLayout>
    );
}
