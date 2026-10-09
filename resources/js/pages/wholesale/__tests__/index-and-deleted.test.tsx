/** Characterization tests for the wholesale list and the deleted-orders list: pin today's behavior before the redesign. */
import { router } from '@inertiajs/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import WholesaleDeleted from '../deleted';
import WholesaleIndex from '../index';

const permissions = vi.hoisted(() => {
    // deleted.tsx builds its breadcrumbs with route() while the module loads, so route must exist before the import.
    (globalThis as { route?: unknown }).route = (name: string, id?: number) => `/${name}${id ? `/${id}` : ''}`;
    return { granted: [] as string[] };
});

vi.mock('@inertiajs/react', () => ({
    router: { get: vi.fn(), visit: vi.fn() },
    Head: () => null,
    Link: 'a',
    usePage: vi.fn(() => ({ props: {} })),
}));
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/hooks/use-permissions', () => ({ usePermissions: () => ({ can: (permission: string) => permissions.granted.includes(permission) }) }));
vi.mock('@/components/ui/select', () => ({
    Select: ({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children: ReactNode }) => (
        <select aria-label="Estado" value={value} onChange={(e) => onValueChange?.(e.target.value)}>
            {children}
        </select>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));

const order = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    code: `M-${200 + id}`,
    total: 150000 * id,
    status: 'completed',
    payment_method: 'transferencia',
    date: '2026-10-05T10:00:00Z',
    client: { name: `Cliente ${id}` },
    seller: { name: 'Carlos' },
    items: [],
    ...overrides,
});

const text = (node: HTMLElement) => (node.textContent ?? '').replace(/\s/g, ' ');

function renderIndex(data: ReturnType<typeof order>[], filters = {}) {
    return render(
        <WholesaleIndex
            wholesaleSales={
                { data: data as never, links: [], current_page: 1, from: 1, to: data.length, total: data.length, last_page: 1, per_page: 15 } as never
            }
            filters={filters}
        />,
    );
}

function renderDeleted(data: Record<string, unknown>[], filters = {}) {
    return render(
        <WholesaleDeleted
            wholesaleSales={
                { data: data as never, links: [], current_page: 1, from: 1, to: data.length, total: data.length, last_page: 1, per_page: 15 } as never
            }
            filters={filters}
        />,
    );
}

beforeAll(() => {
    vi.stubGlobal('route', (name: string, id?: number) => `/${name}${id ? `/${id}` : ''}`);
});

beforeEach(() => {
    vi.clearAllMocks();
    permissions.granted = [];
});

describe('Wholesale index', () => {
    it('lists each order with code, status, client, seller, date, payment method and total', () => {
        renderIndex([order(1)]);

        const row = screen.getByRole('link', { name: /M-201/ });
        expect(row).toHaveAttribute('href', '/wholesale/1');
        expect(text(row)).toContain('Completado');
        expect(text(row)).toContain('Cliente 1');
        expect(text(row)).toContain('Vendedor: Carlos');
        expect(text(row)).toContain('5 oct 2026');
        expect(text(row)).toContain('transferencia');
        expect(text(row)).toContain('$ 150.000');
    });

    it('marks cancelled orders and shows a missing client', () => {
        renderIndex([order(2, { status: 'cancelled', client: null })]);

        const row = screen.getByRole('link', { name: /M-202/ });
        expect(text(row)).toContain('Cancelado');
        expect(text(row)).toContain('Sin cliente');
    });

    it('says so when there are no orders', () => {
        renderIndex([]);

        expect(screen.getByText('No hay pedidos mayoristas registrados')).toBeInTheDocument();
    });

    it('links to the new order form and shows the deleted shortcut only with permission', () => {
        const { unmount } = renderIndex([order(1)]);
        expect(screen.getByRole('link', { name: /Nuevo pedido/ })).toHaveAttribute('href', '/wholesale/create');
        expect(screen.queryByRole('link', { name: /Eliminados/ })).not.toBeInTheDocument();
        unmount();

        permissions.granted = ['wholesale.view_deleted'];
        renderIndex([order(1)]);
        expect(screen.getByRole('link', { name: /Eliminados/ })).toHaveAttribute('href', '/wholesale/deleted');
    });

    it('searches on Enter and keeps the other filters', () => {
        renderIndex([order(1)], { status: 'completed' });

        const box = screen.getByPlaceholderText('Buscar por código o cliente...');
        fireEvent.change(box, { target: { value: 'maria' } });
        fireEvent.keyDown(box, { key: 'Enter' });

        expect(router.get).toHaveBeenCalledWith('/wholesale', { status: 'completed', search: 'maria' }, { preserveState: true, replace: true });
    });

    it('filters by status and clears it with "all"', () => {
        renderIndex([order(1)]);

        fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'cancelled' } });
        expect(router.get).toHaveBeenLastCalledWith('/wholesale', { status: 'cancelled' }, expect.any(Object));

        fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'all' } });
        expect(router.get).toHaveBeenLastCalledWith('/wholesale', { status: undefined }, expect.any(Object));
    });
});

describe('Wholesale deleted orders', () => {
    const deleted = (id: number) => ({ ...order(id), deleted_at: '2026-10-08T15:00:00Z' });

    it('lists deleted orders with the code struck through, total and a link to the detail', () => {
        renderDeleted([deleted(3)]);

        expect(screen.getByText('M-203')).toHaveClass('line-through');
        expect(screen.getByText('Cliente 3')).toBeInTheDocument();
        expect(text(screen.getByRole('table'))).toContain('$ 450.000');
        expect(screen.getByRole('link', { name: 'Ver detalle' })).toHaveAttribute('href', '/wholesale.deleted.show/3');
    });

    it('says so when nothing was deleted', () => {
        renderDeleted([]);

        expect(screen.getByText('No hay pedidos mayoristas eliminados')).toBeInTheDocument();
    });

    it('searches on submit with a partial reload of the orders only', () => {
        renderDeleted([deleted(3)]);

        fireEvent.change(screen.getByPlaceholderText('Buscar por código o cliente'), { target: { value: 'ana' } });
        fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

        expect(router.get).toHaveBeenCalledWith(
            '/wholesale.deleted.index',
            { search: 'ana' },
            { preserveState: true, preserveScroll: true, only: ['wholesaleSales'] },
        );
    });

    it('goes back to the wholesale list', () => {
        renderDeleted([deleted(3)]);

        const links = screen.getAllByRole('link');
        expect(links.some((link) => link.getAttribute('href') === '/wholesale.index')).toBe(true);
        expect(within(document.body).getByText('Pedidos mayoristas eliminados', { selector: 'h1' })).toBeInTheDocument();
    });
});
