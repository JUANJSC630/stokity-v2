import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    Banknote,
    BarChart3,
    Building,
    Building2,
    CreditCard,
    LayoutGrid,
    Package,
    Package2,
    RotateCcw,
    Tags,
    TrendingUp,
    UserRound,
    Users,
    Users2,
} from 'lucide-react';
import AppLogo from './app-logo';

// All available navigation items
const allNavItems: NavItem[] = [
    {
        title: 'Inicio',
        href: '/dashboard',
        icon: LayoutGrid,
        roles: ['administrador', 'encargado', 'vendedor'], // All roles can access
    },
    {
        title: 'Usuarios',
        href: '/users',
        icon: Users,
        roles: ['administrador'], // Only admin
    },
    {
        title: 'Sucursales',
        href: '/branches',
        icon: Building2,
        roles: ['administrador'], // Only admin
    },
    {
        title: 'Categorías',
        href: '/categories',
        icon: Tags,
        roles: ['administrador', 'encargado'], // Admin and manager
    },
    {
        title: 'Productos',
        href: '/products',
        icon: Package,
        roles: ['administrador', 'encargado'], // Admin and manager
    },
    {
        title: 'Clientes',
        href: '/clients',
        icon: UserRound,
        roles: ['administrador', 'encargado', 'vendedor'], // All roles
    },
    {
        title: 'Ventas',
        href: '/sales',
        icon: Banknote,
        roles: ['administrador', 'encargado', 'vendedor'], // All roles
    },
    {
        title: 'Movimientos de Stock',
        href: '/stock-movements',
        icon: Activity,
        roles: ['administrador', 'encargado'], // Admin and manager
    },
    {
        title: 'Métodos de Pago',
        href: '/payment-methods',
        icon: CreditCard,
        roles: ['administrador'], // Only admin
    },
    {
        title: 'Reportes',
        href: '',
        icon: BarChart3,
        roles: ['administrador', 'encargado'], // Admin and manager
        children: [
            {
                title: 'Principal',
                href: '/reports',
                icon: BarChart3,
            },
            {
                title: 'Detalle de Ventas',
                href: '/reports/sales-detail',
                icon: TrendingUp,
            },
            {
                title: 'Productos',
                href: '/reports/products',
                icon: Package2,
            },
            {
                title: 'Vendedores',
                href: '/reports/sellers',
                icon: Users2,
            },
            {
                title: 'Sucursales',
                href: '/reports/branches',
                icon: Building,
            },
            {
                title: 'Devoluciones',
                href: '/reports/returns',
                icon: RotateCcw,
            },
        ],
    },
];

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const userRole = auth.user.role;

    // Filter navigation items based on user's role
    const filteredNavItems = allNavItems.filter(
        (item) =>
            // If no roles specified, allow access to all, otherwise check if user's role is included
            !item.roles || item.roles.includes(userRole),
    );
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={filteredNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
