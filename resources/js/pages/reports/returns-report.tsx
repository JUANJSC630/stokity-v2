import { DateField, FilterSelect, ReportFilterPanel, ReportHeader, ReportKpi, ReportTable } from '@/components/reports/report-parts';
import { type ReportFilters, type ReportUser, useReportFilters } from '@/components/reports/use-report-filters';
import { Section } from '@/components/sales/form-fields';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency } from '@/lib/format';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, RotateCcw, TrendingUp } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reportes', href: '/reports' },
    { title: 'Reporte de Devoluciones', href: '/reports/returns' },
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

interface ReturnDetail {
    id: number;
    sale_id: number;
    sale_code: string | null;
    sale_deleted: boolean;
    reason: string | null;
    created_at: string;
    user: string | null;
    total: number;
    products: Array<{ name: string; quantity: number }>;
}

function SaleLinkCell({ ret }: { ret: ReturnDetail }) {
    if (!ret.sale_code) return <span className="text-muted-foreground">—</span>;
    return (
        <div className="flex items-center gap-1.5">
            {ret.sale_deleted ? (
                <Link
                    href={route('sales.deleted.show', ret.sale_id)}
                    className="font-medium text-muted-foreground [text-decoration-line:underline_line-through] underline-offset-2 hover:opacity-80"
                >
                    #{ret.sale_code}
                </Link>
            ) : (
                <Link href={route('sales.show', ret.sale_id)} className="font-medium text-primary underline underline-offset-2 hover:opacity-80">
                    #{ret.sale_code}
                </Link>
            )}
            {ret.sale_deleted && (
                <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                    Eliminada
                </Badge>
            )}
        </div>
    );
}

interface Props {
    returnsData?: {
        returns_summary: ReturnSummary;
        returns_by_product: ReturnByProduct[];
        returns_by_reason: ReturnByReason[];
        returns_trend: ReturnTrend[];
        returns_detail: ReturnDetail[];
    };
    filters: ReportFilters;
    branches?: Array<{ id: number; name: string; business_name?: string }>;
    categories?: Array<{ id: number; name: string }>;
    user?: ReportUser;
}

const formatNumber = (num: number) => new Intl.NumberFormat('es-CO').format(num);

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

const productsLabel = (ret: ReturnDetail) => ret.products.map((p) => `${p.quantity}× ${p.name}`).join(', ');

