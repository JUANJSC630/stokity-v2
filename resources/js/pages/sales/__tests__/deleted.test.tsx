import { router } from '@inertiajs/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Deleted from '../deleted';

vi.mock('@inertiajs/react', () => ({
    router: { visit: vi.fn() },
    Head: () => null,
    Link: 'a',
    usePage: vi.fn(() => ({ props: {} })),
}));
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

const sale = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    code: `V-${id}`,
    total: 50000 * id,
    date: '2026-10-01T10:00:00Z',
    deleted_at: '2026-10-05T10:00:00Z',
    client: { name: `Cliente ${id}` },
    ...overrides,
});

function renderPage(data: ReturnType<typeof sale>[], filters = {}) {
    return render(
        <Deleted
            sales={{ data: data as never, links: [], current_page: 1, from: 1, to: data.length, total: data.length, last_page: 1 }}
            filters={filters}
        />,
    );
}

beforeAll(() => {
    vi.stubGlobal('route', (name: string, id?: number) => `/${name}${id ? `/${id}` : ''}`);
});

beforeEach(() => vi.clearAllMocks());

describe('Deleted sales', () => {
    it('lists each deleted sale with the client, amount and link to its detail', () => {
        renderPage([sale(1), sale(2, { client: null })]);

        const list = screen.getByRole('list', { name: '2 venta(s) eliminada(s)' });
        expect(within(list).getByText('Cliente 1')).toBeInTheDocument();
        expect(within(list).getByText('Consumidor final')).toBeInTheDocument();
        expect(within(list).getByText('$ 100.000')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Ver detalle de V-2' })).toHaveAttribute('href', '/sales.deleted.show/2');
    });

    it('strikes the code through so it is not mistaken for a live sale', () => {
        renderPage([sale(1)]);

        expect(screen.getAllByText('V-1')[0]).toHaveClass('line-through');
    });

    it('searches on submit with a partial visit', () => {
        renderPage([sale(1)]);

        fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar ventas eliminadas' }), { target: { value: 'maria' } });
        fireEvent.submit(screen.getByRole('search'));

        expect(router.visit).toHaveBeenCalledWith(
            '/sales.deleted.index?search=maria',
            expect.objectContaining({ only: ['sales'], preserveState: true }),
        );
    });

    it('clears the search and reloads the unfiltered list', () => {
        renderPage([sale(1)], { search: 'maria' });

        fireEvent.click(screen.getByRole('button', { name: 'Borrar búsqueda' }));

        expect(router.visit).toHaveBeenCalledWith('/sales.deleted.index', expect.anything());
    });

    it('tells apart an empty history from an empty search', () => {
        const { unmount } = renderPage([]);
        expect(screen.getByText('No hay ventas eliminadas')).toBeInTheDocument();
        unmount();

        renderPage([], { search: 'zzz' });
        expect(screen.getByText('Ninguna venta eliminada coincide')).toBeInTheDocument();
    });
});
