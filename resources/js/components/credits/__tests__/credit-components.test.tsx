import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreditDetailPane } from '../credit-detail-pane';
import { CreditStatusPill, CreditTypePill, DueDateNote } from '../credit-meta';
import { CreditProgress } from '../credit-progress';
import { CreditRow } from '../credit-row';

const routerOn = vi.hoisted(() => ({ handlers: [] as (() => void)[] }));

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, onClick, ...rest }: { href: string; children: React.ReactNode; onClick?: React.MouseEventHandler }) => (
        <a href={href} onClick={onClick} {...rest}>
            {children}
        </a>
    ),
    router: {
        post: vi.fn(),
        patch: vi.fn(),
        on: vi.fn((_event: string, handler: () => void) => {
            routerOn.handlers.push(handler);
            return () => undefined;
        }),
    },
    usePage: vi.fn(() => ({ props: { business: { brand_color: '#C4686F' } }, version: 'v1' })),
}));
vi.mock('@/components/PaymentMethodSelect', () => ({ default: () => <div /> }));

const text = (node: HTMLElement) => (node.textContent ?? '').replace(/\s/g, ' ');
const daysFromNow = (days: number) => new Date(Date.now() + days * 86400000).toISOString();

const credit = (overrides: Record<string, unknown> = {}) => ({
    id: 4,
    code: 'CR-104',
    type: 'installments',
    status: 'active',
    client: { name: 'Ana Pérez' },
    seller: { name: 'Carlos' },
    branch: { name: 'Centro' },
    total_amount: 400000,
    amount_paid: 100000,
    balance: 300000,
    installments_count: 4,
    installment_amount: 100000,
    due_date: daysFromNow(30),
    created_at: '2026-10-01T10:00:00Z',
    items: [],
    payments: [],
    ...overrides,
});

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
    routerOn.handlers = [];
});

describe('credit meta', () => {
    it.each([
        ['active', 'Activo'],
        ['overdue', 'Vencido'],
        ['completed', 'Completado'],
        ['cancelled', 'Cancelado'],
    ])('labels %s as %s', (status, label) => {
        render(<CreditStatusPill status={status} />);
        expect(screen.getByText(label)).toBeInTheDocument();
    });

    it('falls back to the active look for an unknown status', () => {
        render(<CreditStatusPill status="raro" />);
        expect(screen.getByText('Activo')).toBeInTheDocument();
    });

    it('names the type and keeps an unknown one readable', () => {
        const { rerender } = render(<CreditTypePill type="layaway" />);
        expect(screen.getByText('Separado')).toBeInTheDocument();
        rerender(<CreditTypePill type="nuevo" />);
        expect(screen.getByText('nuevo')).toBeInTheDocument();
    });

    it('words the due date by how close it is', () => {
        const { rerender } = render(<DueDateNote dueDate={daysFromNow(-3)} status="overdue" />);
        expect(screen.getByText(/Venció hace \d+ días?/)).toBeInTheDocument();

        rerender(<DueDateNote dueDate={daysFromNow(1)} status="active" />);
        expect(screen.getByText(/Vence en \d+ días?/)).toBeInTheDocument();

        rerender(<DueDateNote dueDate={daysFromNow(40)} status="active" />);
        expect(screen.getByText(/^Vence \d+ de/)).toBeInTheDocument();
    });

    it('shows nothing for a finished credit or one without a date', () => {
        const { container, rerender } = render(<DueDateNote dueDate={daysFromNow(2)} status="completed" />);
        expect(container).toBeEmptyDOMElement();
        rerender(<DueDateNote dueDate={null} status="active" />);
        expect(container).toBeEmptyDOMElement();
    });
});

describe('CreditProgress', () => {
    it('shows what is paid, the total, the percentage and what is missing', () => {
        render(<CreditProgress paid={100000} total={400000} />);

        expect(screen.getByText('25% pagado')).toBeInTheDocument();
        expect(text(screen.getByText(/^Falta:/))).toContain('$ 300.000');
        expect(screen.getByText(/de \$\s400\.000/)).toBeInTheDocument();
        expect(screen.getByRole('img', { name: '25% pagado' })).toBeInTheDocument();
    });

    it('hides the missing amount once everything is paid', () => {
        render(<CreditProgress paid={400000} total={400000} />);

        expect(screen.getByText('100% pagado')).toBeInTheDocument();
        expect(screen.queryByText(/Falta:/)).not.toBeInTheDocument();
    });

    it('splits the bar in one tick per installment and says how many are covered', () => {
        render(<CreditProgress paid={250000} total={400000} installments={4} installmentAmount={100000} />);

        expect(screen.getByRole('img', { name: '2 de 4 cuotas cubiertas' })).toBeInTheDocument();
        expect(screen.getByRole('img').children).toHaveLength(4);
    });

    it('does not divide by zero with an empty total', () => {
        render(<CreditProgress paid={0} total={0} />);

        expect(screen.getByText('0% pagado')).toBeInTheDocument();
    });
});

describe('CreditRow', () => {
    it('links to the credit and summarises it', () => {
        render(<CreditRow credit={credit() as never} />);

        const row = screen.getByRole('link');
        expect(row).toHaveAttribute('href', '/credits/4');
        expect(text(row)).toContain('Ana Pérez');
        expect(text(row)).toContain('CR-104');
        expect(text(row)).toContain('$ 100.000 / $ 400.000');
        expect(text(row)).toContain('25%');
        expect(text(row)).toContain('Falta: $ 300.000');
    });

    it('selects instead of navigating when a handler is given, and marks the selected row', () => {
        const onSelect = vi.fn();
        render(<CreditRow credit={credit() as never} selected onSelect={onSelect} />);

        const row = screen.getByRole('link');
        expect(row).toHaveAttribute('aria-current', 'true');
        const prevented = !fireEvent.click(row);

        expect(prevented).toBe(true);
        expect(onSelect).toHaveBeenCalledTimes(1);
    });
});

describe('CreditDetailPane', () => {
    function page(creditOverrides: Record<string, unknown> = {}) {
        return { props: { credit: credit({ items: [], payments: [], ...creditOverrides }), canCancel: true, canUpdateInstallments: false } };
    }

    it('shows a loading state and then the credit loaded through its Inertia page', async () => {
        const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => page() }));
        vi.stubGlobal('fetch', fetchMock);

        render(<CreditDetailPane id={4} />);
        expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();

        expect(await screen.findByRole('heading', { level: 2, name: 'CR-104' })).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledWith(
            '/credits/4',
            expect.objectContaining({ headers: expect.objectContaining({ 'X-Inertia': 'true', 'X-Inertia-Version': 'v1' }) }),
        );
    });

    it('offers to retry when the credit cannot be loaded', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
            .mockResolvedValueOnce({ ok: true, status: 200, json: async () => page() });
        vi.stubGlobal('fetch', fetchMock);

        render(<CreditDetailPane id={4} />);
        fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

        expect(await screen.findByRole('heading', { level: 2, name: 'CR-104' })).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('reloads the credit after a visit succeeds (an abono was registered, for instance)', async () => {
        const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => page() }));
        vi.stubGlobal('fetch', fetchMock);

        render(<CreditDetailPane id={4} />);
        await screen.findByRole('heading', { level: 2, name: 'CR-104' });

        routerOn.handlers.forEach((handler) => handler());

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    });

    it('shows the abono button on an open credit', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({ ok: true, status: 200, json: async () => page() })),
        );

        render(<CreditDetailPane id={4} />);

        expect(await screen.findByRole('button', { name: /Registrar abono/ })).toBeInTheDocument();
    });
});
