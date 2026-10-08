import { router } from '@inertiajs/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import TenantsIndex from '../index';

vi.mock('@inertiajs/react', () => ({
    router: { post: vi.fn(), delete: vi.fn(), visit: vi.fn() },
    Head: () => null,
    Link: 'a',
    usePage: vi.fn(() => ({ props: {} })),
}));

vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

const summary = { tenants_active: 2, tenants_suspended: 1, tenants_trial: 1, users_total: 12, sales_total: 18452, sales_volume: 184520000 };

const tenants = [
    {
        id: 1,
        name: 'Lu Accesorios',
        slug: 'lu-accesorios',
        status: 'active',
        created_at: '2026-03-02T10:00:00Z',
        users_count: 4,
        products_count: 312,
        sales_count: 1840,
    },
    {
        id: 2,
        name: 'Panadería La Espiga',
        slug: 'panaderia-la-espiga',
        status: 'trial',
        created_at: '2026-09-20T10:00:00Z',
        users_count: 2,
        products_count: 48,
        sales_count: 63,
    },
    {
        id: 3,
        name: 'Ferretería El Tornillo',
        slug: 'ferreteria-el-tornillo',
        status: 'suspended',
        created_at: '2026-01-11T10:00:00Z',
        users_count: 3,
        products_count: 1204,
        sales_count: 5120,
    },
];

function renderPage(overrides: Partial<{ tenants: typeof tenants; search: string }> = {}) {
    return render(<TenantsIndex tenants={overrides.tenants ?? tenants} summary={summary} search={overrides.search ?? ''} userMatches={[]} />);
}

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', NoopObserver);
    vi.stubGlobal('ResizeObserver', NoopObserver);
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
});

describe('Admin tenants index', () => {
    it('lists every tenant in the phone list and shows counts on the filter chips', () => {
        renderPage();

        const list = screen.getByRole('list', { name: '3 negocio(s)' });
        expect(within(list).getByText('Lu Accesorios')).toBeInTheDocument();
        expect(within(list).getByText('Ferretería El Tornillo')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Todos 3' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Suspendidos 1' })).toBeInTheDocument();
    });

    it('narrows the tenants when a status chip is selected', () => {
        renderPage();

        fireEvent.click(screen.getByRole('button', { name: 'Suspendidos 1' }));

        const list = screen.getByRole('list', { name: '1 negocio(s)' });
        expect(within(list).getByText('Ferretería El Tornillo')).toBeInTheDocument();
        const table = screen.getByRole('table');
        expect(within(table).getByText('Ferretería El Tornillo')).toBeInTheDocument();
        expect(within(table).queryByText('Lu Accesorios')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Suspendidos 1' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows an empty message when no tenant has the selected status', () => {
        renderPage({ tenants: tenants.filter((t) => t.status !== 'suspended') });

        fireEvent.click(screen.getByRole('button', { name: 'Suspendidos 0' }));

        expect(screen.getAllByText('Ningún negocio con este estado.').length).toBeGreaterThan(0);
    });

    it('shows the search empty message when the search matches nothing', () => {
        renderPage({ tenants: [], search: 'zzz' });

        expect(screen.getAllByText(/Sin negocios que coincidan con «zzz»/).length).toBeGreaterThan(0);
    });

    it('suspends an active tenant from the table', () => {
        renderPage();

        fireEvent.click(screen.getAllByRole('button', { name: /Suspender/ })[0]);

        expect(router.post).toHaveBeenCalledWith('/admin/tenants/1/suspend', {}, { preserveScroll: true });
    });

    it('activates a suspended tenant from the table', () => {
        renderPage();

        fireEvent.click(screen.getByRole('button', { name: /Activar/ }));

        expect(router.post).toHaveBeenCalledWith('/admin/tenants/3/activate', {}, { preserveScroll: true });
    });

    it('asks for confirmation before deleting and lets the user cancel', () => {
        renderPage();

        fireEvent.click(screen.getByRole('button', { name: 'Eliminar negocio Lu Accesorios' }));

        expect(screen.getByRole('dialog')).toHaveTextContent('«Lu Accesorios»');
        expect(router.delete).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(router.delete).not.toHaveBeenCalled();
    });
});
