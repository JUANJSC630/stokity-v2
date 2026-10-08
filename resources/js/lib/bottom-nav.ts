import type { NavGroup, NavItem } from '@/types';

/** Destinations people reach for most on a phone, most important first. */
const PRIORITY = ['/dashboard', '/sales', '/products', '/clients', '/cash-sessions', '/finances', '/users', '/branches'];

const MAX_SLOTS = 5;
const PRIMARY_SLOT = 2;

const insertAt = <T>(list: T[], index: number, value: T): T[] => [...list.slice(0, index), value, ...list.slice(index)];

const rank = (item: NavItem) => {
    const index = PRIORITY.indexOf(item.href);

    return index === -1 ? PRIORITY.length : index;
};

/**
 * Chooses what the phone bottom bar shows from the already filtered menu:
 * the primary action (POS) in the middle, the most useful destinations around
 * it, and a "More" slot that opens the full menu whenever something is left out.
 */
export function pickBottomNavItems(groups: NavGroup[]): { items: NavItem[]; hasMore: boolean } {
    const topLevel = groups.flatMap((group) => group.items);
    const leaves = topLevel.filter((item) => !item.children);
    const hasBranches = topLevel.some((item) => item.children);
    const hasMore = hasBranches || leaves.length > MAX_SLOTS;
    const slots = hasMore ? MAX_SLOTS - 1 : MAX_SLOTS;

    const primary = leaves.find((item) => item.highlight);
    const others = leaves.filter((item) => item !== primary).sort((a, b) => rank(a) - rank(b));
    const chosen = others.slice(0, primary ? slots - 1 : slots);

    return {
        items: primary ? insertAt(chosen, Math.min(PRIMARY_SLOT, chosen.length), primary) : chosen,
        hasMore,
    };
}
