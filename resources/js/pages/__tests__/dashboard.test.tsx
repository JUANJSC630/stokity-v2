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

    it('keeps the month, clients and products cards, and links to finances when allowed', () => {
        render(<Dashboard {...props} />);

        expect(screen.getByText('Ingresos del Mes')).toBeInTheDocument();
        expect(screen.getByText('$ 18.452.000')).toBeInTheDocument();
        expect(screen.getByText('Clientes')).toBeInTheDocument();
        expect(screen.getByText('Productos')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Ver en Finanzas' })).toHaveAttribute('href', '/finances.summary');
    });

    it('hides the products card and the finances link without those permissions', () => {
        mockPermissions([]);
        render(<Dashboard {...props} />);

        expect(screen.queryByText('Productos')).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Ver en Finanzas' })).not.toBeInTheDocument();
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
            ]),
        );
    });

    it('works while the daily sales are missing', () => {
        render(<Dashboard {...props} dailySales={undefined as never} />);

        expect(screen.queryByRole('slider')).not.toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Ingresos' })).toBeInTheDocument();
    });
});
