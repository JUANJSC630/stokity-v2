import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { adminNavGroups, tenantNavGroups } from '@/lib/nav-groups';
import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import AppLogo from './app-logo';

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
