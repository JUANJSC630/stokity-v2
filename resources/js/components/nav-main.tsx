import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title} className="mb-1">
                        <SidebarMenuButton
                            asChild
                            isActive={page.url.startsWith(item.href)}
                            tooltip={{ children: item.title }}
                            className="rounded-lg transition-colors duration-200 hover:bg-[#f7e1ff44] dark:hover:bg-[#C850C033]"
                        >
                            <Link
                                href={item.href}
                                prefetch
                                className={` ${
                                    page.url.startsWith(item.href)
                                        ? 'bg-gradient-to-r from-[#C850C0] to-[#FFCC70] font-semibold text-white shadow-md'
                                        : 'text-gray-700 dark:text-gray-200'
                                } rounded-lg`}
                            >
                                {item.icon && (
                                    <span className={` ${page.url.startsWith(item.href) ? 'text-white' : 'text-[#C850C0]'} `}>
                                        <item.icon className="size-5" />
                                    </span>
                                )}
                                <span className={` ${page.url.startsWith(item.href) ? 'text-white' : 'text-gray-900 dark:text-gray-100'} `}>
                                    {item.title}
                                </span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
