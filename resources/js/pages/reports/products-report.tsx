import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, Calendar, Download, Package, TrendingUp } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reportes',
        href: '/reports',
    },
    {
        title: 'Reporte de Productos',
        href: '/reports/products',
    },
];

interface TopProduct {
    id: number;
    name: string;
    code: string;
    total_quantity: number;
    total_amount: number;
    sales_count: number;
}

interface ProductByCategory {
    id: number;
    name: string;
    total_quantity: number;
    total_amount: number;
    unique_products: number;
}

interface LowStockProduct {
    id: number;
    name: string;
    code: string;
    stock: number;
    min_stock: number;
}

interface ProductPerformance {
    id: number;
    name: string;
    code: string;
    total_sales: number;
    total_revenue: number;
    avg_price: number;
    stock_level: number;
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
    productsData: {
        top_products: TopProduct[];
        products_by_category: ProductByCategory[];
        low_stock_products: LowStockProduct[];
        products_performance: ProductPerformance[];
    };
    filters: Filters;
    branches: Array<{ id: number; name: string; business_name?: string }>;
    categories: Array<{ id: number; name: string }>;
    user?: {
        is_admin: boolean;
        branch_id?: number;
        branch_name?: string;
    };
}

export default function ProductsReport({
    productsData = { top_products: [], products_by_category: [], low_stock_products: [], products_performance: [] },
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

        router.get('/reports/products', filters, {
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

        const url = new URL(`/reports/products/export/${type}`, window.location.origin);
        Object.keys(filters).forEach((key) => {
            if (filters[key as keyof typeof filters]) {
                url.searchParams.append(key, filters[key as keyof typeof filters]!);
            }
        });

        window.open(url.toString(), '_blank');
    };

    const formatCurrency = (amount: number) => {
        // Verificar si el valor es NaN o no es un número válido
        if (isNaN(amount) || !isFinite(amount)) {
            return '$ 0';
        }

        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        // Verificar si el valor es NaN o no es un número válido
        if (isNaN(num) || !isFinite(num)) {
            return '0';
        }

        return new Intl.NumberFormat('es-CO').format(num);
    };

    const totalProducts = productsData.top_products.length;
    const totalRevenue = productsData.top_products.reduce((sum, product) => {
        const amount = Number(product.total_amount) || 0;
        return sum + amount;
    }, 0);
    const lowStockCount = productsData.low_stock_products.length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reporte de Productos" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
                    <h1 className="text-3xl font-bold">Reporte de Productos</h1>
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
                            <CardDescription>Configura los filtros para el análisis de productos</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
                                                {branches.map((branch) => (
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
                                            {categories.map((category) => (
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
                                <CardTitle className="text-sm font-medium">Productos Vendidos</CardTitle>
                                <Package className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(totalProducts)}</div>
                                <p className="text-xs text-muted-foreground">Productos con ventas</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                                <p className="text-xs text-muted-foreground">Ingresos por productos</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Bajo Stock</CardTitle>
                                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(lowStockCount)}</div>
                                <p className="text-xs text-muted-foreground">Productos con stock bajo</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Productos más vendidos */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Productos Más Vendidos</CardTitle>
                            <CardDescription>Top 20 productos con mayor volumen de ventas</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-neutral-200 dark:border-neutral-700">
                                            <th className="p-2 text-left">Código</th>
                                            <th className="p-2 text-left">Producto</th>
                                            <th className="p-2 text-right">Cantidad</th>
                                            <th className="p-2 text-right">Monto Total</th>
                                            <th className="p-2 text-right">Ventas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productsData.top_products.map((product) => (
                                            <tr
                                                key={product.id}
                                                className="border-b border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                                            >
                                                <td className="p-2">
                                                    <Badge variant="outline">{product.code}</Badge>
                                                </td>
                                                <td className="p-2 font-medium">{product.name}</td>
                                                <td className="p-2 text-right">{formatNumber(product.total_quantity)}</td>
                                                <td className="p-2 text-right font-medium">{formatCurrency(product.total_amount)}</td>
                                                <td className="p-2 text-right">{formatNumber(product.sales_count)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Productos por categoría */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Ventas por Categoría</CardTitle>
                            <CardDescription>Desglose de ventas por categoría de productos</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-neutral-200 dark:border-neutral-700">
                                            <th className="p-2 text-left">Categoría</th>
                                            <th className="p-2 text-right">Cantidad</th>
                                            <th className="p-2 text-right">Monto Total</th>
                                            <th className="p-2 text-right">Productos Únicos</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productsData.products_by_category.map((category) => (
                                            <tr
                                                key={category.id}
                                                className="border-b border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                                            >
                                                <td className="p-2 font-medium">{category.name}</td>
                                                <td className="p-2 text-right">{formatNumber(category.total_quantity)}</td>
                                                <td className="p-2 text-right font-medium">{formatCurrency(category.total_amount)}</td>
                                                <td className="p-2 text-right">{formatNumber(category.unique_products)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Productos con bajo stock */}
                    {productsData.low_stock_products.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                                    Productos con Bajo Stock
                                </CardTitle>
                                <CardDescription>Productos que requieren reabastecimiento</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-neutral-200 dark:border-neutral-700">
                                                <th className="p-2 text-left">Código</th>
                                                <th className="p-2 text-left">Producto</th>
                                                <th className="p-2 text-right">Stock Actual</th>
                                                <th className="p-2 text-right">Stock Mínimo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {productsData.low_stock_products.map((product) => (
                                                <tr
                                                    key={product.id}
                                                    className="border-b border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                                                >
                                                    <td className="p-2">
                                                        <Badge variant="outline">{product.code}</Badge>
                                                    </td>
                                                    <td className="p-2 font-medium">{product.name}</td>
                                                    <td className="p-2 text-right">
                                                        <Badge variant={product.stock === 0 ? 'destructive' : 'secondary'}>
                                                            {formatNumber(product.stock)}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-2 text-right">{formatNumber(product.min_stock)}</td>
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
