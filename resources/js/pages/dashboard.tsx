import { LowStockProducts, MetricCard, PendingSalesAlert, RecentSales, SalesByBranch, TopProducts } from '@/components/dashboard';
import { usePolling } from '@/hooks/use-polling';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { DollarSign, Package, ShoppingCart, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';

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
    userRole: string;
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
    userRole,
    userName,
}: DashboardProps) {
    // Polling: refresh dashboard data every 2 minutes
    usePolling(['metrics', 'growth', 'topProducts', 'recentSales', 'lowStockProducts', 'pendingSales', 'salesByBranch'], 120_000);

    const [currentGreeting, setCurrentGreeting] = useState('');

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
        }).format(amount);
    };

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
                    <p className="mt-1 text-sm text-muted-foreground">Aquí tienes el resumen de hoy.</p>
                </div>

                {/* Low-stock alert banner — shown only when there are affected products */}
                <LowStockProducts products={lowStockProducts} />

                {/* Pending sales alert — stock not yet deducted */}
                <PendingSalesAlert sales={pendingSales.items} total={pendingSales.total} />

                {/* Metric cards */}
                <div className={`grid grid-cols-2 gap-3 md:gap-4 ${userRole === 'administrador' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
                    <MetricCard
                        title="Ventas Hoy"
                        value={metrics.total_sales_today}
                        description="Transacciones del día"
                        icon={<ShoppingCart className="h-4 w-4" />}
                        trend={{ value: growth.sales_growth, isPositive: growth.sales_growth >= 0 }}
                    />
                    <MetricCard
                        title="Ingresos Hoy"
                        value={formatCurrency(metrics.total_revenue_today)}
                        description="Total facturado hoy"
                        icon={<DollarSign className="h-4 w-4" />}
                        trend={{ value: growth.revenue_growth, isPositive: growth.revenue_growth >= 0 }}
                    />
                    <MetricCard
                        title="Ingresos del Mes"
                        value={formatCurrency(metrics.total_revenue_month)}
                        description={`${metrics.total_sales_month} transacciones`}
                        icon={<DollarSign className="h-4 w-4" />}
                    />
                    <MetricCard title="Clientes" value={metrics.total_clients} description="Registrados" icon={<UserRound className="h-4 w-4" />} />
                    {userRole === 'administrador' && (
                        <MetricCard
                            title="Productos"
                            value={metrics.total_products}
                            description="En inventario"
                            icon={<Package className="h-4 w-4" />}
                        />
                    )}
                </div>

                {/* Main content */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <RecentSales sales={recentSales} />
                    <TopProducts products={topProducts} />
                </div>

                {/* Ventas por sucursal — admins only */}
                {userRole === 'administrador' && salesByBranch.length > 0 && <SalesByBranch branches={salesByBranch} />}
            </div>
        </AppLayout>
    );
}
