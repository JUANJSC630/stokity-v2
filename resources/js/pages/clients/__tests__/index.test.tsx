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

const client = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    name: `Cliente ${id}`,
    document: `10002${id}`,
    phone: `300000000${id}`,
    email: `c${id}@correo.co`,
    address: `Calle ${id}`,
    is_wholesale: false,
    wholesale_discount_pct: null,
    ...overrides,
});

function renderPage(data: ReturnType<typeof client>[], total = data.length, filters = {}) {
    return render(
        <Index clients={{ data: data as never, links: [], current_page: 1, from: 1, to: data.length, total, last_page: 1 }} filters={filters} />,
    );
}

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
    vi.stubGlobal('route', (name: string, id?: number) => `/${name}${id ? `/${id}` : ''}`);
    vi.stubGlobal(
        'matchMedia',
        vi
            .fn()
            .mockImplementation((query: string) => ({
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
    window.history.replaceState({}, '', '/clients');
});

describe('Clients index', () => {
    it('shows the total and one row per client with document, phone and email', () => {
        renderPage([client(1), client(2, { phone: undefined, email: undefined, document: undefined })], 128);

        expect(screen.getByText('128', { selector: '.sr-only' })).toBeInTheDocument();
        const list = screen.getByRole('list', { name: '2 cliente(s)' });
        expect(within(list).getByText('Cliente 1')).toBeInTheDocument();
        expect(within(list).getByText('10002' + 1)).toBeInTheDocument();
        expect(within(list).getByText('Sin documento')).toBeInTheDocument();
    });

    it('marks wholesale clients with their discount', () => {
        renderPage([client(1, { is_wholesale: true, wholesale_discount_pct: '12.00' })]);

        expect(screen.getAllByText('Mayorista 12%').length).toBeGreaterThan(0);
    });

    it('links each client to its detail and the phone to a call', () => {
        renderPage([client(4)]);

        expect(screen.getByRole('link', { name: 'Ver cliente Cliente 4' })).toHaveAttribute('href', '/clients.show/4');
        expect(screen.getByRole('link', { name: '3000000004' })).toHaveAttribute('href', 'tel:3000000004');
    });

    it('opens a client when its table row is clicked', () => {
        renderPage([client(6)]);

        fireEvent.click(screen.getAllByText('Calle 6')[0]);

        expect(router.visit).toHaveBeenCalledWith('/clients.show/6');
    });

    it('searches on submit with a partial visit', () => {
        renderPage([client(1)]);

        fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar clientes' }), { target: { value: 'maria' } });
        fireEvent.submit(screen.getByRole('search'));

        expect(router.visit).toHaveBeenCalledWith('/clients?search=maria', expect.objectContaining({ only: ['clients'], preserveState: true }));
    });

    it('offers to clear a search with no matches', () => {
        renderPage([], 0, { search: 'zzz' });

        expect(screen.getByText('Ningún cliente coincide con la búsqueda')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));
        expect(router.visit).toHaveBeenCalledWith('/clients', expect.anything());
    });

    it('invites to add the first client when there are none', () => {
        renderPage([], 0);

        expect(screen.getByText('Todavía no hay clientes')).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: 'Nuevo cliente' }).length).toBeGreaterThan(0);
    });
});
