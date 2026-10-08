import { router } from '@inertiajs/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import TenantsIndex from '../index';

vi.mock('@inertiajs/react', () => ({
    router: { post: vi.fn(), delete: vi.fn(), visit: vi.fn() },
    Head: () => null,
    Link: 'a',
    usePage: vi.fn(() => ({ props: {} })),
}));

vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

const NOW = new Date('2026-10-08T12:00:00Z');

interface TenantFixture {
    id: number;
    name: string;
    slug: string;
    status: string;
    created_at: string;
    trial_ends_at: string | null;
    last_activity_at: string | null;
}

const tenants: TenantFixture[] = [
    {
        id: 1,
        name: 'Lu Accesorios',
        slug: 'lu-accesorios',
        status: 'active',
        created_at: '2026-03-02T10:00:00Z',
        trial_ends_at: null,
        last_activity_at: '2026-10-08T09:00:00Z',
    },
    {
        id: 2,
        name: 'Panadería La Espiga',
        slug: 'panaderia-la-espiga',
        status: 'trial',
        created_at: '2026-09-20T10:00:00Z',
        trial_ends_at: '2026-10-20T12:00:00Z',
        last_activity_at: null,
    },
    {
        id: 3,
        name: 'Ferretería El Tornillo',
        slug: 'ferreteria-el-tornillo',
        status: 'suspended',
        created_at: '2026-01-11T10:00:00Z',
        trial_ends_at: null,
        last_activity_at: '2026-08-01T10:00:00Z',
    },
];

function renderPage(overrides: Partial<{ tenants: TenantFixture[]; search: string }> = {}) {
    return render(<TenantsIndex tenants={overrides.tenants ?? tenants} search={overrides.search ?? ''} userMatches={[]} />);
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
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

describe('Admin tenants index', () => {
    it('no longer shows platform-wide summary cards or per-tenant product and sales columns', () => {
        renderPage();

        expect(screen.queryByText('Volumen procesado')).not.toBeInTheDocument();
        expect(screen.queryByText('En prueba')).not.toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: 'Productos' })).not.toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: 'Ventas' })).not.toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Última actividad' })).toBeInTheDocument();
    });

    it('lists every tenant in the phone list and shows counts on the filter chips', () => {
        renderPage();

        const list = screen.getByRole('list', { name: '3 negocio(s)' });
        expect(within(list).getByText('Lu Accesorios')).toBeInTheDocument();
        expect(within(list).getByText('Ferretería El Tornillo')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Todos 3' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Suspendidos 1' })).toBeInTheDocument();
    });

    it('shows the last activity of each tenant, or that there is none', () => {
        renderPage();

        const table = screen.getByRole('table');
        expect(within(table).getByText('Activo hace 3 h')).toBeInTheDocument();
        expect(within(table).getByText('Sin actividad')).toBeInTheDocument();
    });

    it('shows how many trial days are left', () => {
        renderPage();

        expect(within(screen.getByRole('table')).getByText('12 días restantes')).toBeInTheDocument();
    });

    it('flags an expired trial', () => {
        renderPage({ tenants: [{ ...tenants[1], trial_ends_at: '2026-10-01T12:00:00Z' }] });

        expect(within(screen.getByRole('table')).getByText('Prueba vencida')).toBeInTheDocument();
    });

    it('hides the status chips when every tenant has the same status', () => {
        renderPage({ tenants: [tenants[0]] });

        expect(screen.queryByRole('button', { name: /Todos/ })).not.toBeInTheDocument();
    });

    it('only offers chips for statuses that exist', () => {
        renderPage({ tenants: [tenants[0], tenants[2]] });

        expect(screen.getByRole('button', { name: 'Activos 1' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Suspendidos 1' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Prueba/ })).not.toBeInTheDocument();
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
