import type { NavItem } from '@/types';

/** True when `href` is the current path or one of its ancestors (/sales matches /sales/12). */
export const matchesPath = (currentPath: string, href: string): boolean =>
    Boolean(href) && (currentPath === href || currentPath.startsWith(href + '/'));

/** The child whose href is the most specific match, so /reports does not light up on /reports/products. */
export const activeChildOf = (currentPath: string, item: NavItem): NavItem | undefined =>
    (item.children ?? []).filter((child) => matchesPath(currentPath, child.href)).sort((a, b) => b.href.length - a.href.length)[0];

/** Path of the current page without its query string. */
export const pathOf = (url: string): string => url.split('?')[0];
