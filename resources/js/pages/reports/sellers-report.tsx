import { DateField, FilterSelect, ReportFilterPanel, ReportHeader, ReportKpi, ReportTable } from '@/components/reports/report-parts';
import { type ReportFilters, type ReportUser, useReportFilters } from '@/components/reports/use-report-filters';
import { Section } from '@/components/sales/form-fields';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Award, TrendingDown, TrendingUp, Users2 } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Reportes', href: '/reports' },
    { title: 'Reporte de Vendedores', href: '/reports/sellers' },
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

interface Props {
    sellersData?: {
        sellers_performance: SellerPerformance[];
        sellers_comparison: SellerComparison[];
        sellers_by_branch: SellerByBranch[];
    };
    filters: ReportFilters;
    branches?: Array<{ id: number; name: string; business_name?: string }>;
    categories?: Array<{ id: number; name: string }>;
    user?: ReportUser;
}

const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined || isNaN(num)) {
        return '0';
    }
    return new Intl.NumberFormat('es-CO').format(num);
};

function Growth({ value }: { value: number }) {
    const Icon = value >= 0 ? TrendingUp : TrendingDown;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 font-semibold',
                value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
            )}
        >
            <Icon className="size-4" aria-hidden="true" />
            <span>
                {value > 0 ? '+' : ''}
                {value}%
            </span>
        </span>
    );
}

export default function SellersReport({
    sellersData = { sellers_performance: [], sellers_comparison: [], sellers_by_branch: [] },
    filters,
    branches = [],
    categories = [],
    user,
}: Props) {
    const { localFilters, setFilter, dateRange, setDateRange, applyFilters, exportReport, activeCount } = useReportFilters({
        path: '/reports/sellers',
        exportBase: '/reports/sellers/export',
        filters,
        user,
    });

    const totalSellers = sellersData?.sellers_performance?.length ?? 0;
    const totalSales = sellersData?.sellers_performance?.reduce((sum, seller) => sum + seller.total_sales, 0) || 0;
    const totalRevenue = sellersData?.sellers_performance?.reduce((sum, seller) => sum + seller.total_amount, 0) || 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reporte de Vendedores" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
                <ReportHeader
                    title="Reporte de Vendedores"
                    subtitle="Cuánto vende cada persona y cómo cambia frente al periodo anterior"
                    onExport={exportReport}
                />

                <ReportFilterPanel
                    description="Configura los filtros para el análisis de vendedores"
                    onApply={applyFilters}
                    activeCount={activeCount}
                >
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
                    <ReportKpi label="Vendedores Activos" icon={<Users2 className="size-4" />} hint="Vendedores con ventas">
                        {formatNumber(totalSellers)}
                    </ReportKpi>
                    <ReportKpi label="Total Ventas" icon={<TrendingUp className="size-4" />} hint="Ventas realizadas">
                        {formatNumber(totalSales)}
                    </ReportKpi>
                    <ReportKpi label="Ingresos Totales" icon={<Award className="size-4" />} hint="Ingresos generados">
                        {formatCurrency(totalRevenue)}
                    </ReportKpi>
                </div>

                <Section title="Rendimiento de Vendedores" description="Top vendedores por volumen de ventas">
                    <ReportTable
                        caption="Rendimiento de vendedores"
                        rows={Array.isArray(sellersData?.sellers_performance) ? sellersData.sellers_performance : []}
                        rowKey={(seller) => seller.id}
                        columns={[
                            { key: 'name', header: 'Vendedor', cell: (s) => s.name, mobile: 'title' },
                            { key: 'email', header: 'Email', cell: (s) => s.email, mobile: 'subtitle' },
                            { key: 'sales', header: 'Ventas', cell: (s) => formatNumber(s.total_sales), align: 'right', mobile: 'detail' },
                            { key: 'amount', header: 'Monto Total', cell: (s) => formatCurrency(s.total_amount), align: 'right', mobile: 'value' },
                            { key: 'avg', header: 'Promedio', cell: (s) => formatCurrency(s.average_sale), align: 'right', mobile: 'detail' },
                        ]}
                    />
                </Section>

                <Section title="Comparación de Períodos" description="Crecimiento de ventas vs período anterior">
                    <ReportTable
                        caption="Comparación de períodos"
                        rows={Array.isArray(sellersData?.sellers_comparison) ? sellersData.sellers_comparison : []}
                        rowKey={(seller) => seller.id}
                        columns={[
                            { key: 'name', header: 'Vendedor', cell: (s) => s.name, mobile: 'title' },
                            {
                                key: 'current',
                                header: 'Período Actual',
                                cell: (s) => formatNumber(s.current_period_sales),
                                align: 'right',
                                mobile: 'detail',
                            },
                            {
                                key: 'previous',
                                header: 'Período Anterior',
                                cell: (s) => formatNumber(s.previous_period_sales),
                                align: 'right',
                                mobile: 'detail',
                            },
                            {
                                key: 'growth',
                                header: 'Crecimiento',
                                cell: (s) => <Growth value={s.growth_percentage} />,
                                align: 'right',
                                mobile: 'value',
                            },
                        ]}
                    />
                </Section>

                <Section title="Vendedores por Sucursal" description="Desglose de vendedores por sucursal">
                    <ReportTable
                        caption="Vendedores por sucursal"
                        rows={Array.isArray(sellersData?.sellers_by_branch) ? sellersData.sellers_by_branch : []}
                        rowKey={(seller, index) => `${seller.id}-${index}`}
                        columns={[
                            { key: 'name', header: 'Vendedor', cell: (s) => s.name, mobile: 'title' },
                            { key: 'email', header: 'Email', cell: (s) => s.email, mobile: 'subtitle' },
                            { key: 'branch', header: 'Sucursal', cell: (s) => s.branch_name, mobile: 'detail' },
                            { key: 'sales', header: 'Ventas', cell: (s) => formatNumber(s.total_sales), align: 'right', mobile: 'detail' },
                            { key: 'amount', header: 'Monto Total', cell: (s) => formatCurrency(s.total_amount), align: 'right', mobile: 'value' },
                        ]}
                    />
                </Section>
            </div>
        </AppLayout>
    );
}
