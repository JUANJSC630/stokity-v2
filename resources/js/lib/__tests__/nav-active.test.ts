import type { NavItem } from '@/types';
import { describe, expect, it } from 'vitest';
import { activeChildOf, matchesPath, pathOf } from '../nav-active';

describe('matchesPath', () => {
    it('matches the exact path and its sub-pages', () => {
        expect(matchesPath('/sales', '/sales')).toBe(true);
        expect(matchesPath('/sales/12/edit', '/sales')).toBe(true);
    });

    it('does not match a path that only shares a prefix', () => {
        expect(matchesPath('/sales-report', '/sales')).toBe(false);
    });

    it('never matches an empty href', () => {
        expect(matchesPath('/anything', '')).toBe(false);
    });
});

describe('activeChildOf', () => {
    const item: NavItem = {
        title: 'Reportes',
        href: '',
        children: [
            { title: 'Principal', href: '/reports' },
            { title: 'Productos', href: '/reports/products' },
        ],
    };

    it('prefers the most specific child', () => {
        expect(activeChildOf('/reports/products', item)?.title).toBe('Productos');
        expect(activeChildOf('/reports', item)?.title).toBe('Principal');
    });

    it('returns undefined when no child matches or there are no children', () => {
        expect(activeChildOf('/sales', item)).toBeUndefined();
        expect(activeChildOf('/reports', { title: 'Solo', href: '/x' })).toBeUndefined();
    });
});

describe('pathOf', () => {
    it('drops the query string', () => {
        expect(pathOf('/sales?page=2')).toBe('/sales');
        expect(pathOf('/sales')).toBe('/sales');
    });
});
