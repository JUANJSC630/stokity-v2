import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavGroup, type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import {
    Activity,
    Banknote,
    BarChart3,
    BookOpen,
    Building,
    Building2,
    CreditCard,
    Gem,
    HandCoins,
    History,
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

// Tenant navigation, grouped by task. Permissions and modules still gate every
// item; a group (or an accordion) with nothing visible is not rendered.
const tenantNavGroups: NavGroup[] = [
    {
        items: [
            {
                title: 'POS',
                href: '/pos',
                icon: ScanLine,
                permission: 'pos.access',
                highlight: true,
            },
            {
                title: 'Inicio',
                href: '/dashboard',
                icon: LayoutGrid,
                permission: 'dashboard.view',
            },
        ],
    },
    {
        label: 'Vender',
        items: [
            {
                title: 'Ventas',
                href: '/sales',
                icon: Banknote,
                permission: 'sales.view',
            },
            {
                title: 'Clientes',
                href: '/clients',
                icon: UserRound,
                permission: 'clients.view',
            },
            {
                title: 'Créditos',
                href: '/credits',
                icon: HandCoins,
                permission: 'credits.view',
                module: 'credits',
            },
            {
                title: 'Mayorista',
                href: '/wholesale',
                icon: Gem,
                permission: 'wholesale.view',
                module: 'wholesale',
            },
        ],
    },
    {
        label: 'Inventario',
        items: [
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
                title: 'Categorías',
                href: '/categories',
                icon: Tags,
                permission: 'categories.view',
            },
            {
                title: 'Movimientos de Stock',
                href: '/stock-movements',
                icon: Activity,
                permission: 'stock_movements.view',
            },
            {
                title: 'Proveedores',
                href: '/suppliers',
                icon: Truck,
                permission: 'suppliers.view',
                module: 'suppliers',
            },
        ],
    },
    {
        label: 'Dinero',
        items: [
            {
                title: 'Historial de Caja',
                href: '/cash-sessions',
                icon: BookOpen,
                permission: 'cash_sessions.view',
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
                title: 'Métodos de Pago',
                href: '/payment-methods',
                icon: CreditCard,
                // payment_methods.view is held by every role (POS needs it) —
                // .create is what actually gates routes/payment-methods.php.
                permission: 'payment_methods.create',
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
        ],
    },
    {
        label: 'Negocio',
        items: [
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
        ],
    },
];

// Navigation for the platform owner (super_admin) — manages tenants, not a store.
const adminNavGroups: NavGroup[] = [
    {
        label: 'Plataforma',
        items: [
            {
                title: 'Negocios',
                href: '/admin/tenants',
                icon: Building2,
            },
            {
                title: 'Auditoría',
                href: '/admin/impersonations',
                icon: History,
            },
            {
                title: 'Super Admins',
                href: '/admin/super-admins',
                icon: ShieldCheck,
            },
        ],
    },
    {
        label: 'Cuenta',
        items: [
            {
                title: 'Mi cuenta',
                href: '/admin/account',
                icon: UserRound,
            },
        ],
    },
];

const SIDEBAR_SCROLL_KEY = 'stokity_sidebar_scroll';

function getSidebarContentEl(): HTMLElement | null {
    return document.querySelector('[data-sidebar="content"]');
}

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const userRole = auth.user.role;

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
    const navGroups = isSuperAdmin ? adminNavGroups : tenantNavGroups;
    const homeHref = isSuperAdmin ? '/admin/tenants' : '/dashboard';
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={homeHref} prefetch>
                                <AppLogo showRole />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="[scrollbar-color:var(--sidebar-border)_transparent] [scrollbar-width:thin]">
                <NavMain groups={navGroups} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
