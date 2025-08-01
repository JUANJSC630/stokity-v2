import { LowStockProducts, MetricCard, RecentSales, SalesByBranch, SalesChart, TopProducts } from '@/components/dashboard';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { AlertTriangle, DollarSign, Package, ShoppingCart, TrendingUp, UserRound, Users } from 'lucide-react';
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
        category?: {
            name: string;
        };
        branch?: {
            name: string;
        };
    }>;
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
    dailySales,
    userRole,
    userName,
}: DashboardProps) {
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

        if (hour >= 5 && hour < 12) {
            return 'Buenos días';
        } else if (hour >= 12 && hour < 19) {
            return 'Buenas tardes';
        } else {
            return 'Buenas noches';
        }
    };

    // Actualizar el saludo cada hora
    useEffect(() => {
        const updateGreeting = () => {
            setCurrentGreeting(getGreeting());
        };

        // Establecer el saludo inicial
        updateGreeting();

        // Actualizar cada hora
        const interval = setInterval(updateGreeting, 3600000);

        // Limpiar el intervalo cuando el componente se desmonte
        return () => clearInterval(interval);
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inicio" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-6">
                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">
                        {currentGreeting}, {userName}!
                    </h1>
                    <p className="text-muted-foreground">
                        Bienvenido al panel de control de Stokity. Aquí puedes ver un resumen de las métricas más importantes.
                    </p>
                </div>

                {/* Métricas principales */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                        title="Ventas Hoy"
                        value={metrics.total_sales_today}
                        description="Transacciones del día"
                        icon={<ShoppingCart className="h-4 w-4" />}
                        trend={{
                            value: growth.sales_growth,
                            isPositive: growth.sales_growth >= 0,
                        }}
                    />
                    <MetricCard
                        title="Ingresos Hoy"
                        value={formatCurrency(metrics.total_revenue_today)}
                        description="Total facturado hoy"
                        icon={<DollarSign className="h-4 w-4" />}
                        trend={{
                            value: growth.revenue_growth,
                            isPositive: growth.revenue_growth >= 0,
                        }}
                    />
                    <MetricCard title="Productos" value={metrics.total_products} description="En inventario" icon={<Package className="h-4 w-4" />} />
                    <MetricCard title="Clientes" value={metrics.total_clients} description="Registrados" icon={<UserRound className="h-4 w-4" />} />
                </div>

                {/* Métricas secundarias */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <MetricCard
                        title="Promedio de Venta"
                        value={formatCurrency(metrics.average_sale_today)}
                        description="Por transacción hoy"
                        icon={<TrendingUp className="h-4 w-4" />}
                    />
                    <MetricCard
                        title="Productos Bajo Stock"
                        value={metrics.low_stock_products}
                        description="Requieren atención"
                        icon={<AlertTriangle className="h-4 w-4" />}
                    />
                    {userRole === 'administrador' && (
                        <MetricCard
                            title="Usuarios Activos"
                            value={metrics.total_users}
                            description="En el sistema"
                            icon={<Users className="h-4 w-4" />}
                        />
                    )}
                </div>

                {/* Gráficos y listas */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Gráfico de ventas */}
                    <SalesChart sales={dailySales} />

                    {/* Productos más vendidos */}
                    <TopProducts products={topProducts} />
                </div>

                {/* Listas de información */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Ventas recientes */}
                    <RecentSales sales={recentSales} />

                    {/* Productos con bajo stock */}
                    <LowStockProducts products={lowStockProducts} />
                </div>

                {/* Ventas por sucursal (solo para administradores) */}
                {userRole === 'administrador' && salesByBranch.length > 0 && (
                    <div className="grid gap-6">
                        <SalesByBranch branches={salesByBranch} />
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
