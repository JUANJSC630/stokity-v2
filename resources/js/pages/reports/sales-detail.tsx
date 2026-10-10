import { DateField, FilterSelect, ReportEmpty, ReportFilterPanel, ReportHeader } from '@/components/reports/report-parts';
import { type ReportFilters, useReportFilters } from '@/components/reports/use-report-filters';
import { Section } from '@/components/sales/form-fields';
import { Badge } from '@/components/ui/badge';
import { useMediaQuery } from '@/hooks/use-media-query';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reportes', href: '/reports' },
    { title: 'Detalle de Ventas', href: '/reports/sales-detail' },
];

interface StatusBlock {
    total_sales: number;
    total_amount: number;
    net_amount: number;
    tax_amount: number;
    average_sale: number;
}

interface SalesData {
    period: string;
    completed: StatusBlock;
    cancelled: StatusBlock;
    pending: StatusBlock;
    credit_pending: StatusBlock;
}

type Status = 'completed' | 'cancelled' | 'pending' | 'credit_pending';

const STATUSES: Array<{ key: Status; label: string }> = [
    { key: 'completed', label: 'Completadas' },
    { key: 'cancelled', label: 'Canceladas' },
    { key: 'pending', label: 'Pendientes' },
    { key: 'credit_pending', label: 'Crédito Pendiente' },
];

interface Props {
    salesData: SalesData[];
    filters: ReportFilters;
    branches?: Array<{ id: number; name: string; business_name?: string }>;
    categories?: Array<{ id: number; name: string }>;
    groupBy: string;
}

const formatNumber = (num: number) => new Intl.NumberFormat('es-CO').format(num);

const groupLabel = (groupBy: string) => (groupBy === 'day' ? 'día' : groupBy === 'week' ? 'semana' : groupBy === 'month' ? 'mes' : 'año');

export default function SalesDetail({ salesData = [], filters, branches = [], categories = [], groupBy }: Props) {
    const isWide = useMediaQuery('(min-width: 768px)');
    const { localFilters, setFilter, dateRange, setDateRange, applyFilters, exportReport, activeCount } = useReportFilters({
        path: '/reports/sales-detail',
        exportBase: '/reports/sales-detail/export',
        filters,
    });

    const getTotalsByStatus = (status: Status) => {
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

    const num = (value: number | undefined) => Number(value) || 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Detalle de Ventas" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
                <ReportHeader
                    title="Detalle de Ventas"
                    subtitle="Cada periodo con sus ventas completadas, canceladas y pendientes"
                    onExport={exportReport}
                />

                <ReportFilterPanel description="Configura los filtros para el análisis de ventas" onApply={applyFilters} activeCount={activeCount}>
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

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {STATUSES.map(({ key, label }) => {
                        const totals = getTotalsByStatus(key);

                        return (
                            <div key={key} className="rounded-2xl border border-border/60 bg-card p-4">
                                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                                <p className="mt-1 text-xl font-bold tracking-tight tabular-nums sm:text-2xl">{formatNumber(totals.total_sales)}</p>
                                <p className="text-xs text-muted-foreground">Ventas</p>
                                <p className="mt-2 text-base font-semibold tabular-nums">{formatCurrency(totals.total_amount)}</p>
                                <p className="text-xs text-muted-foreground">Monto total</p>
                            </div>
                        );
                    })}
                </div>

                <Section title="Detalle por Período" description={`Ventas desglosadas por ${groupLabel(groupBy)}`}>
                    {salesData.length === 0 ? (
                        <ReportEmpty>Sin ventas en el periodo.</ReportEmpty>
                    ) : isWide ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm" aria-label="Detalle de ventas por período">
                                <thead>
                                    <tr className="border-b border-border/60 text-xs text-muted-foreground">
                                        <th className="px-3 py-2 text-left font-medium">Período</th>
                                        {STATUSES.map(({ key, label }) => (
                                            <th key={key} colSpan={5} className="border-l border-border/60 px-3 py-2 text-center font-medium">
                                                {label}
                                            </th>
                                        ))}
                                    </tr>
                                    <tr className="border-b border-border/60 text-xs text-muted-foreground">
                                        <th className="px-3 py-2 text-left font-medium">Fecha</th>
                                        {STATUSES.flatMap(({ key }) =>
                                            ['Ventas', 'Monto', 'Neto', 'Imp.', 'Prom.'].map((header, i) => (
                                                <th
                                                    key={`${key}-${header}`}
                                                    className={cn('px-3 py-2 text-right font-medium', i === 0 && 'border-l border-border/60')}
                                                >
                                                    {header}
                                                </th>
                                            )),
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {salesData.map((item, index) => (
                                        <tr key={index} className="border-b border-border/40 last:border-0 hover:bg-muted/40">
                                            <td className="px-3 py-2">
                                                <Badge variant="outline">{item.period}</Badge>
                                            </td>
                                            {STATUSES.map(({ key }) => (
                                                <StatusCells key={key} block={item[key]} />
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <ul className="divide-y divide-border/60 px-4">
                            {salesData.map((item, index) => (
                                <li key={index} className="py-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <Badge variant="outline">{item.period}</Badge>
                                        <span className="font-semibold tabular-nums">{formatCurrency(num(item.completed?.total_amount))}</span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                                        <span>{formatNumber(num(item.completed?.total_sales))} ventas</span>
                                        <span>Prom: {formatCurrency(num(item.completed?.average_sale))}</span>
                                        {num(item.cancelled?.total_sales) > 0 && (
                                            <span className="text-red-500">{formatNumber(num(item.cancelled?.total_sales))} cancel.</span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>
            </div>
        </AppLayout>
    );
}

function StatusCells({ block }: { block: StatusBlock | undefined }) {
    const num = (value: number | undefined) => Number(value) || 0;

    return (
        <>
            <td className="border-l border-border/60 px-3 py-2 text-right tabular-nums">{formatNumber(num(block?.total_sales))}</td>
            <td className="px-3 py-2 text-right font-medium tabular-nums">{formatCurrency(num(block?.total_amount))}</td>
            <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(num(block?.net_amount))}</td>
            <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(num(block?.tax_amount))}</td>
            <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(num(block?.average_sale))}</td>
        </>
    );
}