export default function ReturnsReport({
    returnsData = {
        returns_summary: { total_returns: 0, total_amount: 0, average_return: 0, return_rate: 0 },
        returns_by_product: [],
        returns_by_reason: [],
        returns_trend: [],
        returns_detail: [],
    },
    filters,
    branches = [],
    categories = [],
    user,
}: Props) {
    const { localFilters, setFilter, dateRange, setDateRange, applyFilters, exportReport, activeCount } = useReportFilters({
        path: '/reports/returns',
        exportBase: '/reports/returns/export',
        filters,
        user,
    });

    const summary = returnsData?.returns_summary || { total_returns: 0, total_amount: 0, average_return: 0, return_rate: 0 };
    const detail = returnsData?.returns_detail ?? [];
    const trend = returnsData?.returns_trend ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reporte de Devoluciones" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
                <ReportHeader
                    title="Reporte de Devoluciones"
                    subtitle="Qué se devuelve, por qué y cuánto pesa en tus ventas"
                    onExport={exportReport}
                />

                <ReportFilterPanel
                    description="Configura los filtros para el análisis de devoluciones"
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

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <ReportKpi label="Total Devoluciones" icon={<RotateCcw className="size-4" />} hint="Devoluciones realizadas">
                        {formatNumber(summary.total_returns)}
                    </ReportKpi>
                    <ReportKpi label="Monto Total" icon={<AlertTriangle className="size-4" />} hint="Valor de devoluciones">
                        {formatCurrency(summary.total_amount)}
                    </ReportKpi>
                    <ReportKpi label="Promedio por Devolución" icon={<TrendingUp className="size-4" />} hint="Valor promedio">
                        {formatCurrency(summary.average_return)}
                    </ReportKpi>
                    <ReportKpi
                        label="Tasa de Devolución"
                        icon={<AlertTriangle className="size-4" />}
                        hint="Porcentaje de devoluciones"
                        tone={getReturnRateColor(summary.return_rate)}
                    >
                        {formatPercentage(summary.return_rate)}
                    </ReportKpi>
                </div>

                <Section title="Devoluciones por Producto" description="Productos con mayor tasa de devolución">
                    <ReportTable
                        caption="Devoluciones por producto"
                        rows={returnsData?.returns_by_product ?? []}
                        rowKey={(product) => product.id}
                        columns={[
                            {
                                key: 'code',
                                header: 'Código',
                                cell: (p) => <Badge variant="outline">{p.code}</Badge>,
                                mobile: 'subtitle',
                            },
                            { key: 'name', header: 'Producto', cell: (p) => p.name, mobile: 'title' },
                            { key: 'returns', header: 'Devoluciones', cell: (p) => formatNumber(p.total_returns), align: 'right', mobile: 'detail' },
                            { key: 'qty', header: 'Cantidad', cell: (p) => formatNumber(p.total_quantity), align: 'right', mobile: 'detail' },
                            { key: 'amount', header: 'Monto Total', cell: (p) => formatCurrency(p.total_amount), align: 'right', mobile: 'value' },
                            {
                                key: 'rate',
                                header: 'Tasa',
                                cell: (p) => (
                                    <span className="inline-flex items-center justify-end gap-2">
                                        {getReturnRateBadge(p.return_rate)}
                                        <span className={getReturnRateColor(p.return_rate)}>{formatPercentage(p.return_rate)}</span>
                                    </span>
                                ),
                                align: 'right',
                                mobile: 'detail',
                            },
                        ]}
                    />
                </Section>

                <Section title="Devoluciones por Razón" description="Análisis de motivos de devolución">
                    <ReportTable
                        caption="Devoluciones por razón"
                        rows={returnsData?.returns_by_reason ?? []}
                        rowKey={(_reason, index) => index}
                        columns={[
                            { key: 'reason', header: 'Razón', cell: (r) => r.reason || 'Sin especificar', mobile: 'title' },
                            { key: 'count', header: 'Cantidad', cell: (r) => formatNumber(r.count), align: 'right', mobile: 'detail' },
                            { key: 'amount', header: 'Monto Total', cell: (r) => formatCurrency(r.total_amount), align: 'right', mobile: 'value' },
                            { key: 'pct', header: 'Porcentaje', cell: (r) => formatPercentage(r.percentage), align: 'right', mobile: 'detail' },
                        ]}
                    />
                </Section>

                {detail.length > 0 && (
                    <Section title="Historial de Devoluciones" description="Cada devolución con enlace a la venta original">
                        <ReportTable
                            caption="Historial de devoluciones"
                            rows={detail}
                            rowKey={(ret) => ret.id}
                            columns={[
                                { key: 'date', header: 'Fecha', cell: (r) => r.created_at, mobile: 'subtitle' },
                                { key: 'sale', header: 'Venta origen', cell: (r) => <SaleLinkCell ret={r} />, mobile: 'title' },
                                { key: 'products', header: 'Productos devueltos', cell: productsLabel, mobile: 'detail' },
                                { key: 'reason', header: 'Razón', cell: (r) => r.reason || '—', mobile: 'detail' },
                                { key: 'user', header: 'Procesado por', cell: (r) => r.user || '—', mobile: 'hide' },
                                { key: 'total', header: 'Monto', cell: (r) => formatCurrency(r.total), align: 'right', mobile: 'value' },
                            ]}
                        />
                    </Section>
                )}

                {trend.length > 0 && (
                    <Section title="Tendencia de Devoluciones" description="Evolución de devoluciones en el tiempo">
                        <ReportTable
                            caption="Tendencia de devoluciones"
                            rows={trend}
                            rowKey={(_t, index) => index}
                            columns={[
                                { key: 'date', header: 'Fecha', cell: (t) => <Badge variant="outline">{t.date}</Badge>, mobile: 'title' },
                                {
                                    key: 'count',
                                    header: 'Devoluciones',
                                    cell: (t) => formatNumber(t.returns_count),
                                    align: 'right',
                                    mobile: 'detail',
                                },
                                {
                                    key: 'amount',
                                    header: 'Monto Total',
                                    cell: (t) => formatCurrency(t.returns_amount),
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
