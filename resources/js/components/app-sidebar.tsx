import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { useModules } from '@/hooks/use-modules';
import { usePermissions } from '@/hooks/use-permissions';
import { filterNavItemsByPermission } from '@/lib/nav-permissions';
import { type NavItem, type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import {
    Activity,
    Banknote,
    BarChart3,
    BookOpen,
    Building,
    Building2,
    CreditCard,
    HandCoins,
    LayoutGrid,
    Package,
    Package2,
    Receipt,
    RotateCcw,
    ScanLine,
    ShieldCheck,
    Tags,
    TrendingUp,
    Truck,
    UserRound,
    Users,
    Users2,
    Vault,
} from 'lucide-react';
import { useEffect } from 'react';
import AppLogo from './app-logo';

// All available navigation items
const allNavItems: NavItem[] = [
    {
        title: 'Inicio',
        href: '/dashboard',
        icon: LayoutGrid,
        permission: 'dashboard.view',
    },
    {
        title: 'Usuarios',
        href: '/users',
        icon: Users,
        permission: 'users.view',
    },
    {
        title: 'Sucursales',
        href: '/branches',
        icon: Building2,
        permission: 'branches.view',
    },
    {
        title: 'Categorías',
        href: '/categories',
        icon: Tags,
        permission: 'categories.view',
    },
    {
        title: 'Catálogo',
        href: '/products',
        icon: Package,
        // products.view is also held by Vendedor (needed for POS lookups) —
        // products.create is what actually separates admin/encargado from
        // vendedor for this catalog-management page, and matches the group
        // this item's routes fall under (routes/products.php).
        permission: 'products.create',
    },
    {
        title: 'Clientes',
        href: '/clients',
        icon: UserRound,
        permission: 'clients.view',
    },
    {
        title: 'POS',
        href: '/pos',
        icon: ScanLine,
        permission: 'pos.access',
        highlight: true,
    },
    {
        title: 'Historial de Caja',
        href: '/cash-sessions',
        icon: BookOpen,
        permission: 'cash_sessions.view',
    },
    {
        title: 'Ventas',
        href: '/sales',
        icon: Banknote,
        permission: 'sales.view',
    },
    {
        title: 'Créditos',
        href: '/credits',
        icon: HandCoins,
        permission: 'credits.view',
        module: 'credits',
    },
    {
        title: 'Proveedores',
        href: '/suppliers',
        icon: Truck,
        permission: 'suppliers.view',
        module: 'suppliers',
    },
    {
        title: 'Movimientos de Stock',
        href: '/stock-movements',
        icon: Activity,
        permission: 'stock_movements.view',
    },
    {
        title: 'Métodos de Pago',
        href: '/payment-methods',
        icon: CreditCard,
        // payment_methods.view is held by every role (POS needs it) —
        // .create is what actually gates routes/payment-methods.php.
        permission: 'payment_methods.create',
    },
    {
        title: 'Finanzas',
        href: '/finances',
        icon: TrendingUp,
        permission: 'finances.view',
        module: 'finances',
    },
    {
        title: 'Gastos',
        href: '/expenses',
        icon: Receipt,
        permission: 'expenses.view',
        module: 'finances',
        children: [
            {
                title: 'Historial de gastos',
                href: '/expenses',
                icon: Receipt,
            },
            {
                title: 'Gastos fijos',
                href: '/expense-templates',
                icon: RotateCcw,
            },
            {
                title: 'Categorías',
                href: '/expense-categories',
                icon: Tags,
            },
        ],
    },
    {
        title: 'Reportes',
        href: '',
        icon: BarChart3,
        permission: 'reports.view',
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
                permission: 'reports.branches.view',
            },
            {
                title: 'Balance de Caja',
                href: '/reports/cash-balance',
                icon: Vault,
            },
            {
                title: 'Devoluciones',
                href: '/reports/returns',
                icon: RotateCcw,
            },
        ],
    },
];

// Navigation for the platform owner (super_admin) — manages tenants, not a store.
const adminNavItems: NavItem[] = [
    {
        title: 'Negocios',
        href: '/admin/tenants',
        icon: Building2,
    },
    {
        title: 'Super Admins',
        href: '/admin/super-admins',
        icon: ShieldCheck,
    },
    {
        title: 'Mi cuenta',
        href: '/admin/account',
        icon: UserRound,
    },
];

const SIDEBAR_SCROLL_KEY = 'stokity_sidebar_scroll';

function getSidebarContentEl(): HTMLElement | null {
    return document.querySelector('[data-sidebar="content"]');
}

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const userRole = auth.user.role;
    const { can } = usePermissions();
    const { moduleEnabled } = useModules();

    // Restore sidebar scroll position on every mount (i.e. after each navigation)
    useEffect(() => {
        const el = getSidebarContentEl();
        const saved = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
        if (el && saved) {
            el.scrollTop = Number(saved);
        }

        // Save scroll position right before Inertia navigates away
        const removeHandler = router.on('before', () => {
            const el = getSidebarContentEl();
            if (el) sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(el.scrollTop));
        });

        return removeHandler;
    }, []);

    // Super admins get the platform nav; tenant users get the store nav by role.
    const isSuperAdmin = userRole === 'super_admin';
    const filteredNavItems = isSuperAdmin ? adminNavItems : filterNavItemsByPermission(allNavItems, can, moduleEnabled);
    const homeHref = isSuperAdmin ? '/admin/tenants' : '/dashboard';
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={homeHref} prefetch>
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
