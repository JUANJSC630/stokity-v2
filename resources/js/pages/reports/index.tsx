import { DateField, FilterSelect, ReportFilterPanel, ReportHeader, ReportKpi } from '@/components/reports/report-parts';
import { type DateRange, type ReportFilters, type ReportUser, useReportFilters } from '@/components/reports/use-report-filters';
import { Section } from '@/components/sales/form-fields';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { usePolling } from '@/hooks/use-polling';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Activity, ArrowDownRight, ArrowUpRight, CalendarCheck, DollarSign, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import { type ReactNode, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Reportes', href: '/reports' }];

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

interface Props {
    dashboardData: DashboardData;
    filters: ReportFilters;
    branches: Array<{ id: number; name: string; business_name?: string }>;
    categories: Array<{ id: number; name: string }>;
    user?: ReportUser;
}

const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined || isNaN(num)) {
        return '0';
    }
    return new Intl.NumberFormat('es-CO').format(num);
};

const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600 dark:text-green-400';
    if (growth < 0) return 'text-red-600 dark:text-red-400';
    return 'text-neutral-600 dark:text-neutral-400';
};

const getPaymentMethodLabel = (method: string) => {
    // Mapeo de códigos a nombres para compatibilidad con datos existentes
    const methodLabels: Record<string, string> = {
        cash: 'Efectivo',
        transfer: 'Transferencia',
        credit_card: 'Tarjeta de Crédito',
        debit_card: 'Tarjeta de Débito',
        bank_transfer: 'Transferencia Bancaria',
        nequi: 'Nequi',
        daviplata: 'DaviPlata',
        pse: 'PSE (Pagos Seguros en Línea)',
        addi: 'Addi',
        bipi: 'Bipi',
        check: 'Cheque',
    };
    return methodLabels[method] || method;
};

function RankRow({ title, subtitle, value, detail, icon }: { title: string; subtitle: string; value: string; detail: string; icon?: ReactNode }) {
    return (
        <li className="flex items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
                {icon && (
                    <span className="text-muted-foreground" aria-hidden="true">
                        {icon}
                    </span>
                )}
                <div className="min-w-0">
                    <p className="truncate font-medium">{title}</p>
                    <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
                </div>
            </div>
            <div className="shrink-0 text-right">
                <p className="font-medium tabular-nums">{value}</p>
                <p className="text-sm text-muted-foreground">{detail}</p>
            </div>
        </li>
    );
}

function RankList({ children }: { children: ReactNode }) {
    return <ul className="divide-y divide-border/60 px-4 sm:px-5">{children}</ul>;
}

