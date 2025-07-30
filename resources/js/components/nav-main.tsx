import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarSeparator, useSidebar } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    const { state } = useSidebar();
    const isCollapsed = state === 'collapsed';
    
    const [expandedItems, setExpandedItems] = useState<string[]>(() => {
        // Expandir automáticamente "Reportes" si estamos en una página de reportes
        if (page.url.startsWith('/reports')) {
            return ['Reportes'];
        }
        return [];
    });

    const toggleExpanded = (title: string) => {
        setExpandedItems(prev => 
            prev.includes(title) 
                ? prev.filter(item => item !== title)
                : [...prev, title]
        );
    };

    const isItemActive = (item: NavItem) => {
        // Para items con children, solo activar si estamos en la página principal del grupo
        if (item.children) {
            return page.url === item.href;
        }
        // Para items sin children, activar si la URL coincide exactamente o es la página principal
        return page.url === item.href || page.url.startsWith(item.href + '/');
    };

    const isChildActive = (child: NavItem) => {
        return page.url === child.href;
    };

    return (
        <SidebarGroup className="px-3 py-2">
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title} className="mb-2">
                        {/* Agregar separador antes de Reportes */}
                        {item.title === 'Reportes' && !isCollapsed && (
                            <>
                                <SidebarSeparator className="my-4" />
                            </>
                        )}
                        {item.children ? (
                            // Item con sub-items
                            <>
                                <SidebarMenuButton
                                    isActive={isItemActive(item)}
                                    tooltip={isCollapsed ? { children: item.title } : undefined}
                                    className={`rounded-lg transition-colors duration-200 hover:bg-[#f7e1ff44] dark:hover:bg-[#C850C033] w-full mb-2 ${
                                        isItemActive(item) ? 'bg-gradient-to-r from-[#C850C0] to-[#FFCC70] shadow-md' : ''
                                    }`}
                                    onClick={() => toggleExpanded(item.title)}
                                >
                                    {item.icon && (
                                        <span className={` ${isItemActive(item) ? 'text-white' : 'text-[#C850C0] dark:text-[#C850C0]'} flex-shrink-0`}>
                                            <item.icon className="size-5" />
                                        </span>
                                    )}
                                    {!isCollapsed && (
                                        <>
                                            <span className={` ${isItemActive(item) ? 'text-white' : 'text-gray-900 dark:text-gray-100'} flex-1 min-w-0 truncate`}>
                                                {item.title}
                                            </span>
                                            <ChevronDown 
                                                className={`size-4 transition-transform duration-200 flex-shrink-0 ${
                                                    expandedItems.includes(item.title) ? 'rotate-180' : ''
                                                } ${isItemActive(item) ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}
                                            />
                                        </>
                                    )}
                                </SidebarMenuButton>
                                {expandedItems.includes(item.title) && !isCollapsed && (
                                    <SidebarMenuSub>
                                        {item.children.map((child) => (
                                            <SidebarMenuSubButton
                                                key={child.title}
                                                asChild
                                                isActive={isChildActive(child)}
                                                className="ml-2 rounded-lg transition-colors duration-200 hover:bg-[#f7e1ff44] dark:hover:bg-[#C850C033] w-full"
                                            >
                                                <Link
                                                    href={child.href}
                                                    prefetch
                                                    className={`flex items-center gap-2 w-full ${
                                                        isChildActive(child)
                                                            ? 'bg-gradient-to-r from-[#C850C0] to-[#FFCC70] font-semibold text-white shadow-md'
                                                            : 'text-gray-700 dark:text-gray-300'
                                                    } rounded-lg px-3 py-2`}
                                                >
                                                    {child.icon && (
                                                        <span className={` ${isChildActive(child) ? 'text-white' : 'text-[#C850C0] dark:text-[#C850C0]'} flex-shrink-0`}>
                                                            <child.icon className="size-4" />
                                                        </span>
                                                    )}
                                                    <span className={` ${isChildActive(child) ? 'text-white' : 'text-gray-900 dark:text-gray-100'} flex-1 min-w-0 truncate`}>
                                                        {child.title}
                                                    </span>
                                                </Link>
                                            </SidebarMenuSubButton>
                                        ))}
                                    </SidebarMenuSub>
                                )}
                            </>
                        ) : (
                            // Item sin sub-items
                            <SidebarMenuButton
                                asChild
                                isActive={isItemActive(item)}
                                tooltip={isCollapsed ? { children: item.title } : undefined}
                                className="rounded-lg transition-colors duration-200 hover:bg-[#f7e1ff44] dark:hover:bg-[#C850C033] w-full"
                            >
                                <Link
                                    href={item.href}
                                    prefetch
                                    className={`flex items-center gap-2 w-full ${
                                        isItemActive(item)
                                            ? 'bg-gradient-to-r from-[#C850C0] to-[#FFCC70] font-semibold text-white shadow-md'
                                            : 'text-gray-700 dark:text-gray-300'
                                    } rounded-lg px-3 py-2`}
                                >
                                    {item.icon && (
                                        <span className={` ${isItemActive(item) ? 'text-white' : 'text-[#C850C0] dark:text-[#C850C0]'} flex-shrink-0`}>
                                            <item.icon className="size-5" />
                                        </span>
                                    )}
                                    {!isCollapsed && (
                                        <span className={` ${isItemActive(item) ? 'text-white' : 'text-gray-900 dark:text-gray-100'} flex-1 min-w-0 truncate`}>
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
