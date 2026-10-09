import { LowStockProducts, MetricCard, PendingSalesAlert, RecentSales, RevenueHero, SalesByBranch, TopProducts } from '@/components/dashboard';
import { usePermissions } from '@/hooks/use-permissions';
import { usePolling } from '@/hooks/use-polling';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency } from '@/lib/format';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DollarSign, Package, UserRound } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const DASHBOARD_PROPS = ['metrics', 'growth', 'topProducts', 'recentSales', 'lowStockProducts', 'pendingSales', 'salesByBranch', 'dailySales'];

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Inicio',
        href: '/dashboard',
    },
];

interface DashboardProps {
    metrics: {
        total_sales_today: number;
        total_sales_month: number;
        total_revenue_today: number;
        total_revenue_month: number;
        average_sale_today: number;
        average_sale_month: number;
        total_products: number;
        low_stock_products: number;
        total_clients: number;
        total_users: number;
    };

    growth: {
        sales_growth: number;
        revenue_growth: number;
    };

    topProducts: Array<{
        id: number;
        name: string;
        code: string;
        image?: string;
        total_quantity: number;
        total_amount: number;
        sales_count: number;
    }>;
    salesByBranch: Array<{
        id: number;
        name: string;
        business_name: string;
        total_sales: number;
        total_amount: number;
        average_sale: number;
    }>;
    recentSales: Array<{
        id: number;
        code: string;
        total: number;
        date: string;
        status: string;
        client?: {
            name: string;
        };
        seller?: {
            name: string;
        };
        branch?: {
            name: string;
        };
    }>;
    lowStockProducts: Array<{
        id: number;
        name: string;
        code: string;
        stock: number;
        min_stock: number;
        category?: { name: string };
        branch?: { name: string };
    }>;
    pendingSales?: {
        total: number;
        items: Array<{
            id: number;
            code: string;
            total: number;
            seller?: { name: string };
            branch?: { name: string };
            products: Array<{ product_id: number; name: string; quantity: number }>;
        }>;
    };
    dailySales: Array<{
        date: string;
        total_sales: number;
        total_amount: number;
    }>;
    userName: string;
}

const formatCount = (value: number): string => String(value);

export default function Dashboard({
    metrics,
    growth,
    topProducts,
    salesByBranch,
    recentSales,
    lowStockProducts,
    pendingSales = { total: 0, items: [] },
    dailySales,
    userName,
}: DashboardProps) {
    // Polling: refresh dashboard data every 2 minutes
    usePolling(DASHBOARD_PROPS, 120_000);

    const refresh = useCallback(
        () =>
            new Promise<void>((resolve) => {
                router.reload({ only: DASHBOARD_PROPS, onFinish: () => resolve() });
            }),
        [],
    );
    const { can } = usePermissions();
    const canViewLowStock = can('dashboard.low_stock.view');
    const canViewBranchSales = can('dashboard.branch_sales.view');

    const [currentGreeting, setCurrentGreeting] = useState('');

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'Buenos días';
        if (hour >= 12 && hour < 19) return 'Buenas tardes';
        return 'Buenas noches';
    };

    useEffect(() => {
        setCurrentGreeting(getGreeting());
        const interval = setInterval(() => setCurrentGreeting(getGreeting()), 3600000);
        return () => clearInterval(interval);
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inicio" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-hidden rounded-xl p-4 md:p-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {currentGreeting}, {userName}!
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">
                        {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                </div>

                {/* Low-stock alert banner — shown only when there are affected products */}
                <LowStockProducts products={lowStockProducts} />

                {/* Pending sales alert — stock not yet deducted */}
                <PendingSalesAlert sales={pendingSales.items} total={pendingSales.total} />

                {/* Today's revenue (pull down to refresh) next to the month and the catalog */}
                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <RevenueHero
                            revenueToday={metrics.total_revenue_today}
                            revenueGrowth={growth.revenue_growth}
                            salesToday={metrics.total_sales_today}
                            averageSale={metrics.average_sale_today}
                            dailySales={dailySales ?? []}
                            onRefresh={refresh}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-1">
                        <MetricCard
                            className="col-span-2 lg:col-span-1"
                            title="Ingresos del Mes"
                            value={metrics.total_revenue_month}
                            format={formatCurrency}
                            description={
                                <span>
                                    {metrics.total_sales_month} transacciones · bruto antes de devoluciones
                                    {can('finances.view') && (
                                        <>
                                            {' · '}
                                            <a href={route('finances.summary')} className="underline underline-offset-2 hover:text-foreground">
                                                Ver en Finanzas
                                            </a>
                                        </>
                                    )}
                                </span>
                            }
                            icon={<DollarSign className="h-4 w-4" />}
                        />
                        <MetricCard
                            title="Clientes"
                            value={metrics.total_clients}
                            format={formatCount}
                            description="Registrados"
                            icon={<UserRound className="h-4 w-4" />}
                        />
                        {canViewLowStock && (
                            <MetricCard
                                title="Productos"
                                value={metrics.total_products}
                                format={formatCount}
                                description="En inventario"
                                icon={<Package className="h-4 w-4" />}
                            />
                        )}
                    </div>
                </div>

                {/* Main content */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <RecentSales sales={recentSales} />
                    <TopProducts products={topProducts} />
                </div>

                {/* Ventas por sucursal — admins only */}
                {canViewBranchSales && salesByBranch.length > 0 && <SalesByBranch branches={salesByBranch} />}
            </div>
        </AppLayout>
    );
}
