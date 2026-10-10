import { DateField, FilterSelect, ReportFilterPanel, ReportHeader, ReportKpi, ReportTable } from '@/components/reports/report-parts';
import { type ReportFilters, useReportFilters } from '@/components/reports/use-report-filters';
import { Section } from '@/components/sales/form-fields';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency } from '@/lib/format';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Award, Building, TrendingUp } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reportes', href: '/reports' },
    { title: 'Reporte de Sucursales', href: '/reports/branches' },
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

interface Props {
    branchesData?: {
        branches_performance: BranchPerformance[];
        branches_comparison: BranchComparison[];
        branches_by_region: BranchByRegion[];
    };
    filters: ReportFilters;
    branches?: Array<{ id: number; name: string; business_name?: string }>;
    categories?: Array<{ id: number; name: string }>;
}

const formatNumber = (num: number) => new Intl.NumberFormat('es-CO').format(num);

export default function BranchesReport({
    branchesData = { branches_performance: [], branches_comparison: [], branches_by_region: [] },
    filters,
    branches = [],
    categories = [],
}: Props) {
    const { localFilters, setFilter, dateRange, setDateRange, applyFilters, exportReport, activeCount } = useReportFilters({
        path: '/reports/branches',
        exportBase: '/reports/branches/export',
        filters,
    });

    const totalBranches = branchesData?.branches_performance?.length || 0;
    const totalSales = branchesData?.branches_performance?.reduce((sum, branch) => sum + branch.total_sales, 0) || 0;
    const totalRevenue = branchesData?.branches_performance?.reduce((sum, branch) => sum + branch.total_amount, 0) || 0;
    const regions = branchesData?.branches_by_region ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reporte de Sucursales" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
                <ReportHeader title="Reporte de Sucursales" subtitle="Qué sucursal vende más y cómo se comparan entre sí" onExport={exportReport} />

                <ReportFilterPanel
                    description="Configura los filtros para el análisis de sucursales"
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
                    <FilterSelect
                        id="branch"
                        label="Sucursal"
                        value={localFilters.branch_id || 'all'}
                        onChange={(value) => setFilter('branch_id', value)}
                        allLabel="Todas las sucursales"
                        options={branches.map((branch) => ({ value: branch.id.toString(), label: branch.business_name || branch.name }))}
                    />
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
                    <ReportKpi label="Sucursales Activas" icon={<Building className="size-4" />} hint="Sucursales con ventas">
                        {formatNumber(totalBranches)}
                    </ReportKpi>
                    <ReportKpi label="Total Ventas" icon={<TrendingUp className="size-4" />} hint="Ventas realizadas">
                        {formatNumber(totalSales)}
                    </ReportKpi>
                    <ReportKpi label="Ingresos Totales" icon={<Award className="size-4" />} hint="Ingresos generados">
                        {formatCurrency(totalRevenue)}
                    </ReportKpi>
                </div>

                <Section title="Rendimiento de Sucursales" description="Análisis detallado por sucursal">
                    <ReportTable
                        caption="Rendimiento de sucursales"
                        rows={branchesData?.branches_performance ?? []}
                        rowKey={(branch) => branch.id}
                        columns={[
                            { key: 'name', header: 'Sucursal', cell: (b) => b.name, mobile: 'title' },
                            { key: 'business', header: 'Nombre Comercial', cell: (b) => b.business_name, mobile: 'subtitle' },
                            { key: 'address', header: 'Dirección', cell: (b) => b.address, mobile: 'detail' },
                            { key: 'sales', header: 'Ventas', cell: (b) => formatNumber(b.total_sales), align: 'right', mobile: 'detail' },
                            { key: 'amount', header: 'Monto Total', cell: (b) => formatCurrency(b.total_amount), align: 'right', mobile: 'value' },
                            { key: 'avg', header: 'Promedio', cell: (b) => formatCurrency(b.average_sale), align: 'right', mobile: 'detail' },
                            { key: 'sellers', header: 'Vendedores', cell: (b) => formatNumber(b.active_sellers), align: 'right', mobile: 'detail' },
                        ]}
                    />
                </Section>

                <Section title="Comparación de Sucursales" description="Métricas comparativas entre sucursales">
                    <ReportTable
                        caption="Comparación de sucursales"
                        rows={branchesData?.branches_comparison ?? []}
                        rowKey={(branch) => branch.id}
                        columns={[
                            { key: 'name', header: 'Sucursal', cell: (b) => b.name, mobile: 'title' },
                            { key: 'sales', header: 'Ventas', cell: (b) => formatNumber(b.sales_count), align: 'right', mobile: 'detail' },
                            { key: 'amount', header: 'Monto Total', cell: (b) => formatCurrency(b.total_amount), align: 'right', mobile: 'value' },
                            { key: 'avg', header: 'Promedio', cell: (b) => formatCurrency(b.average_sale), align: 'right', mobile: 'detail' },
                            { key: 'days', header: 'Días Activos', cell: (b) => formatNumber(b.active_days), align: 'right', mobile: 'detail' },
                        ]}
                    />
                </Section>

                {regions.length > 0 && (
                    <Section title="Sucursales por Región" description="Desglose de sucursales por región geográfica">
                        <ReportTable
                            caption="Sucursales por región"
                            rows={regions}
                            rowKey={(branch) => branch.id}
                            columns={[
                                { key: 'name', header: 'Sucursal', cell: (b) => b.name, mobile: 'title' },
                                { key: 'business', header: 'Nombre Comercial', cell: (b) => b.business_name, mobile: 'subtitle' },
                                { key: 'region', header: 'Región', cell: (b) => <Badge variant="outline">{b.region}</Badge>, mobile: 'detail' },
                                { key: 'sales', header: 'Ventas', cell: (b) => formatNumber(b.total_sales), align: 'right', mobile: 'detail' },
                                {
                                    key: 'amount',
                                    header: 'Monto Total',
                                    cell: (b) => formatCurrency(b.total_amount),
                                    align: 'right',
                                    mobile: 'value',
                                },
                            ]}
                        />
                    </Section>
                )}
            </div>
        </AppLayout>
    );
}
