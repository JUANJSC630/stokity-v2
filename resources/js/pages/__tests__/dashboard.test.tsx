import { router, usePage } from '@inertiajs/react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '../dashboard';

vi.mock('@inertiajs/react', () => ({
    router: { reload: vi.fn(), visit: vi.fn(), post: vi.fn() },
    Head: () => null,
    Link: 'a',
    usePage: vi.fn(),
}));

vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/hooks/use-polling', () => ({ usePolling: vi.fn() }));

const day = (n: number) => `2026-10-0${n}`;

const props = {
    userName: 'Juan',
    metrics: {
        total_sales_today: 24,
        total_sales_month: 312,
        total_revenue_today: 1184500,
        total_revenue_month: 18452000,
        average_sale_today: 49354,
        average_sale_month: 59140,
        total_products: 312,
        low_stock_products: 0,
        total_clients: 128,
        total_users: 4,
    },
    growth: { sales_growth: 26, revenue_growth: 31 },
    dailySales: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ date: day(n), total_sales: n, total_amount: n * 1000 })),
    topProducts: [],
    salesByBranch: [],
    recentSales: [],
    lowStockProducts: [],
};

function mockPermissions(permissions: string[]) {
    vi.mocked(usePage).mockReturnValue({ props: { auth: { user: { role: 'administrador' }, permissions } } } as unknown as ReturnType<
        typeof usePage
    >);
}

beforeAll(() => {
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
    mockPermissions(['dashboard.low_stock.view', 'finances.view']);
});

describe('Dashboard', () => {
    it('greets the user and puts the revenue hero first', () => {
        render(<Dashboard {...props} />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/, Juan!/);
        expect(screen.getByRole('region', { name: 'Ingresos' })).toBeInTheDocument();
    });

    it("moved today's sales and revenue into the hero instead of separate cards", () => {
        render(<Dashboard {...props} />);

        expect(screen.queryByText('Ventas Hoy')).not.toBeInTheDocument();
        expect(screen.queryByText('Ingresos Hoy')).not.toBeInTheDocument();
        expect(within(screen.getByRole('region', { name: 'Ingresos' })).getByText('Ventas hoy')).toBeInTheDocument();
    });

    it('shows the month with its pace, and links to finances when allowed', () => {
        render(<Dashboard {...props} previousMonth={{ revenue: 20000000, revenue_same_period: 15000000 }} />);

        const month = screen.getByRole('region', { name: 'Este mes' });
        expect(within(month).getByText('$ 18.452.000')).toBeInTheDocument();
        expect(month).toHaveTextContent('312 transacciones');
        expect(month).toHaveTextContent('+23%');
        expect(within(month).getByRole('link', { name: 'Ver en Finanzas' })).toHaveAttribute('href', '/finances.summary');
    });

    it('no longer spends cards on how many clients and products exist', () => {
        render(<Dashboard {...props} />);

        expect(screen.queryByText('Clientes')).not.toBeInTheDocument();
        expect(screen.queryByText('Productos')).not.toBeInTheDocument();
        expect(screen.queryByText('Registrados')).not.toBeInTheDocument();
    });

    it('hides the finances link without that permission', () => {
        mockPermissions([]);
        render(<Dashboard {...props} />);

        expect(screen.queryByRole('link', { name: 'Ver en Finanzas' })).not.toBeInTheDocument();
    });

    it("splits today's revenue by how it was paid", () => {
        render(
            <Dashboard
                {...props}
                paymentBreakdown={[
                    { method: 'cash', group: 'cash', count: 10, total: 700000 },
                    { method: 'nequi', group: 'transfer', count: 4, total: 300000 },
                ]}
            />,
        );

        const hero = screen.getByRole('region', { name: 'Ingresos' });
        expect(within(hero).getByRole('img', { name: /Formas de pago de hoy: Efectivo 70 %, Transferencia 30 %/ })).toBeInTheDocument();
    });

    it('says everything is in order when there is nothing to attend', () => {
        render(<Dashboard {...props} />);

        const panel = screen.getByRole('region', { name: 'Para atender' });
        expect(within(panel).getByText('Todo al día')).toBeInTheDocument();
    });

    it('lists what needs attention, with the overdue credits linking to their tab', () => {
        render(
            <Dashboard
                {...props}
                lowStockProducts={[{ id: 1, name: 'Collar', code: 'C-1', stock: 1, min_stock: 5 }]}
                pendingSales={{ total: 2, items: [] }}
                overdueCredits={{ count: 3, balance: 450000 }}
            />,
        );

        const panel = screen.getByRole('region', { name: 'Para atender' });
        expect(within(panel).queryByText('Todo al día')).not.toBeInTheDocument();
        expect(within(panel).getByText('3')).toBeInTheDocument();
        expect(within(panel).getByRole('link', { name: /3 créditos vencidos/ })).toHaveAttribute('href', '/credits.index');
    });

    it('shows the cash status next to the greeting only when it applies', () => {
        const { unmount } = render(<Dashboard {...props} cashSession={{ required: true, open: { id: 1, opened_at: '2026-10-13T08:02:00' } }} />);
        expect(screen.getByText(/Caja abierta · desde/)).toBeInTheDocument();
        unmount();

        render(<Dashboard {...props} cashSession={{ required: false, open: null }} />);
        expect(screen.queryByText(/Caja/)).not.toBeInTheDocument();
    });

    it('sends a closed required cash session to the POS only to those who can open it', () => {
        mockPermissions(['pos.access']);
        const { unmount } = render(<Dashboard {...props} cashSession={{ required: true, open: null }} />);
        expect(screen.getByRole('link', { name: /Caja cerrada · Abrir en el POS/ })).toHaveAttribute('href', '/pos.index');
        unmount();

        mockPermissions([]);
        render(<Dashboard {...props} cashSession={{ required: true, open: null }} />);
        expect(screen.queryByRole('link', { name: /Caja cerrada/ })).not.toBeInTheDocument();
        expect(screen.getByText('Caja cerrada')).toBeInTheDocument();
    });

    it('reloads every dashboard prop, including the daily sales, when refreshed', async () => {
        vi.mocked(router.reload).mockImplementation(((options: { onFinish?: () => void }) => options.onFinish?.()) as never);
        render(<Dashboard {...props} />);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Actualizar datos' }));
        });

        expect(router.reload).toHaveBeenCalledTimes(1);
        const only = (vi.mocked(router.reload).mock.calls[0][0] as { only: string[] }).only;
        expect(only).toEqual(
            expect.arrayContaining([
                'metrics',
                'growth',
                'dailySales',
                'recentSales',
                'topProducts',
                'lowStockProducts',
                'pendingSales',
                'salesByBranch',
                'paymentBreakdown',
                'cashSession',
                'overdueCredits',
                'previousMonth',
            ]),
        );
    });

    it('works while the daily sales are missing', () => {
        render(<Dashboard {...props} dailySales={undefined as never} />);

        expect(screen.queryByRole('slider')).not.toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Ingresos' })).toBeInTheDocument();
    });
});
