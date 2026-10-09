import { router } from '@inertiajs/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Index from '../index';

vi.mock('@inertiajs/react', () => ({
    router: { visit: vi.fn(), reload: vi.fn() },
    Head: () => null,
    Link: 'a',
    usePage: vi.fn(() => ({ props: { business: { brand_color: '#C4686F' } } })),
}));
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/hooks/use-polling', () => ({ usePolling: vi.fn() }));

const permissions = vi.hoisted(() => ({ granted: [] as string[] }));
vi.mock('@/hooks/use-permissions', () => ({ usePermissions: () => ({ can: (permission: string) => permissions.granted.includes(permission) }) }));

const sale = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    code: `V-${1000 + id}`,
    total: 89000 * id,
    date: new Date().toISOString(),
    status: 'completed',
    payment_method: 'cash',
    credit_sale_id: null,
    client: { name: `Cliente ${id}` },
    seller: { name: 'Carlos' },
    ...overrides,
});

function renderPage(data: ReturnType<typeof sale>[], total = data.length, filters = {}) {
    return render(
        <Index sales={{ data: data as never, links: [], current_page: 1, from: 1, to: data.length, total, last_page: 1 }} filters={filters} />,
    );
}

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
    vi.stubGlobal('IntersectionObserver', NoopObserver);
    vi.stubGlobal('route', (name: string, id?: number) => `/${name}${id ? `/${id}` : ''}`);
    vi.stubGlobal(
        'matchMedia',
        vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
        })),
    );
});

beforeEach(() => {
    vi.clearAllMocks();
    permissions.granted = ['sales.update', 'sales.view_deleted'];
    window.history.replaceState({}, '', '/sales');
});

describe('Sales index', () => {
    it('shows the total count and a row per sale in the phone list', () => {
        renderPage([sale(1), sale(2, { client: null, status: 'pending' })], 214);

        expect(screen.getByText('214', { selector: '.sr-only' })).toBeInTheDocument();
        const list = screen.getByRole('list', { name: '2 venta(s)' });
        expect(within(list).getByText('Cliente 1')).toBeInTheDocument();
        expect(within(list).getByText('Consumidor final')).toBeInTheDocument();
        expect(within(list).getByText('Pendiente')).toBeInTheDocument();
    });

    it('formats every amount as Colombian pesos', () => {
        renderPage([sale(1)]);

        expect(screen.getAllByText('$ 89.000').length).toBeGreaterThan(0);
    });

    it('links the table rows to the sale and offers edit only with permission', () => {
        renderPage([sale(3)]);

        expect(screen.getByRole('link', { name: 'Ver venta V-1003' })).toHaveAttribute('href', '/sales.show/3');
        expect(screen.getByRole('link', { name: 'Editar venta V-1003' })).toHaveAttribute('href', '/sales.edit/3');
    });

    it('hides edit and the deleted shortcut without those permissions', () => {
        permissions.granted = [];
        renderPage([sale(3)]);

        expect(screen.queryByRole('link', { name: 'Editar venta V-1003' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Ver ventas eliminadas' })).not.toBeInTheDocument();
    });

    it('marks a credit sale', () => {
        renderPage([sale(1, { status: 'credit_pending', credit_sale_id: 9 })]);

        expect(screen.getAllByText('Crédito').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Crédito pendiente').length).toBeGreaterThan(0);
    });

    it('filters by status through a partial visit that keeps the page state', () => {
        renderPage([sale(1)]);

        fireEvent.click(screen.getByRole('button', { name: 'Pendientes' }));

        expect(router.visit).toHaveBeenCalledWith('/sales?status=pending', expect.objectContaining({ only: ['sales'], preserveState: true }));
    });

    it('searches when the form is submitted', () => {
        renderPage([sale(1)]);

        fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar ventas' }), { target: { value: 'maria' } });
        fireEvent.submit(screen.getByRole('search'));

        expect(router.visit).toHaveBeenCalledWith('/sales?search=maria', expect.objectContaining({ only: ['sales'] }));
    });

    it('explains an empty result under filters and offers to clear them', () => {
        renderPage([], 0, { status: 'cancelled' });
        window.history.replaceState({}, '', '/sales?status=cancelled');

        expect(screen.getByText('Ninguna venta coincide con esos filtros')).toBeInTheDocument();
        fireEvent.click(screen.getAllByRole('button', { name: 'Limpiar filtros' })[0]);
        expect(router.visit).toHaveBeenCalledWith('/sales', expect.anything());
    });

    it('invites to register the first sale when there are none', () => {
        renderPage([], 0);

        expect(screen.getByText('Todavía no hay ventas')).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: 'Nueva venta' }).length).toBeGreaterThan(0);
    });

    it('opens a sale when its table row is clicked', () => {
        renderPage([sale(5)]);

        fireEvent.click(screen.getAllByText('V-1005 · Carlos')[0]);

        expect(router.visit).toHaveBeenCalledWith('/sales.show/5');
    });
});
