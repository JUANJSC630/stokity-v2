import { DateField, FilterSelect, ReportEmpty, ReportFilterPanel, ReportHeader, ReportKpi, ReportTable } from '@/components/reports/report-parts';
import { type ReportFilters, type ReportUser, useReportFilters } from '@/components/reports/use-report-filters';
import { Section } from '@/components/sales/form-fields';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency as formatCurrencyShared } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { AlertTriangle, Package, TrendingUp } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Reportes', href: '/reports' },
    { title: 'Reporte de Productos', href: '/reports/products' },
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

interface Props {
    productsData: {
        top_products: TopProduct[];
        products_by_category: ProductByCategory[];
        low_stock_products: LowStockProduct[];
        products_performance: ProductPerformance[];
    };
    filters: ReportFilters;
    branches: Array<{ id: number; name: string; business_name?: string }>;
    categories: Array<{ id: number; name: string }>;
    user?: ReportUser;
}

const formatCurrency = (amount: number) => {
    // Verificar si el valor es NaN o no es un número válido
    if (isNaN(amount) || !isFinite(amount)) {
        return '$ 0';
    }
    return formatCurrencyShared(amount);
};

const formatNumber = (num: number) => {
    // Verificar si el valor es NaN o no es un número válido
    if (isNaN(num) || !isFinite(num)) {
        return '0';
    }
    return new Intl.NumberFormat('es-CO').format(num);
};

function CodeTag({ code }: { code: string }) {
    return <span className="rounded-md border border-border/60 px-1.5 py-0.5 font-mono text-xs">{code}</span>;
}

function StockTag({ stock }: { stock: number }) {
    return (
        <span
            className={cn(
                'inline-flex min-w-7 items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums',
                stock === 0 ? 'bg-destructive text-white' : 'bg-muted text-foreground',
            )}
        >
            {formatNumber(stock)}
        </span>
    );
}

export default function ProductsReport({
    productsData = { top_products: [], products_by_category: [], low_stock_products: [], products_performance: [] },
    filters,
    branches = [],
    categories = [],
    user,
}: Props) {
    const { localFilters, setFilter, dateRange, setDateRange, applyFilters, exportReport, activeCount } = useReportFilters({
        path: '/reports/products',
        exportBase: '/reports/products/export',
        filters,
        user,
    });

    const totalProducts = productsData.top_products.length;
    const totalRevenue = productsData.top_products.reduce((sum, product) => {
        const amount = Number(product.total_amount) || 0;
        return sum + amount;
    }, 0);
    const lowStockCount = productsData.low_stock_products.length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reporte de Productos" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
                <ReportHeader
                    title="Reporte de Productos"
                    subtitle="Lo que más se vende, por categoría y lo que hay que reponer"
                    onExport={exportReport}
                />

                <ReportFilterPanel description="Configura los filtros para el análisis de productos" onApply={applyFilters} activeCount={activeCount}>
                    <DateField
                        id="date_from"
                        label="Fecha Desde"
                        value={dateRange.from}
                        onChange={(from) => setDateRange((prev) => ({ ...prev, from }))}
                    />
                    <DateField id="date_to" label="Fecha Hasta" value={dateRange.to} onChange={(to) => setDateRange((prev) => ({ ...prev, to }))} />
                    {user?.is_admin && (
                        <FilterSelect
                            id="branch"
                            label="Sucursal"
                            value={localFilters.branch_id || 'all'}
                            onChange={(value) => setFilter('branch_id', value)}
                            allLabel="Todas las sucursales"
                            options={branches.map((branch) => ({ value: branch.id.toString(), label: branch.business_name || branch.name }))}
                        />
                    )}
                    <FilterSelect
                        id="category"
                        label="Categoría"
                        value={localFilters.category_id || 'all'}
                        onChange={(value) => setFilter('category_id', value)}
                        allLabel="Todas las categorías"
                        options={categories.map((category) => ({ value: category.id.toString(), label: category.name }))}
                    />
                </ReportFilterPanel>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                    <ReportKpi label="Productos Vendidos" icon={<Package className="size-4" />} hint="Productos con ventas">
                        {formatNumber(totalProducts)}
                    </ReportKpi>
                    <ReportKpi label="Ingresos Totales" icon={<TrendingUp className="size-4" />} hint="Ingresos por productos">
                        {formatCurrency(totalRevenue)}
                    </ReportKpi>
                    <ReportKpi
                        label="Bajo Stock"
                        icon={<AlertTriangle className="size-4" />}
                        hint="Productos con stock bajo"
                        tone={lowStockCount > 0 ? 'text-orange-600 dark:text-orange-400' : undefined}
                    >
                        {formatNumber(lowStockCount)}
                    </ReportKpi>
                </div>

                <Section title="Productos Más Vendidos" description="Top 20 productos con mayor volumen de ventas">
                    <ReportTable
                        caption="Productos más vendidos"
                        rows={productsData.top_products}
                        rowKey={(product) => product.id}
                        columns={[
                            { key: 'code', header: 'Código', cell: (p) => <CodeTag code={p.code} />, mobile: 'subtitle' },
                            { key: 'name', header: 'Producto', cell: (p) => p.name, mobile: 'title' },
                            { key: 'qty', header: 'Cantidad', cell: (p) => formatNumber(p.total_quantity), align: 'right', mobile: 'detail' },
                            { key: 'amount', header: 'Monto Total', cell: (p) => formatCurrency(p.total_amount), align: 'right', mobile: 'value' },
                            { key: 'sales', header: 'Ventas', cell: (p) => formatNumber(p.sales_count), align: 'right', mobile: 'detail' },
                        ]}
                    />
                </Section>

                <Section title="Ventas por Categoría" description="Desglose de ventas por categoría de productos">
                    <ReportTable
                        caption="Ventas por categoría"
                        rows={productsData.products_by_category}
                        rowKey={(category) => category.id}
                        columns={[
                            { key: 'name', header: 'Categoría', cell: (c) => c.name, mobile: 'title' },
                            { key: 'qty', header: 'Cantidad', cell: (c) => formatNumber(c.total_quantity), align: 'right', mobile: 'detail' },
                            { key: 'amount', header: 'Monto Total', cell: (c) => formatCurrency(c.total_amount), align: 'right', mobile: 'value' },
                            {
                                key: 'unique',
                                header: 'Productos Únicos',
                                cell: (c) => formatNumber(c.unique_products),
                                align: 'right',
                                mobile: 'detail',
                            },
                        ]}
                    />
                </Section>

                {productsData.low_stock_products.length > 0 && (
                    <Section title="Productos con Bajo Stock" description="Productos que requieren reabastecimiento">
                        <ReportTable
                            caption="Productos con bajo stock"
                            rows={productsData.low_stock_products}
                            rowKey={(product) => product.id}
                            columns={[
                                { key: 'code', header: 'Código', cell: (p) => <CodeTag code={p.code} />, mobile: 'subtitle' },
                                { key: 'name', header: 'Producto', cell: (p) => p.name, mobile: 'title' },
                                { key: 'stock', header: 'Stock Actual', cell: (p) => <StockTag stock={p.stock} />, align: 'right', mobile: 'value' },
                                { key: 'min', header: 'Stock Mínimo', cell: (p) => formatNumber(p.min_stock), align: 'right', mobile: 'detail' },
                            ]}
                        />
                    </Section>
                )}
                {productsData.top_products.length === 0 && productsData.products_by_category.length === 0 && (
                    <ReportEmpty>Sin ventas en el periodo.</ReportEmpty>
                )}
            </div>
        </AppLayout>
    );
}
