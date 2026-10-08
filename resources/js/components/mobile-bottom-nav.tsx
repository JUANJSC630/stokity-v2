import { IconNav, type IconNavItem } from '@/components/ui/bencho/icon-nav';
import { useSidebar } from '@/components/ui/sidebar';
import { useModules } from '@/hooks/use-modules';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { usePermissions } from '@/hooks/use-permissions';
import { pickBottomNavItems } from '@/lib/bottom-nav';
import { matchesPath, pathOf } from '@/lib/nav-active';
import { adminNavGroups, tenantNavGroups } from '@/lib/nav-groups';
import { filterNavGroups } from '@/lib/nav-permissions';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { Circle, Menu } from 'lucide-react';

const MEMORY_KEY = 'stokity_bottom_nav_last';

/**
 * Phone bottom bar: the main action (POS) in the middle, the destinations
 * people reach for most around it, and "Más" for the full menu. It is built
 * from the same groups, permissions and modules as the sidebar, so a role
 * only ever sees what it can open. The POS screen has its own checkout bar,
 * so the global one steps aside there.
 */
export function MobileBottomNav() {
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const { isMobile, setOpenMobile } = useSidebar();
    const { can } = usePermissions();
    const { moduleEnabled } = useModules();
    const onBrand = useOnBrandColor();
    const currentPath = pathOf(page.url);

    if (!isMobile || currentPath === '/pos' || currentPath.startsWith('/pos/')) return null;

    const isSuperAdmin = auth?.user?.role === 'super_admin';
    const groups = filterNavGroups(isSuperAdmin ? adminNavGroups : tenantNavGroups, can, moduleEnabled);
    const { items, hasMore } = pickBottomNavItems(groups);
    if (items.length === 0 && !hasMore) return null;

    const navItems: IconNavItem[] = items.map((item) => ({
        key: item.href,
        label: item.shortTitle ?? item.title,
        icon: item.icon ?? Circle,
        href: item.href,
        primary: item.highlight,
    }));
    if (hasMore) {
        navItems.push({ key: 'more', label: 'Más', icon: Menu, onSelect: () => setOpenMobile(true) });
    }

    if (navItems.length < 2) return null;

    const activeKey = items.filter((item) => matchesPath(currentPath, item.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;

    return (
        <>
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
                <IconNav
                    items={navItems}
                    activeKey={activeKey}
                    label="Navegación principal"
                    memoryKey={MEMORY_KEY}
                    primaryColors={{ background: 'var(--brand-primary)', foreground: onBrand.hex }}
                />
            </div>
            <div aria-hidden="true" className="h-[calc(4.5rem+env(safe-area-inset-bottom))] shrink-0 md:hidden" />
        </>
    );
}
