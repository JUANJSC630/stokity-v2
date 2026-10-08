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
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarSeparator,
    useSidebar,
} from '@/components/ui/sidebar';
import { useModules } from '@/hooks/use-modules';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { usePermissions } from '@/hooks/use-permissions';
import { filterNavGroups } from '@/lib/nav-permissions';
import { cn } from '@/lib/utils';
import { type NavGroup, type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const ITEM_CLASS = cn(
    'relative h-11 gap-3 rounded-lg px-3 text-[0.9375rem] font-medium text-sidebar-foreground/80 md:h-9 md:text-sm',
    '[&>svg]:size-5 [&>svg]:text-muted-foreground md:[&>svg]:size-[18px]',
    'hover:bg-[rgba(var(--brand-primary-rgb),0.08)] hover:text-sidebar-foreground',
    'data-[active=true]:bg-[rgba(var(--brand-primary-rgb),0.12)] data-[active=true]:font-semibold data-[active=true]:text-sidebar-foreground data-[active=true]:[&>svg]:text-sidebar-foreground',
    'before:absolute before:top-2 before:bottom-2 before:left-0 before:w-[3px] before:rounded-full before:bg-[var(--brand-primary)] before:opacity-0 before:transition-opacity data-[active=true]:before:opacity-100',
    'group-data-[collapsible=icon]:before:hidden',
);

const SUB_ITEM_CLASS = cn(
    'h-10 text-sidebar-foreground/80 hover:bg-[rgba(var(--brand-primary-rgb),0.08)] hover:text-sidebar-foreground md:h-8',
    'data-[active=true]:bg-[rgba(var(--brand-primary-rgb),0.12)] data-[active=true]:font-semibold data-[active=true]:text-sidebar-foreground',
);

const matchesPath = (currentPath: string, href: string) => Boolean(href) && (currentPath === href || currentPath.startsWith(href + '/'));

/** The child whose href is the most specific match, so /reports does not light up on /reports/products. */
const activeChildOf = (currentPath: string, item: NavItem): NavItem | undefined =>
    (item.children ?? []).filter((child) => matchesPath(currentPath, child.href)).sort((a, b) => b.href.length - a.href.length)[0];

const isBranchActive = (currentPath: string, item: NavItem) => activeChildOf(currentPath, item) !== undefined;

function PrimaryAction({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
    const onBrand = useOnBrandColor();

    return (
        <SidebarMenuItem className="mb-1">
            <SidebarMenuButton
                asChild
                isActive={active}
                tooltip={collapsed ? item.title : undefined}
                className="h-12 gap-3 rounded-xl p-1.5 pr-3 font-semibold shadow-sm transition-[box-shadow,filter] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! hover:brightness-110 data-[active=true]:ring-2 data-[active=true]:ring-[rgba(var(--brand-primary-rgb),0.35)] data-[active=true]:ring-offset-2 data-[active=true]:ring-offset-sidebar"
                style={{ background: 'var(--brand-primary)', color: onBrand.hex }}
            >
                <Link href={item.href} prefetch aria-current={active ? 'page' : undefined}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: `rgba(${onBrand.rgb}, 0.18)` }}>
                        {item.icon && <item.icon className="size-5" />}
                    </span>
                    <span className="flex-1 truncate group-data-[collapsible=icon]:hidden">Abrir {item.title}</span>
                    <ArrowRight className="size-4 shrink-0 opacity-70 group-data-[collapsible=icon]:hidden" />
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

function NavLeaf({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
    return (
        <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={active} tooltip={collapsed ? item.title : undefined} className={ITEM_CLASS}>
                <Link href={item.href} prefetch aria-current={active ? 'page' : undefined}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

function NavBranch({
    item,
    currentPath,
    collapsed,
    open,
    onToggle,
}: {
    item: NavItem;
    currentPath: string;
    collapsed: boolean;
    open: boolean;
    onToggle: () => void;
}) {
    const children = item.children ?? [];
    const activeChild = activeChildOf(currentPath, item);
    const groupActive = activeChild !== undefined;

    if (collapsed) {
        return (
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton isActive={groupActive} tooltip={item.title} className={ITEM_CLASS}>
                            {item.icon && <item.icon />}
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="min-w-44">
                        <DropdownMenuLabel className="text-xs text-muted-foreground">{item.title}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {children.map((child) => (
                            <DropdownMenuItem key={child.title} asChild>
                                <Link href={child.href} className={cn('flex w-full items-center gap-2', child === activeChild && 'font-semibold')}>
                                    {child.icon && <child.icon className="size-4 shrink-0 text-muted-foreground" />}
                                    <span>{child.title}</span>
                                </Link>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        );
    }

    return (
        <SidebarMenuItem>
            <SidebarMenuButton isActive={groupActive} className={ITEM_CLASS} onClick={onToggle} aria-expanded={open}>
                {item.icon && <item.icon />}
                <span className="flex-1 truncate">{item.title}</span>
                <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
            </SidebarMenuButton>
            <div
                className={cn(
                    'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
                    open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
            >
                <div className="overflow-hidden" inert={!open}>
                    <SidebarMenuSub className="mt-1 mb-1">
                        {children.map((child) => {
                            const active = child === activeChild;

                            return (
                                <SidebarMenuItem key={child.title}>
                                    <SidebarMenuSubButton asChild isActive={active} className={SUB_ITEM_CLASS}>
                                        <Link href={child.href} prefetch aria-current={active ? 'page' : undefined}>
                                            {child.icon && <child.icon className="text-muted-foreground" />}
                                            <span>{child.title}</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenuSub>
                </div>
            </div>
        </SidebarMenuItem>
    );
}

export function NavMain({ groups = [] }: { groups: NavGroup[] }) {
    const page = usePage<SharedData>();
    const { state, isMobile } = useSidebar();
    // On mobile the sidebar renders as a Sheet (drawer): always show the expanded view inside it
    const collapsed = !isMobile && state === 'collapsed';
    const { can } = usePermissions();
    const { moduleEnabled } = useModules();
    const currentPath = page.url.split('?')[0];
    const visibleGroups = filterNavGroups(groups, can, moduleEnabled);

    const [expanded, setExpanded] = useState<string[]>(() =>
        visibleGroups
            .flatMap((group) => group.items)
            .filter((item) => isBranchActive(currentPath, item))
            .map((item) => item.title),
    );

    const toggle = (title: string) => setExpanded((current) => (current.includes(title) ? current.filter((t) => t !== title) : [...current, title]));

    return (
        <>
            {visibleGroups.map((group, index) => (
                <SidebarGroup key={group.label ?? `group-${index}`} className="px-3 py-1.5">
                    {index > 0 && <SidebarSeparator className="mx-auto mb-2 hidden w-6 group-data-[collapsible=icon]:block" />}
                    {group.label && (
                        <SidebarGroupLabel className="mb-0.5 h-7 px-3 text-[11px] font-semibold tracking-wider text-sidebar-foreground/50 uppercase">
                            {group.label}
                        </SidebarGroupLabel>
                    )}
                    <SidebarMenu className="gap-0.5">
                        {group.items.map((item) => {
                            if (item.highlight && !item.children) {
                                return (
                                    <PrimaryAction key={item.title} item={item} active={matchesPath(currentPath, item.href)} collapsed={collapsed} />
                                );
                            }

                            if (item.children && !item.disabled) {
                                return (
                                    <NavBranch
                                        key={item.title}
                                        item={item}
                                        currentPath={currentPath}
                                        collapsed={collapsed}
                                        open={expanded.includes(item.title)}
                                        onToggle={() => toggle(item.title)}
                                    />
                                );
                            }

                            return <NavLeaf key={item.title} item={item} active={matchesPath(currentPath, item.href)} collapsed={collapsed} />;
                        })}
                    </SidebarMenu>
                </SidebarGroup>
            ))}
        </>
    );
}
