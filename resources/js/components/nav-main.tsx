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
                        {item.title === 'Reportes' && !isCollapsed && (
                            <SidebarSeparator className="my-4" />
                        )}

                        {item.children && !item.disabled ? (
                            isCollapsed ? (
                                // Modo colapsado: DropdownMenu lateral
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <SidebarMenuButton
                                            isActive={isGroupActive(item)}
                                            tooltip={{ children: item.title }}
                                            className={`mb-2 w-full rounded-lg transition-colors duration-200 hover:bg-[#f7e1ff44] dark:hover:bg-[#C850C033] ${
                                                isGroupActive(item) ? 'bg-gradient-to-r from-[#C850C0] to-[#FFCC70] shadow-md' : ''
                                            }`}
                                        >
                                            {item.icon && (
                                                <span
                                                    className={`${isGroupActive(item) ? 'text-white' : 'text-[#C850C0] dark:text-[#C850C0]'} flex-shrink-0`}
                                                >
                                                    <item.icon className="size-5" />
                                                </span>
                                            )}
                                        </SidebarMenuButton>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent side="right" align="start" className="min-w-44">
                                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                                            {item.title}
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {item.children
                                            .filter((child) => !child.roles || child.roles.includes(userRole))
                                            .map((child) => (
                                                <DropdownMenuItem key={child.title} asChild>
                                                    <Link
                                                        href={child.href}
                                                        className={`flex w-full items-center gap-2 ${
                                                            isChildActive(child) ? 'font-semibold text-[#C850C0]' : ''
                                                        }`}
                                                    >
                                                        {child.icon && <child.icon className="size-4 shrink-0 text-[#C850C0]" />}
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
                                        isActive={isItemActive(item)}
                                        className={`mb-2 w-full rounded-lg transition-colors duration-200 hover:bg-[#f7e1ff44] dark:hover:bg-[#C850C033] ${
                                            isItemActive(item) ? 'bg-gradient-to-r from-[#C850C0] to-[#FFCC70] shadow-md' : ''
                                        }`}
                                        onClick={() => toggleExpanded(item.title)}
                                    >
                                        {item.icon && (
                                            <span
                                                className={`${isItemActive(item) ? 'text-white' : 'text-[#C850C0] dark:text-[#C850C0]'} flex-shrink-0`}
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
                                                        className="ml-2 w-full rounded-lg transition-colors duration-200 hover:bg-[#f7e1ff44] dark:hover:bg-[#C850C033]"
                                                    >
                                                        <Link
                                                            href={child.href}
                                                            prefetch
                                                            className={`flex w-full items-center gap-2 ${
                                                                isChildActive(child)
                                                                    ? 'bg-gradient-to-r from-[#C850C0] to-[#FFCC70] font-semibold text-white shadow-md'
                                                                    : 'text-gray-700 dark:text-gray-300'
                                                            } rounded-lg px-3 py-2`}
                                                        >
                                                            {child.icon && (
                                                                <span
                                                                    className={`${isChildActive(child) ? 'text-white' : 'text-[#C850C0] dark:text-[#C850C0]'} flex-shrink-0`}
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
                        ) : item.disabled ? (
                            // Item deshabilitado — visible pero no clickeable
                            <SidebarMenuButton
                                tooltip={isCollapsed ? { children: `${item.title} — Requiere permisos` } : undefined}
                                className="w-full cursor-not-allowed rounded-lg opacity-40"
                            >
                                <span
                                    title="Requiere permisos de encargado o administrador"
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-gray-400 dark:text-gray-600"
                                >
                                    {item.icon && (
                                        <span className="flex-shrink-0">
                                            <item.icon className="size-5" />
                                        </span>
                                    )}
                                    {!isCollapsed && (
                                        <span className="min-w-0 flex-1 truncate">{item.title}</span>
                                    )}
                                </span>
                            </SidebarMenuButton>
                        ) : (
                            // Item sin sub-items
                            <SidebarMenuButton
                                asChild
                                isActive={isItemActive(item)}
                                tooltip={isCollapsed ? { children: item.title } : undefined}
                                className={`w-full rounded-lg transition-colors duration-200 hover:bg-[#f7e1ff44] dark:hover:bg-[#C850C033] ${item.highlight && !isItemActive(item) ? 'ring-1 ring-[#C850C0]/30' : ''}`}
                            >
                                <Link
                                    href={item.href}
                                    prefetch
                                    className={`flex w-full items-center gap-2 ${
                                        isItemActive(item)
                                            ? 'bg-gradient-to-r from-[#C850C0] to-[#FFCC70] font-semibold text-white shadow-md'
                                            : item.highlight
                                              ? 'bg-[#C850C0]/5 font-semibold text-[#C850C0] dark:bg-[#C850C0]/10 dark:text-[#FFCC70]'
                                              : 'text-gray-700 dark:text-gray-300'
                                    } rounded-lg px-3 py-2`}
                                >
                                    {item.icon && (
                                        <span
                                            className={`${isItemActive(item) ? 'text-white' : 'text-[#C850C0] dark:text-[#C850C0]'} flex-shrink-0`}
                                        >
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
