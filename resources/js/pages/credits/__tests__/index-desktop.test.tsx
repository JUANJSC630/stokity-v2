/** The credits list on a wide screen: master-detail with the selected credit open on the right. */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import CreditsIndex from '../index';

vi.mock('@inertiajs/react', () => ({
    router: { get: vi.fn(), visit: vi.fn(), on: vi.fn(() => () => undefined), post: vi.fn(), patch: vi.fn() },
    Head: () => null,
    Link: ({ href, children, onClick, ...rest }: { href: string; children: ReactNode; onClick?: React.MouseEventHandler }) => (
        <a href={href} onClick={onClick} {...rest}>
            {children}
        </a>
    ),
    usePage: vi.fn(() => ({ props: { business: { brand_color: '#C4686F' } }, version: 'v1' })),
}));
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/hooks/use-polling', () => ({ usePolling: vi.fn() }));
vi.mock('@/components/PaymentMethodSelect', () => ({ default: () => <div /> }));

const daysFromNow = (days: number) => new Date(Date.now() + days * 86400000).toISOString();

const credit = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    code: `CR-${100 + id}`,
    type: 'installments',
    status: 'active',
    client: { name: `Cliente ${id}` },
    seller: { name: 'Carlos' },
    branch: { name: 'Centro' },
    total_amount: 200000,
    amount_paid: 50000,
    balance: 150000,
    installments_count: 4,
    installment_amount: 50000,
    due_date: daysFromNow(20),
    created_at: '2026-10-01T10:00:00Z',
    items: [],
    payments: [],
    ...overrides,
});

function renderPage(data: ReturnType<typeof credit>[], overdueCount = 0) {
    return render(
        <CreditsIndex
            credits={{ data: data as never, links: [], current_page: 1, from: 1, to: data.length, total: data.length, last_page: 1 } as never}
            filters={{}}
            overdueCount={overdueCount}
        />,
    );
}

function mockFetch(receivables: number | null = 12400000) {
    const fetchMock = vi.fn(async (url: string) => {
        if (String(url).includes('receivables')) {
            return receivables === null ? { ok: false, json: async () => ({}) } : { ok: true, json: async () => ({ total: receivables }) };
        }
        const id = Number(String(url).match(/credits\/(\d+)/)?.[1]);
        return { ok: true, status: 200, json: async () => ({ props: { credit: credit(id), canCancel: true, canUpdateInstallments: false } }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
    vi.stubGlobal('route', (name: string) => `/${name}`);
    vi.stubGlobal(
        'matchMedia',
        vi.fn().mockImplementation((query: string) => ({
            matches: query.includes('min-width: 1024px'),
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
    window.history.replaceState({}, '', '/credits');
});

describe('Credits list on a wide screen', () => {
    it('opens the first credit on the right as soon as the list loads', async () => {
        mockFetch();
        renderPage([credit(1), credit(2)]);

        expect(await screen.findByRole('heading', { level: 2, name: 'CR-101' })).toBeInTheDocument();
        expect(screen.getAllByRole('link').find((link) => link.getAttribute('href') === '/credits/1')).toHaveAttribute('aria-current', 'true');
    });

    it('opens another credit in place when its row is pressed and remembers it in the address', async () => {
        const fetchMock = mockFetch();
        renderPage([credit(1), credit(2)]);
        await screen.findByRole('heading', { level: 2, name: 'CR-101' });

        fireEvent.click(screen.getAllByRole('link').find((link) => link.getAttribute('href') === '/credits/2') as HTMLElement);

        expect(await screen.findByRole('heading', { level: 2, name: 'CR-102' })).toBeInTheDocument();
        expect(window.location.search).toBe('?selected=2');
        expect(fetchMock).toHaveBeenCalledWith('/credits/2', expect.any(Object));
    });

    it('restores the credit named in the address', async () => {
        window.history.replaceState({}, '', '/credits?selected=2');
        mockFetch();
        renderPage([credit(1), credit(2)]);

        expect(await screen.findByRole('heading', { level: 2, name: 'CR-102' })).toBeInTheDocument();
    });

    it('moves through the list with the arrow keys', async () => {
        mockFetch();
        renderPage([credit(1), credit(2), credit(3)]);
        await screen.findByRole('heading', { level: 2, name: 'CR-101' });

        fireEvent.keyDown(window, { key: 'ArrowDown' });
        expect(await screen.findByRole('heading', { level: 2, name: 'CR-102' })).toBeInTheDocument();

        fireEvent.keyDown(window, { key: 'ArrowDown' });
        expect(await screen.findByRole('heading', { level: 2, name: 'CR-103' })).toBeInTheDocument();

        fireEvent.keyDown(window, { key: 'ArrowDown' });
        expect(screen.getByRole('heading', { level: 2, name: 'CR-103' })).toBeInTheDocument();

        fireEvent.keyDown(window, { key: 'ArrowUp' });
        expect(await screen.findByRole('heading', { level: 2, name: 'CR-102' })).toBeInTheDocument();
    });

    it('ignores the arrow keys while typing in the search box', async () => {
        mockFetch();
        renderPage([credit(1), credit(2)]);
        await screen.findByRole('heading', { level: 2, name: 'CR-101' });

        fireEvent.keyDown(screen.getByLabelText('Buscar créditos'), { key: 'ArrowDown' });

        expect(screen.getByRole('heading', { level: 2, name: 'CR-101' })).toBeInTheDocument();
    });

    it('shows how much is left to collect and how many are overdue', async () => {
        mockFetch(12400000);
        renderPage([credit(1)], 3);

        await waitFor(() => expect(screen.getByText('$ 12.400.000', { selector: '.sr-only' })).toBeInTheDocument());
        expect(screen.getAllByText('Vencidos').length).toBeGreaterThan(1);
        expect(screen.getByText('3', { selector: '.sr-only' })).toBeInTheDocument();
    });

    it('hides those figures when the endpoint is not available', async () => {
        mockFetch(null);
        renderPage([credit(1)]);
        await screen.findByRole('heading', { level: 2, name: 'CR-101' });

        expect(screen.queryByText(/Por cobrar/)).not.toBeInTheDocument();
    });

    it('invites to pick a credit when the list is empty', async () => {
        mockFetch();
        renderPage([]);

        expect(screen.getByText('Selecciona un crédito de la lista para ver su detalle.')).toBeInTheDocument();
        expect(screen.getByText(/No hay créditos/)).toBeInTheDocument();
    });

    it('lets the user register an abono from the open credit', async () => {
        mockFetch();
        renderPage([credit(1)]);

        fireEvent.click(await screen.findByRole('button', { name: /Registrar abono/ }));

        expect(within(screen.getByRole('dialog')).getByText('Saldo pendiente:', { exact: false })).toBeInTheDocument();
        await act(async () => {});
    });
});
