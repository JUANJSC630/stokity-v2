import type { NavItem } from '@/types';

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
