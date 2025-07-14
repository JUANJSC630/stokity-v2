import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Banknote, BarChart3, Building2, LayoutGrid, Package, Tags, UserRound, Users } from 'lucide-react';
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
        title: 'Reportes de Ventas',
        href: '/report-sales',
        icon: BarChart3,
        roles: ['administrador', 'encargado'], // Admin and manager
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
