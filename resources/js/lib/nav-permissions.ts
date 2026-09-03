import type { NavItem } from '@/types';

/** An item with no `permission` is visible to everyone authenticated. */
export function filterNavItemsByPermission(items: NavItem[], can: (permission: string) => boolean): NavItem[] {
    return items.filter((item) => !item.permission || can(item.permission));
}