/** yyyy-mm-dd of a local calendar day (toISOString would shift it by the time-zone offset). */
const localDate = (year: number, month: number, day: number): string => {
    const date = new Date(year, month, day);
    const pad = (value: number) => String(value).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const STATUS_OPTIONS = [
    { value: 'completed', label: 'Completadas' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'credit_pending', label: 'Crédito Pendiente' },
    { value: 'cancelled', label: 'Canceladas' },
    { value: 'all', label: 'Todas' },
];

export default function ReportsIndex({ dashboardData, filters, branches, categories, user }: Props) {
    usePolling(['dashboardData'], 120_000);
    const onBrand = useOnBrandColor();
    const { localFilters, setLocalFilters, setFilter, dateRange, setDateRange, applyFilters, exportReport, activeCount } = useReportFilters({
        path: '/reports',
        exportBase: '/reports/export',
        filters,
        user,
    });
    const [reportMonth, setReportMonth] = useState('current');
    const [customMonth, setCustomMonth] = useState('');

    /** The dates of the chosen period, or null when the dates already typed (or no month yet) are the ones to apply. */
    const periodRange = (): DateRange | null => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        switch (reportMonth) {
            case 'current':
                return { from: localDate(currentYear, currentMonth, 1), to: localDate(currentYear, currentMonth + 1, 0) };
            case 'last':
                return { from: localDate(currentYear, currentMonth - 1, 1), to: localDate(currentYear, currentMonth, 0) };
            case 'custom': {
                if (!customMonth) return null;
                const [year, month] = customMonth.split('-');
                return { from: localDate(parseInt(year), parseInt(month) - 1, 1), to: localDate(parseInt(year), parseInt(month), 0) };
            }
            default:
                return null;
        }
    };

    const applyMonthFilter = () => {
        const range = periodRange();

        if (range) {
            setDateRange(range);
            applyFilters(range);
        } else {
            applyFilters();
        }
    };

    const { current, growth } = dashboardData.sales_summary;
    const GrowthIcon = growth.sales_count >= 0 ? ArrowUpRight : ArrowDownRight;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reportes de Ventas" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
                <ReportHeader title="Reportes de Ventas" subtitle="El pulso de tu negocio en el periodo que elijas" onExport={exportReport} />

                <section aria-label="Período del reporte" className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
                    <div>
                        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Período del Reporte</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Selecciona el período para generar el reporte</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                        <div className="space-y-1.5">
                            <label htmlFor="report-month" className="text-xs font-medium text-muted-foreground">
                                Período
                            </label>
                            <Select value={reportMonth} onValueChange={setReportMonth}>
                                <SelectTrigger id="report-month" className="h-11 w-full rounded-xl text-left sm:h-10">
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
                            <div className="space-y-1.5">
                                <label htmlFor="custom-month" className="text-xs font-medium text-muted-foreground">
                                    Mes
                                </label>
                                <input
                                    id="custom-month"
                                    type="month"
                                    value={customMonth}
                                    onChange={(e) => setCustomMonth(e.target.value)}
                                    className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:h-10"
                                />
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={applyMonthFilter}
                            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-semibold transition-opacity hover:opacity-90 sm:col-start-3 sm:h-10"
                            style={{ color: onBrand.hex }}
                        >
                            <CalendarCheck className="size-4" aria-hidden="true" />
                            Aplicar Período
                        </button>
                    </div>
                    {reportMonth === 'manual' && (
                        <div className="grid grid-cols-2 gap-3">
                            <DateField
                                id="date_from"
                                label="Fecha Desde"
                                value={dateRange.from}
                                onChange={(from) => setDateRange((prev) => ({ ...prev, from }))}
                            />
                            <DateField
                                id="date_to"
                                label="Fecha Hasta"
                                value={dateRange.to}
                                onChange={(to) => setDateRange((prev) => ({ ...prev, to }))}
                            />
                        </div>
                    )}
                </section>

                <ReportFilterPanel
                    title="Filtros y Período del Reporte"
                    description="Configura los filtros adicionales del reporte"
                    onApply={applyFilters}
                    activeCount={activeCount}
                >
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
                    <FilterSelect
                        id="status"
                        label="Estado"
                        value={localFilters.status || 'completed'}
                        onChange={(value) => setLocalFilters((prev) => ({ ...prev, status: value }))}
                        options={STATUS_OPTIONS}
                    />
                </ReportFilterPanel>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <ReportKpi label="Total Ventas" icon={<ShoppingCart className="size-4" />} hint="Ventas realizadas">
                        {formatNumber(current.total_sales)}
                    </ReportKpi>
                    <ReportKpi label="Ingresos Totales" icon={<DollarSign className="size-4" />} hint="Ingresos generados">
                        {formatCurrency(current.total_amount)}
                    </ReportKpi>
                    <ReportKpi label="Promedio por Venta" icon={<TrendingUp className="size-4" />} hint="Promedio por venta">
                        {formatCurrency(current.average_sale)}
                    </ReportKpi>
                    <ReportKpi
                        label="Crecimiento"
                        icon={<Activity className="size-4" />}
                        hint="vs mes anterior"
                        tone={getGrowthColor(growth.sales_count)}
                    >
                        <span className="inline-flex items-center gap-1">
                            <GrowthIcon className="size-5" aria-hidden="true" />
                            <span>
                                {growth.sales_count > 0 ? '+' : ''}
                                {growth.sales_count}%
                            </span>
                        </span>
                    </ReportKpi>
                </div>

                <Tabs defaultValue="overview" className="w-full gap-4">
                    <div className="overflow-x-auto">
                        <TabsList className="flex w-max min-w-full gap-1 p-1">
                            <TabsTrigger value="overview" className="px-3 py-2 text-xs whitespace-nowrap">
                                Resumen
                            </TabsTrigger>
                            <TabsTrigger value="products" className="px-3 py-2 text-xs whitespace-nowrap">
                                Productos
                            </TabsTrigger>
                            <TabsTrigger value="branches" className="px-3 py-2 text-xs whitespace-nowrap">
                                Sucursales
                            </TabsTrigger>
                            <TabsTrigger value="sellers" className="px-3 py-2 text-xs whitespace-nowrap">
                                Vendedores
                            </TabsTrigger>
                            <TabsTrigger value="payments" className="px-3 py-2 text-xs whitespace-nowrap">
                                Pagos
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="overview">
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                            <Section title="Productos Más Vendidos" description="Top productos por volumen de ventas">
                                <RankList>
                                    {dashboardData.top_products.slice(0, 5).map((product) => (
                                        <RankRow
                                            key={product.id}
                                            icon={<Package className="size-4" />}
                                            title={product.name}
                                            subtitle={product.code}
                                            value={formatCurrency(product.total_amount)}
                                            detail={`${formatNumber(product.total_quantity)} unidades`}
                                        />
                                    ))}
                                </RankList>
                            </Section>
                            <Section title="Devoluciones" description="Resumen de devoluciones">
                                <dl className="flex flex-col gap-3 px-4 pb-4 sm:px-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <dt className="text-sm font-medium">Total Devoluciones</dt>
                                        <dd className="text-2xl font-bold tabular-nums">
                                            {formatNumber(dashboardData.returns_summary.total_returns)}
                                        </dd>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <dt className="text-sm font-medium">Ventas con Devolución</dt>
                                        <dd className={cn('text-lg font-medium tabular-nums')}>
                                            {formatNumber(dashboardData.returns_summary.unique_sales_returned)}
                                        </dd>
                                    </div>
                                </dl>
                            </Section>
                        </div>
                    </TabsContent>

                    <TabsContent value="products">
                        <Section title="Productos Más Vendidos" description="Top 20 productos con mayor volumen de ventas">
                            <RankList>
                                {dashboardData.top_products.map((product) => (
                                    <RankRow
                                        key={product.id}
                                        icon={<Package className="size-4" />}
                                        title={product.name}
                                        subtitle={product.code}
                                        value={formatCurrency(product.total_amount)}
                                        detail={`${formatNumber(product.total_quantity)} unidades`}
                                    />
                                ))}
                            </RankList>
                        </Section>
                    </TabsContent>

                    <TabsContent value="branches">
                        <Section title="Ventas por Sucursal" description="Rendimiento de ventas por sucursal">
                            <RankList>
                                {dashboardData.sales_by_branch.map((branch) => (
                                    <RankRow
                                        key={branch.id}
                                        title={branch.business_name || branch.name}
                                        subtitle={`${formatNumber(branch.total_sales)} ventas`}
                                        value={formatCurrency(branch.total_amount)}
                                        detail={`Promedio: ${formatCurrency(branch.average_sale)}`}
                                    />
                                ))}
                            </RankList>
                        </Section>
                    </TabsContent>

                    <TabsContent value="sellers">
                        <Section title="Vendedores" description="Rendimiento de vendedores">
                            <RankList>
                                {dashboardData.sales_by_seller.map((seller) => (
                                    <RankRow
                                        key={seller.id}
                                        title={seller.name}
                                        subtitle={seller.email}
                                        value={formatCurrency(seller.total_amount)}
                                        detail={`${formatNumber(seller.total_sales)} ventas`}
                                    />
                                ))}
                            </RankList>
                        </Section>
                    </TabsContent>

                    <TabsContent value="payments">
                        <Section title="Métodos de Pago" description="Análisis de métodos de pago">
                            <RankList>
                                {dashboardData.payment_methods.map((method, index) => (
                                    <RankRow
                                        key={index}
                                        title={getPaymentMethodLabel(method.payment_method)}
                                        subtitle={`${formatNumber(method.transaction_count)} transacciones`}
                                        value={formatCurrency(method.total_amount)}
                                        detail={`Promedio: ${formatCurrency(method.average_amount)}`}
                                    />
                                ))}
                            </RankList>
                        </Section>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
