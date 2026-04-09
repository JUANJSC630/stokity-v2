import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarSeparator,
    useSidebar,
} from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage<SharedData>();
    const { state } = useSidebar();
    const isCollapsed = state === 'collapsed';
    const userRole = page.props.auth.user.role;

    const [expandedItems, setExpandedItems] = useState<string[]>(() => {
        // Auto-expand groups whose children include the current page
        const currentUrl = page.url.split('?')[0];
        return items
            .filter((item) => item.children?.some((child) => currentUrl === child.href || currentUrl.startsWith(child.href + '/')))
            .map((item) => item.title);
    });

    const toggleExpanded = (title: string) => {
        setExpandedItems((prev) => (prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title]));
    };

    const currentPath = page.url.split('?')[0];

    const isItemActive = (item: NavItem) => {
        if (item.children) {
            return currentPath === item.href;
        }
        return currentPath === item.href || currentPath.startsWith(item.href + '/');
    };

    const isChildActive = (child: NavItem) => {
        return currentPath === child.href;
    };

    const isGroupActive = (item: NavItem) => {
        if (!item.children) return false;
        return item.children.some((child) => currentPath === child.href || currentPath.startsWith(child.href + '/'));
    };

    return (
        <SidebarGroup className="px-3 py-2">
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title} className="mb-2">
                        {/* Separador antes de Reportes (solo en modo expandido) */}
                        {item.title === 'Reportes' && !isCollapsed && <SidebarSeparator className="my-4" />}

                        {item.children && !item.disabled ? (
                            isCollapsed ? (
                                // Modo colapsado: DropdownMenu lateral
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <SidebarMenuButton
                                            tooltip={{ children: item.title }}
                                            className={`mb-2 w-full rounded-lg transition-colors duration-200 hover:bg-[var(--brand-primary-hover)] dark:hover:bg-[var(--brand-primary-hover)] ${
                                                isGroupActive(item) ? 'bg-[var(--brand-primary)] shadow-md' : ''
                                            }`}
                                        >
                                            {item.icon && (
                                                <span
                                                    className={`${isGroupActive(item) ? 'text-white' : 'text-[var(--brand-primary)] dark:text-[var(--brand-primary)]'} flex-shrink-0`}
                                                >
                                                    <item.icon className="size-5" />
                                                </span>
                                            )}
                                        </SidebarMenuButton>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent side="right" align="start" className="min-w-44">
                                        <DropdownMenuLabel className="text-xs text-muted-foreground">{item.title}</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {item.children
                                            .filter((child) => !child.roles || child.roles.includes(userRole))
                                            .map((child) => (
                                                <DropdownMenuItem key={child.title} asChild>
                                                    <Link
                                                        href={child.href}
                                                        className={`flex w-full items-center gap-2 ${
                                                            isChildActive(child) ? 'font-semibold text-[var(--brand-primary)]' : ''
                                                        }`}
                                                    >
                                                        {child.icon && <child.icon className="size-4 shrink-0 text-[var(--brand-primary)]" />}
                                                        <span>{child.title}</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                            ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                // Modo expandido: acordeón normal
                                <>
                                    <SidebarMenuButton
                                        className={`mb-2 w-full rounded-lg transition-colors duration-200 hover:bg-[var(--brand-primary-hover)] dark:hover:bg-[var(--brand-primary-hover)] ${
                                            isItemActive(item) ? 'bg-[var(--brand-primary)] shadow-md' : ''
                                        }`}
                                        onClick={() => toggleExpanded(item.title)}
                                    >
                                        {item.icon && (
                                            <span
                                                className={`${isItemActive(item) ? 'text-white' : 'text-[var(--brand-primary)] dark:text-[var(--brand-primary)]'} flex-shrink-0`}
                                            >
                                                <item.icon className="size-5" />
                                            </span>
                                        )}
                                        <span
                                            className={`${isItemActive(item) ? 'text-white' : 'text-gray-900 dark:text-gray-100'} min-w-0 flex-1 truncate`}
                                        >
                                            {item.title}
                                        </span>
                                        <ChevronDown
                                            className={`size-4 flex-shrink-0 transition-transform duration-200 ${
                                                expandedItems.includes(item.title) ? 'rotate-180' : ''
                                            } ${isItemActive(item) ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}
                                        />
                                    </SidebarMenuButton>
                                    {expandedItems.includes(item.title) && (
                                        <SidebarMenuSub>
                                            {item.children
                                                .filter((child) => !child.roles || child.roles.includes(userRole))
                                                .map((child) => (
                                                    <SidebarMenuSubButton
                                                        key={child.title}
                                                        asChild
                                                        isActive={isChildActive(child)}
                                                        className="ml-2 w-full rounded-lg transition-colors duration-200 hover:bg-[var(--brand-primary-hover)] dark:hover:bg-[var(--brand-primary-hover)]"
                                                    >
                                                        <Link
                                                            href={child.href}
                                                            prefetch
                                                            className={`flex w-full items-center gap-2 ${
                                                                isChildActive(child)
                                                                    ? 'bg-[var(--brand-primary)] font-semibold text-white shadow-md'
                                                                    : 'text-gray-700 dark:text-gray-300'
                                                            } rounded-lg px-3 py-2`}
                                                        >
                                                            {child.icon && (
                                                                <span
                                                                    className={`${isChildActive(child) ? 'text-white' : 'text-[var(--brand-primary)] dark:text-[var(--brand-primary)]'} flex-shrink-0`}
                                                                >
                                                                    <child.icon className="size-4" />
                                                                </span>
                                                            )}
                                                            <span
                                                                className={`${isChildActive(child) ? 'text-white' : 'text-gray-900 dark:text-gray-100'} min-w-0 flex-1 truncate`}
                                                            >
                                                                {child.title}
                                                            </span>
                                                        </Link>
                                                    </SidebarMenuSubButton>
                                                ))}
                                        </SidebarMenuSub>
                                    )}
                                </>
                            )
                        ) : (
                            // Item sin sub-items
                            <SidebarMenuButton
                                asChild
                                tooltip={isCollapsed ? { children: item.title } : undefined}
                                className={`w-full rounded-lg transition-colors duration-200 hover:bg-[var(--brand-primary-hover)] dark:hover:bg-[var(--brand-primary-hover)] ${item.highlight && !isItemActive(item) ? 'ring-1 ring-[var(--brand-primary-ring)]' : ''}`}
                            >
                                <Link
                                    href={item.href}
                                    prefetch
                                    className={`flex w-full items-center gap-2 ${
                                        isItemActive(item)
                                            ? 'bg-[var(--brand-primary)] font-semibold text-white shadow-md'
                                            : item.highlight
                                              ? 'bg-[var(--brand-primary-soft)] font-semibold text-[var(--brand-primary)] dark:bg-[var(--brand-primary-soft)] dark:text-[var(--brand-primary)]'
                                              : 'text-gray-700 dark:text-gray-300'
                                    } rounded-lg px-3 py-2`}
                                >
                                    {item.icon && (
                                        <span className={`${isItemActive(item) ? 'text-white' : 'text-[var(--brand-primary)] dark:text-[var(--brand-primary)]'} flex-shrink-0`}>
                                            <item.icon className="size-5" />
                                        </span>
                                    )}
                                    {!isCollapsed && (
                                        <span
                                            className={`${isItemActive(item) ? 'text-white' : 'text-gray-900 dark:text-gray-100'} min-w-0 flex-1 truncate`}
                                        >
                                            {item.title}
                                        </span>
                                    )}
                                </Link>
                            </SidebarMenuButton>
                        )}
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
