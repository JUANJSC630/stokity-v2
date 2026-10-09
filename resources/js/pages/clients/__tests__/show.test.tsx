import { router } from '@inertiajs/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Show from '../show';

vi.mock('@inertiajs/react', () => ({
    router: { visit: vi.fn(), delete: vi.fn() },
    Head: () => null,
    Link: 'a',
    usePage: vi.fn(() => ({ props: {} })),
}));
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

const baseClient = {
    id: 1,
    name: 'María Gómez',
    document: '1000200300',
    phone: '300 555 1234',
    address: 'Cra 15 # 82-30',
    email: 'maria@correo.co',
    birthdate: '1991-04-12',
    is_wholesale: false,
    wholesale_discount_pct: null,
    created_at: '2025-11-02T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
};

const sale = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    code: `V-${1000 + id}`,
    total: 50000 * id,
    discount_amount: 0,
    status: 'completed',
    payment_method: 'cash',
    created_at: '2026-10-01T10:00:00Z',
    seller: { name: 'Carlos' },
    ...overrides,
});

function renderShow(
    client: Record<string, unknown> = {},
    sales: ReturnType<typeof sale>[] = [sale(1), sale(2, { discount_amount: 8000, status: 'pending' })],
) {
    return render(
        <Show
            client={{ ...baseClient, ...client } as never}
            sales={
                {
                    data: sales,
                    current_page: 1,
                    last_page: 1,
                    per_page: 10,
                    total: sales.length,
                    from: sales.length ? 1 : null,
                    to: sales.length || null,
                    links: [],
                } as never
            }
            stats={{ total_sales: 18, total_spent: 2845000, last_purchase: '2026-10-07T15:00:00Z' }}
        />,
    );
}

beforeAll(() => {
    vi.stubGlobal('route', (name: string, id?: number) => `/${name}${id ? `/${id}` : ''}`);
});

beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/clients/1');
});

describe('Clients show', () => {
    it('shows the name, contact details and the figures of the client', () => {
        renderShow();

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('María Gómez');
        expect(screen.getAllByText('1000200300').length).toBeGreaterThan(0);
        expect(screen.getByText('maria@correo.co', { selector: 'dd' })).toBeInTheDocument();
        expect(screen.getByText('18', { selector: '.sr-only' })).toBeInTheDocument();
        expect(screen.getAllByText(/^\$\s2\.845\.000$/, { selector: '.sr-only' }).length).toBe(1);
    });

    it('offers edit, call and write actions that really point somewhere', () => {
        renderShow();

        expect(screen.getByRole('link', { name: 'Editar' })).toHaveAttribute('href', '/clients.edit/1');
        expect(screen.getByRole('link', { name: 'Llamar' })).toHaveAttribute('href', 'tel:300 555 1234');
        expect(screen.getByRole('link', { name: 'Escribir' })).toHaveAttribute('href', 'mailto:maria@correo.co');
    });

    it('does not offer call or write when the client has no phone or email', () => {
        renderShow({ phone: null, email: null });

        expect(screen.queryByRole('link', { name: 'Llamar' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Escribir' })).not.toBeInTheDocument();
        expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
    });

    it('flags wholesale clients with their discount', () => {
        renderShow({ is_wholesale: true, wholesale_discount_pct: '12.00' });

        expect(screen.getByText('Mayorista · 12% dto.')).toBeInTheDocument();
    });

    it('lists purchases with status, total and discount, and links to each sale', () => {
        renderShow();

        const table = screen.getByRole('table', { name: 'Historial de compras' });
        expect(within(table).getByText('Pendiente')).toBeInTheDocument();
        expect(within(table).getByText(/−\$\s8\.000/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Ver venta V-1002' })).toHaveAttribute('href', '/sales.show/2');
    });

    it('opens a sale when its table row is clicked', () => {
        renderShow();

        fireEvent.click(within(screen.getByRole('table')).getByText('V-1001'));

        expect(router.visit).toHaveBeenCalledWith('/sales.show/1');
    });

    it('says so when there are no purchases', () => {
        renderShow({}, []);

        expect(screen.getByText('Sin ventas registradas')).toBeInTheDocument();
    });

    it('goes back to the sale the user came from, or to the list otherwise', () => {
        const { unmount } = renderShow();
        expect(screen.getByRole('link', { name: 'Volver a clientes' })).toHaveAttribute('href', '/clients.index');
        unmount();

        window.history.replaceState({}, '', '/clients/1?fromSale=5');
        renderShow();
        expect(screen.getByRole('link', { name: 'Volver a la venta' })).toHaveAttribute('href', '/sales.show/5');
    });
});
