import type { NavGroup, NavItem } from '@/types';
import { describe, expect, it } from 'vitest';
import { pickBottomNavItems } from '../bottom-nav';

const leaf = (title: string, href: string, extra: Partial<NavItem> = {}): NavItem => ({ title, href, ...extra });
const titles = (items: NavItem[]) => items.map((item) => item.title);

describe('pickBottomNavItems', () => {
    it('puts the primary action in the middle and reserves a slot for More', () => {
        const groups: NavGroup[] = [
            { items: [leaf('POS', '/pos', { highlight: true }), leaf('Inicio', '/dashboard')] },
            { label: 'Vender', items: [leaf('Ventas', '/sales'), leaf('Clientes', '/clients'), leaf('Créditos', '/credits')] },
            { label: 'Inventario', items: [leaf('Catálogo', '/products')] },
        ];

        const { items, hasMore } = pickBottomNavItems(groups);

        expect(titles(items)).toEqual(['Inicio', 'Ventas', 'POS', 'Catálogo']);
        expect(hasMore).toBe(true);
    });

    it('ranks destinations by priority, not by their order in the menu', () => {
        const groups: NavGroup[] = [
            {
                items: [
                    leaf('Usuarios', '/users'),
                    leaf('Sucursales', '/branches'),
                    leaf('Clientes', '/clients'),
                    leaf('Ventas', '/sales'),
                    leaf('Inicio', '/dashboard'),
                    leaf('Extra', '/extra'),
                ],
            },
        ];

        expect(titles(pickBottomNavItems(groups).items)).toEqual(['Inicio', 'Ventas', 'Clientes', 'Usuarios']);
    });

    it('works without a primary action', () => {
        const groups: NavGroup[] = [
            {
                items: [
                    leaf('Inicio', '/dashboard'),
                    leaf('Ventas', '/sales'),
                    leaf('Clientes', '/clients'),
                    leaf('Catálogo', '/products'),
                    leaf('Usuarios', '/users'),
                    leaf('X', '/x'),
                ],
            },
        ];

        const { items, hasMore } = pickBottomNavItems(groups);

        expect(items).toHaveLength(4);
        expect(hasMore).toBe(true);
    });

    it('shows everything and no More when there are five or fewer plain destinations', () => {
        const groups: NavGroup[] = [
            { items: [leaf('Negocios', '/admin/tenants'), leaf('Auditoría', '/admin/impersonations'), leaf('Super Admins', '/admin/super-admins')] },
        ];

        const { items, hasMore } = pickBottomNavItems(groups);

        expect(titles(items)).toEqual(['Negocios', 'Auditoría', 'Super Admins']);
        expect(hasMore).toBe(false);
    });

    it('keeps a reachable More when an accordion exists, since it cannot be a direct destination', () => {
        const groups: NavGroup[] = [
            { items: [leaf('Inicio', '/dashboard'), { title: 'Reportes', href: '', children: [leaf('Principal', '/reports')] }] },
        ];

        const { items, hasMore } = pickBottomNavItems(groups);

        expect(titles(items)).toEqual(['Inicio']);
        expect(hasMore).toBe(true);
    });

    it('returns an empty bar when nothing is visible', () => {
        expect(pickBottomNavItems([])).toEqual({ items: [], hasMore: false });
    });

    it('places the primary action at the end when there is only one other destination', () => {
        const groups: NavGroup[] = [{ items: [leaf('POS', '/pos', { highlight: true }), leaf('Ventas', '/sales')] }];

        expect(titles(pickBottomNavItems(groups).items)).toEqual(['Ventas', 'POS']);
    });
});
