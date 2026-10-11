import { usePermissions } from '@/hooks/use-permissions';
import { filterNavItemsByPermission } from '@/lib/nav-permissions';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Perfil',
        href: '/settings/profile',
        icon: null,
    },
    {
        title: 'Contraseña',
        href: '/settings/password',
        icon: null,
    },
    {
        title: 'Apariencia',
        href: '/settings/appearance',
        icon: null,
    },
    {
        title: 'Negocio',
        href: '/settings/business',
        icon: null,
        // All 3 items share this permission: routes/settings.php gates the
        // whole "Configuración del negocio" group (business/printer/ticket)
        // on settings.business.view alone — the more specific
        // settings.printer.manage/settings.ticket.update only gate the
        // write actions, not visiting the page.
        permission: 'settings.business.view',
    },
    {
        title: 'Impresora',
        href: '/settings/printer',
        icon: null,
        permission: 'settings.business.view',
    },
    {
        title: 'Ticket',
        href: '/settings/ticket',
        icon: null,
        permission: 'settings.business.view',
    },
    {
        title: 'Roles',
        href: '/settings/roles',
        icon: null,
        permission: 'settings.roles.manage',
    },
    {
        title: 'Módulos',
        href: '/settings/modules',
        icon: null,
        permission: 'settings.modules.manage',
    },
];

export default function SettingsLayout({ children, wide = false }: PropsWithChildren<{ wide?: boolean }>) {
    const { can } = usePermissions();

    // When server-side rendering, we only render the layout on the client...
    if (typeof window === 'undefined') {
        return null;
    }

    const currentPath = window.location.pathname;
    const navItems = filterNavItemsByPermission(sidebarNavItems, can);

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 lg:p-6">
            <div>
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Configuración</h2>
                <p className="text-sm text-muted-foreground">Administra tu perfil y la configuración de tu cuenta</p>
            </div>

            <div className="flex flex-col gap-5 lg:flex-row lg:gap-10">
                <nav aria-label="Secciones de configuración" className="-mx-4 lg:mx-0 lg:w-52 lg:shrink-0">
                    <ul className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
                        {navItems.map((item, index) => {
                            const active = currentPath === item.href;

                            return (
                                <li key={`${item.href}-${index}`} className="shrink-0 lg:shrink">
                                    <Link
                                        href={item.href}
                                        prefetch
                                        aria-current={active ? 'page' : undefined}
                                        className={cn(
                                            'flex h-11 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors lg:h-9 lg:rounded-lg lg:border-transparent',
                                            active
                                                ? 'border-[var(--brand-primary)]/40 bg-muted text-[var(--brand-primary)]'
                                                : 'border-border/60 bg-card text-muted-foreground hover:text-foreground lg:bg-transparent lg:hover:bg-accent',
                                        )}
                                    >
                                        {item.title}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className={cn('min-w-0 flex-1', wide ? 'lg:max-w-5xl' : 'lg:max-w-2xl')}>
                    <section className="flex flex-col gap-5">{children}</section>
                </div>
            </div>
        </div>
    );
}
