import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ImpersonationLogIndex from '../index';

vi.mock('@inertiajs/react', () => ({
    router: { visit: vi.fn() },
    Head: () => null,
    Link: 'a',
    usePage: vi.fn(() => ({ props: {} })),
}));

vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

const iso = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60000).toISOString();

const row = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    started_at: iso(130),
    ended_at: iso(118),
    ip_address: '190.12.0.7',
    super_admin: { id: 1, name: 'Juan Saldarriaga', email: 'juan@stokity.test' },
    tenant: { id: 7, name: 'Lu Accesorios' },
    impersonated_user: { id: 5, name: 'Carlos Vendedor', email: 'carlos@lu.test' },
    ...overrides,
});

const paginated = (data: ReturnType<typeof row>[]) => ({
    data,
    links: [
        { label: '&laquo; Anterior', url: null },
        { label: '1', url: '/admin/impersonations?page=1' },
        { label: 'Siguiente &raquo;', url: null },
    ],
    current_page: 1,
    from: 1,
    to: data.length,
    total: data.length,
    last_page: 1,
});

beforeEach(() => {
    vi.clearAllMocks();
});

describe('Impersonation audit log', () => {
    it('reads each record as who entered as whom, where and when', () => {
        render(<ImpersonationLogIndex logs={paginated([row()])} tenantId={null} />);

        const item = within(screen.getByRole('list', { name: 'Registros de impersonación' })).getAllByRole('listitem')[0];
        expect(item).toHaveTextContent('Juan Saldarriaga entró como Carlos Vendedor en Lu Accesorios');
        expect(within(item).getByRole('link', { name: 'Lu Accesorios' })).toHaveAttribute('href', '/admin/tenants/7');
        expect(item).toHaveTextContent('IP 190.12.0.7');
        expect(item).toHaveTextContent('hace 2 h');
    });

    it('shows how long a closed session lasted', () => {
        render(<ImpersonationLogIndex logs={paginated([row()])} tenantId={null} />);

        expect(within(screen.getByRole('list', { name: 'Registros de impersonación' })).getByText('Cerrada · 12 min')).toBeInTheDocument();
    });

    it('flags a session that is still open', () => {
        render(<ImpersonationLogIndex logs={paginated([row({ ended_at: null })])} tenantId={null} />);

        expect(within(screen.getByRole('list', { name: 'Registros de impersonación' })).getByText('En curso')).toBeInTheDocument();
    });

    it('keeps the record when the user, tenant or IP are gone', () => {
        render(<ImpersonationLogIndex logs={paginated([row({ tenant: null, impersonated_user: null, ip_address: null })])} tenantId={null} />);

        const item = within(screen.getByRole('list', { name: 'Registros de impersonación' })).getAllByRole('listitem')[0];
        expect(item).toHaveTextContent('Juan Saldarriaga entró como —');
        expect(item).not.toHaveTextContent('IP');
    });

    it('offers to leave the per-business filter only when one is active', () => {
        const { rerender } = render(<ImpersonationLogIndex logs={paginated([row()])} tenantId={null} />);
        expect(screen.queryByRole('link', { name: 'Ver todos los negocios' })).not.toBeInTheDocument();

        rerender(<ImpersonationLogIndex logs={paginated([row()])} tenantId={7} />);
        expect(screen.getByRole('link', { name: 'Ver todos los negocios' })).toHaveAttribute('href', '/admin/impersonations');
    });

    it('shows an empty state without records', () => {
        render(<ImpersonationLogIndex logs={paginated([])} tenantId={null} />);

        expect(screen.getByText('Sin registros todavía.')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
});
