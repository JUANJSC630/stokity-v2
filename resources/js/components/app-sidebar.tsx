import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { Banknote, BarChart3, Building2, LayoutGrid, Package, Tags, UserRound, Users } from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Inicio',
        href: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'Usuarios',
        href: '/users',
        icon: Users,
    },
    {
        title: 'Sucursales',
        href: '/branches',
        icon: Building2,
    },
    {
        title: 'Categorías',
        href: '/categories',
        icon: Tags,
    },
    {
        title: 'Productos',
        href: '/products',
        icon: Package,
    },
    {
        title: 'Clientes',
        href: '/clients',
        icon: UserRound,
    },
    {
        title: 'Administrar Ventas',
        href: '/sales',
        icon: Banknote,
    },
    {
        title: 'Reportes de Ventas',
        href: '/report-sales',
        icon: BarChart3,
    },
];

export function AppSidebar() {
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
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
