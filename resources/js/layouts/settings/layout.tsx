import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
        <div className="px-4 py-6">
            <Heading title="Configuración" description="Administra tu perfil y la configuración de tu cuenta" />

            <div className="flex flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav className="flex flex-col space-y-1 space-x-0">
                        {navItems.map((item, index) => (
                            <Button
                                key={`${item.href}-${index}`}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('w-full justify-start', {
                                    'bg-muted': currentPath === item.href,
                                })}
                            >
                                <Link href={item.href} prefetch>
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 md:hidden" />

                <div className={cn('flex-1', wide ? 'md:max-w-5xl' : 'md:max-w-2xl')}>
                    <section className={cn('space-y-12', wide ? 'max-w-5xl' : 'max-w-xl')}>{children}</section>
                </div>
            </div>
        </div>
    );
}
