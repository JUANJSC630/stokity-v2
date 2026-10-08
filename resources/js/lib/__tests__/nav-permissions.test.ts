import type { NavGroup, NavItem } from '@/types';
import { describe, expect, it } from 'vitest';
import { filterNavGroups, filterNavItemsByPermission } from '../nav-permissions';

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

describe('filterNavGroups', () => {
    const groups: NavGroup[] = [
        { items: [{ title: 'POS', href: '/pos', permission: 'pos.access' }] },
        {
            label: 'Vender',
            items: [
                { title: 'Ventas', href: '/sales', permission: 'sales.view' },
                { title: 'Créditos', href: '/credits', permission: 'credits.view', module: 'credits' },
            ],
        },
        {
            label: 'Dinero',
            items: [
                {
                    title: 'Reportes',
                    href: '',
                    permission: 'reports.view',
                    children: [
                        { title: 'Principal', href: '/reports' },
                        { title: 'Sucursales', href: '/reports/branches', permission: 'reports.branches.view' },
                    ],
                },
            ],
        },
    ];

    it('drops a group when none of its items are visible', () => {
        const result = filterNavGroups(groups, (p) => p === 'pos.access');
        expect(result.map((g) => g.label)).toEqual([undefined]);
    });

    it('keeps the group labels and filters the items inside each group', () => {
        const result = filterNavGroups(groups, (p) => p === 'sales.view' || p === 'credits.view');
        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('Vender');
        expect(result[0].items.map((i) => i.title)).toEqual(['Ventas', 'Créditos']);
    });

    it('hides items whose module is disabled', () => {
        const result = filterNavGroups(
            groups,
            () => true,
            (module) => module !== 'credits',
        );
        expect(result[1].items.map((i) => i.title)).toEqual(['Ventas']);
    });

    it('filters the children of an item by their own permission', () => {
        const result = filterNavGroups(groups, (p) => p === 'reports.view');
        expect(result[0].items[0].children?.map((c) => c.title)).toEqual(['Principal']);
    });

    it('hides a parent whose children are all hidden', () => {
        const onlyRestricted: NavGroup[] = [
            {
                label: 'Dinero',
                items: [{ title: 'Reportes', href: '', children: [{ title: 'Sucursales', href: '/b', permission: 'reports.branches.view' }] }],
            },
        ];

        expect(filterNavGroups(onlyRestricted, () => false)).toEqual([]);
    });

    it('returns no groups for an empty list', () => {
        expect(filterNavGroups([], () => true)).toEqual([]);
    });
});
