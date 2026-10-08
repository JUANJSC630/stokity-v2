import type { NavGroup, NavItem } from '@/types';

/**
 * An item with no `permission` is visible to everyone authenticated; an
 * item with no `module` is always available (only genuinely optional
 * business features carry one — see BusinessSetting::MODULE_DEFAULTS).
 * `moduleEnabled` defaults to always-true so callers that never deal with
 * toggle-able items (e.g. the Settings sub-nav) don't need to pass one.
 */
export function filterNavItemsByPermission(
    items: NavItem[],
    can: (permission: string) => boolean,
    moduleEnabled: (module: string) => boolean = () => true,
): NavItem[] {
    return items.filter((item) => (!item.permission || can(item.permission)) && (!item.module || moduleEnabled(item.module)));
}

/**
 * Filters every group's items (and each item's children) the same way, then
 * drops items left without visible children and groups left without items,
 * so no empty heading or empty accordion is ever rendered.
 */
export function filterNavGroups(
    groups: NavGroup[],
    can: (permission: string) => boolean,
    moduleEnabled: (module: string) => boolean = () => true,
): NavGroup[] {
    return groups
        .map((group) => ({
            ...group,
            items: filterNavItemsByPermission(group.items, can, moduleEnabled)
                .map((item) => (item.children ? { ...item, children: filterNavItemsByPermission(item.children, can, moduleEnabled) } : item))
                .filter((item) => !item.children || item.children.length > 0),
        }))
        .filter((group) => group.items.length > 0);
}
