import {
    AttentionPanel,
    CashStatus,
    LowStockProducts,
    MonthPace,
    OverdueCreditsAlert,
    PendingSalesAlert,
    RecentSales,
    RevenueHero,
    SalesByBranch,
    TopProducts,
    type CashSessionState,
    type OverdueCredits,
    type PaymentRow,
    type PreviousMonth,
} from '@/components/dashboard';
import { StaggerItem } from '@/components/ui/bencho/stagger-item';
import { usePermissions } from '@/hooks/use-permissions';
import { usePolling } from '@/hooks/use-polling';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCallback, useEffect, useState } from 'react';

const DASHBOARD_PROPS = [
    'metrics',
    'growth',
    'topProducts',
    'recentSales',
    'lowStockProducts',
    'pendingSales',
    'salesByBranch',
    'dailySales',
    'paymentBreakdown',
    'cashSession',
    'overdueCredits',
    'previousMonth',
];

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
    paymentBreakdown?: PaymentRow[];
    cashSession?: CashSessionState | null;
    overdueCredits?: OverdueCredits | null;
    previousMonth?: PreviousMonth | null;
    userName: string;
}

export default function Dashboard({
    metrics,
    growth,
    topProducts,
    salesByBranch,
    recentSales,
    lowStockProducts,
    pendingSales = { total: 0, items: [] },
    dailySales,
    paymentBreakdown = [],
    cashSession = null,
    overdueCredits = null,
    previousMonth = null,
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

    const attentionCount =
        (lowStockProducts.length > 0 ? 1 : 0) +
        (pendingSales.total > 0 || pendingSales.items.length > 0 ? 1 : 0) +
        (overdueCredits && overdueCredits.count > 0 ? 1 : 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inicio" />
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 overflow-x-clip p-4 md:p-6">
                <StaggerItem index={0} className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold tracking-tight">
                            {currentGreeting}, {userName}!
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">
                            {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
                        </p>
                    </div>
                    <CashStatus cashSession={cashSession} openHref={can('pos.access') ? route('pos.index') : undefined} />
                </StaggerItem>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem]">
                    <StaggerItem index={1} className="order-1 lg:col-start-1">
                        <RevenueHero
                            revenueToday={metrics.total_revenue_today}
                            revenueGrowth={growth.revenue_growth}
                            salesToday={metrics.total_sales_today}
                            averageSale={metrics.average_sale_today}
                            dailySales={dailySales ?? []}
                            paymentBreakdown={paymentBreakdown}
                            onRefresh={refresh}
                        />
                    </StaggerItem>

                    {/* On a phone these are ordinary items of the grid (so they interleave with the others); from lg up they stack in one right column. */}
                    <div className="contents lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:flex lg:flex-col lg:gap-5">
                        <StaggerItem index={2} className="order-2">
                            <AttentionPanel count={attentionCount}>
                                <LowStockProducts products={lowStockProducts} />
                                <PendingSalesAlert sales={pendingSales.items} total={pendingSales.total} />
                                <OverdueCreditsAlert overdue={overdueCredits} href={route('credits.index', { tab: 'overdue' })} />
                            </AttentionPanel>
                        </StaggerItem>
                        <StaggerItem index={4} className="order-4">
                            <RecentSales sales={recentSales} />
                        </StaggerItem>
                    </div>

                    <StaggerItem index={3} className="order-3 lg:col-start-1">
                        <MonthPace
                            revenue={metrics.total_revenue_month}
                            sales={metrics.total_sales_month}
                            averageSale={metrics.average_sale_month}
                            previous={previousMonth}
                            financesHref={can('finances.view') ? route('finances.summary') : undefined}
                        />
                    </StaggerItem>

                    <StaggerItem index={5} className="order-5 lg:col-start-1">
                        <TopProducts products={topProducts} />
                    </StaggerItem>
                </div>

                {canViewBranchSales && salesByBranch.length > 0 && (
                    <StaggerItem index={6}>
                        <SalesByBranch branches={salesByBranch} />
                    </StaggerItem>
                )}
            </div>
        </AppLayout>
    );
}
