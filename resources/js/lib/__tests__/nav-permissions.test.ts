import { describe, expect, it } from 'vitest';
import { filterNavItemsByPermission } from '../nav-permissions';
import type { NavItem } from '@/types';

const items: NavItem[] = [
    { title: 'Inicio', href: '/dashboard', permission: 'dashboard.view' },
    { title: 'Usuarios', href: '/users', permission: 'users.view' },
    { title: 'POS', href: '/pos' }, // no permission — visible to everyone
];

describe('filterNavItemsByPermission', () => {
    it('keeps an item whose permission the user holds', () => {
        const result = filterNavItemsByPermission(items, (p) => p === 'dashboard.view');
        expect(result.map((i) => i.title)).toEqual(['Inicio', 'POS']);
    });

    it('always keeps an item with no permission requirement', () => {
        const result = filterNavItemsByPermission(items, () => false);
        expect(result.map((i) => i.title)).toEqual(['POS']);
    });

    it('keeps everything when every permission matches', () => {
        const result = filterNavItemsByPermission(items, () => true);
        expect(result).toHaveLength(3);
    });
});
