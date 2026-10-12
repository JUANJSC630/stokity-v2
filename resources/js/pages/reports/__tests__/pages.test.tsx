/** Characterization tests for the seven reports: the filters and exports they all share, and what each one shows. */
import { downloadFile } from '@/lib/download';
import { router } from '@inertiajs/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentType, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import BranchesReport from '../branches-report';
import CashBalance from '../cash-balance';
import ReportsIndex from '../index';
import ProductsReport from '../products-report';
import ReturnsReport from '../returns-report';
import SalesDetail from '../sales-detail';
import SellersReport from '../sellers-report';

vi.mock('@inertiajs/react', () => ({
    router: { get: vi.fn(), visit: vi.fn(), reload: vi.fn() },
    Head: () => null,
    Link: 'a',
    usePage: () => ({ props: { business: { brand_color: '#C4686F' } } }),
}));
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/hooks/use-polling', () => ({ usePolling: vi.fn() }));
const env = vi.hoisted(() => ({ wide: true }));
vi.mock('@/lib/download', () => ({ downloadFile: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/components/ui/select', () => ({
    Select: ({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children: ReactNode }) => (
        <select value={value} onChange={(e) => onValueChange?.(e.target.value)}>
            {children}
        </select>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));

const text = (node: HTMLElement) => (node.textContent ?? '').replace(/\s/g, ' ');
const field = (id: string) => document.getElementById(id) as HTMLInputElement;
const selectWith = (option: string) =>
    screen.getAllByRole('combobox').find((select) => within(select).queryByRole('option', { name: option })) as HTMLSelectElement;
const branches = [
    { id: 1, name: 'Centro', business_name: 'Lu Centro' },
    { id: 2, name: 'Norte' },
];
const categories = [
    { id: 4, name: 'Collares' },
    { id: 5, name: 'Aretes' },
];
const admin = { is_admin: true };

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
    vi.stubGlobal(
        'matchMedia',
        vi.fn().mockImplementation((query: string) => ({
            matches: env.wide,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
        })),
    );
    vi.stubGlobal('route', (name: string, id?: number) => `/${name}${id ? `/${id}` : ''}`);
});

beforeEach(() => {
    vi.clearAllMocks();
    env.wide = true;
    vi.mocked(downloadFile).mockResolvedValue(undefined);
});

/** The seven pages share one way of filtering and exporting; each is described once here. */
interface Shared {
    name: string;
    title: string;
    path: string;
    exportBase: string;
    Page: ComponentType<never>;
    props: Record<string, unknown>;
    /** The page receives the user and forces the branch of a non-admin. */
    hasUser: boolean;
    hasBranchFilter: boolean;
    /** The dashboard hides the date fields until the manual period is chosen. */
    prepare?: () => void;
}

const emptyDashboard = {
    sales_summary: {
        current: { total_sales: 0, total_amount: 0, net_amount: 0, tax_amount: 0, average_sale: 0, total_paid: 0 },
        previous: { total_sales: 0, total_amount: 0 },
        growth: { sales_count: 0, total_amount: 0 },
    },
    top_products: [],
    sales_by_branch: [],
    sales_by_seller: [],
    returns_summary: { total_returns: 0, unique_sales_returned: 0 },
    payment_methods: [],
};

const shared: Shared[] = [
    {
        name: 'dashboard',
        title: 'Reportes de Ventas',
        path: '/reports',
        exportBase: '/reports/export',
        Page: ReportsIndex as never,
        props: { dashboardData: emptyDashboard, branches, categories },
        hasUser: true,
        hasBranchFilter: true,
        prepare: () => fireEvent.change(selectWith('Mes Actual'), { target: { value: 'manual' } }),
    },
    {
        name: 'sales detail',
        title: 'Detalle de Ventas',
        path: '/reports/sales-detail',
        exportBase: '/reports/sales-detail/export',
        Page: SalesDetail as never,
        props: { salesData: [], branches, categories, groupBy: 'day' },
        hasUser: false,
        hasBranchFilter: true,
    },
    {
        name: 'products',
        title: 'Reporte de Productos',
        path: '/reports/products',
        exportBase: '/reports/products/export',
        Page: ProductsReport as never,
        props: { branches, categories },
        hasUser: true,
        hasBranchFilter: true,
    },
    {
        name: 'sellers',
        title: 'Reporte de Vendedores',
        path: '/reports/sellers',
        exportBase: '/reports/sellers/export',
        Page: SellersReport as never,
        props: { branches, categories },
        hasUser: true,
        hasBranchFilter: true,
    },
    {
        name: 'branches',
        title: 'Reporte de Sucursales',
        path: '/reports/branches',
        exportBase: '/reports/branches/export',
        Page: BranchesReport as never,
        props: { branches, categories },
        hasUser: false,
        hasBranchFilter: true,
    },
    {
        name: 'returns',
        title: 'Reporte de Devoluciones',
        path: '/reports/returns',
        exportBase: '/reports/returns/export',
        Page: ReturnsReport as never,
        props: { branches, categories },
        hasUser: true,
        hasBranchFilter: true,
    },
];

function renderShared(page: Shared, extra: Record<string, unknown> = {}, filters: Record<string, string> = {}) {
    const Page = page.Page as ComponentType<Record<string, unknown>>;
    return render(<Page {...page.props} {...(page.hasUser ? { user: admin } : {})} filters={filters} {...extra} />);
}

describe.each(shared)('Report filters and export: $name', (page) => {
    it('shows its title', () => {
        renderShared(page);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(page.title);
    });

    it('applies the dates and the category, leaving out "all", with a partial reload that keeps state and scroll', () => {
        renderShared(page);
        page.prepare?.();

        fireEvent.change(field('date_from'), { target: { value: '2026-10-01' } });
        fireEvent.change(field('date_to'), { target: { value: '2026-10-31' } });
        fireEvent.change(selectWith('Todas las categorías'), { target: { value: '4' } });
        fireEvent.click(screen.getByRole('button', { name: /Aplicar Filtros/ }));

        const [url, params, options] = vi.mocked(router.get).mock.calls[0];
        expect(url).toBe(page.path);
        expect(params).toMatchObject({ date_from: '2026-10-01', date_to: '2026-10-31', category_id: '4' });
        expect(options).toEqual({ preserveState: true, preserveScroll: true });
    });

    it('sends the chosen branch, and drops it again when "all" is chosen', () => {
        renderShared(page);
        const branch = selectWith('Todas las sucursales');

        fireEvent.change(branch, { target: { value: '2' } });
        fireEvent.click(screen.getByRole('button', { name: /Aplicar Filtros/ }));
        expect(vi.mocked(router.get).mock.calls[0][1]).toMatchObject({ branch_id: '2' });

        fireEvent.change(branch, { target: { value: 'all' } });
        fireEvent.click(screen.getByRole('button', { name: /Aplicar Filtros/ }));
        expect((vi.mocked(router.get).mock.calls[1][1] as { branch_id?: string }).branch_id).toBeUndefined();
    });

    it('exports to Excel and to PDF with the same filters in the address', async () => {
        renderShared(page);
        page.prepare?.();
        fireEvent.change(field('date_from'), { target: { value: '2026-10-01' } });
        fireEvent.change(selectWith('Todas las categorías'), { target: { value: '5' } });

        fireEvent.click(screen.getByRole('button', { name: /Exportar Excel/ }));
        fireEvent.click(screen.getByRole('button', { name: /Exportar PDF/ }));

        await waitFor(() => expect(downloadFile).toHaveBeenCalledTimes(2));
        const [excel, pdf] = vi.mocked(downloadFile).mock.calls.map((call) => call[0]);
        expect(excel).toContain(`${page.exportBase}/excel?`);
        expect(pdf).toContain(`${page.exportBase}/pdf?`);
        expect(excel).toContain('date_from=2026-10-01');
        expect(excel).toContain('category_id=5');
    });

    it('says why an export failed', async () => {
        vi.mocked(downloadFile).mockRejectedValueOnce(new Error('No hay datos para exportar'));
        renderShared(page);

        fireEvent.click(screen.getByRole('button', { name: /Exportar Excel/ }));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No hay datos para exportar'));
    });

    it('falls back to a generic message when the failure is not an error', async () => {
        vi.mocked(downloadFile).mockRejectedValueOnce('raro');
        renderShared(page);

        fireEvent.click(screen.getByRole('button', { name: /Exportar PDF/ }));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Error al generar el archivo'));
    });
});

describe.each(shared.filter((page) => page.hasUser))('Report branch rules: $name', (page) => {
    it('forces the branch of a user who is not an administrator, and hides the branch filter', async () => {
        renderShared(page, { user: { is_admin: false, branch_id: 3 } });
        expect(screen.queryByText('Todas las sucursales')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Aplicar Filtros/ }));
        expect(vi.mocked(router.get).mock.calls[0][1]).toMatchObject({ branch_id: '3' });

        fireEvent.click(screen.getByRole('button', { name: /Exportar Excel/ }));
        await waitFor(() => expect(downloadFile).toHaveBeenCalled());
        expect(vi.mocked(downloadFile).mock.calls[0][0]).toContain('branch_id=3');
    });
});

describe('Reports dashboard', () => {
    const dashboard = {
        ...emptyDashboard,
        sales_summary: {
            current: { total_sales: 12345, total_amount: 5400000, net_amount: 4500000, tax_amount: 900000, average_sale: 437, total_paid: 5400000 },
            previous: { total_sales: 10000, total_amount: 4000000 },
            growth: { sales_count: 25, total_amount: 35 },
        },
        top_products: [1, 2, 3, 4, 5, 6].map((i) => ({
            id: i,
            name: `Producto ${i}`,
            code: `COD-${i}`,
            total_quantity: 20000 + i,
            total_amount: 100000 * i,
            sales_count: 5,
        })),
        sales_by_branch: [{ id: 1, name: 'Centro', business_name: 'Lu Centro', total_sales: 30000, total_amount: 3000000, average_sale: 100 }],
        sales_by_seller: [{ id: 1, name: 'Carlos', email: 'carlos@lu.co', total_sales: 40000, total_amount: 2000000, average_sale: 50 }],
        returns_summary: { total_returns: 14000, unique_sales_returned: 12000 },
        payment_methods: [
            { payment_method: 'cash', transaction_count: 20000, total_amount: 900000, average_amount: 45 },
            { payment_method: 'nequi', transaction_count: 11000, total_amount: 500000, average_amount: 45 },
            { payment_method: 'otro', transaction_count: 10000, total_amount: 1, average_amount: 1 },
        ],
    };
    const renderDashboard = (data = dashboard, user: Record<string, unknown> = admin) =>
        render(<ReportsIndex dashboardData={data as never} filters={{}} branches={branches} categories={categories} user={user as never} />);

    it('shows the figures of the period and the growth against the previous month', () => {
        renderDashboard();

        const page = text(document.body);
        expect(page).toContain('Total Ventas');
        expect(page).toContain('12.345');
        expect(page).toContain('$ 5.400.000');
        expect(page).toContain('+25%');
        expect(page).toContain('vs mes anterior');
    });

    it('colors the growth: green when it grows, red when it falls, neutral when it does not change', () => {
        const withGrowth = (value: number) => ({
            ...dashboard,
            sales_summary: { ...dashboard.sales_summary, growth: { sales_count: value, total_amount: 0 } },
        });
        const { unmount } = renderDashboard();
        expect(screen.getByText('+25%').closest('p')!.className).toContain('text-green-600');
        unmount();
        const { unmount: second } = renderDashboard(withGrowth(-10));
        expect(screen.getByText('-10%').closest('p')!.className).toContain('text-red-600');
        second();
        renderDashboard(withGrowth(0));
        expect(screen.getByText('0%').closest('p')!.className).toContain('text-neutral-600');
    });

    it('summarizes the top 5 products and the returns in the first tab', () => {
        renderDashboard();

        expect(screen.getByText('Producto 5')).toBeInTheDocument();
        expect(screen.queryByText('Producto 6')).not.toBeInTheDocument();
        expect(text(document.body)).toContain('Total Devoluciones');
        expect(text(document.body)).toContain('14.000');
        expect(text(document.body)).toContain('12.000');
    });

    it.each([
        ['Productos', 'Producto 6'],
        ['Sucursales', 'Promedio: $ 100'],
        ['Vendedores', 'carlos@lu.co'],
        ['Pagos', 'Efectivo'],
    ])('shows the %s tab with its list', (tab, expected) => {
        renderDashboard();

        fireEvent.mouseDown(screen.getByRole('tab', { name: tab }));

        expect(screen.getByText(expected)).toBeInTheDocument();
    });

    it('names the payment methods and keeps an unknown code as it comes', () => {
        renderDashboard();
        fireEvent.mouseDown(screen.getByRole('tab', { name: 'Pagos' }));

        expect(screen.getByText('Nequi')).toBeInTheDocument();
        expect(screen.getByText('otro')).toBeInTheDocument();
        expect(text(document.body)).toContain('20.000 transacciones');
    });

    it('chooses a period and offers custom month and manual dates only when asked', () => {
        renderDashboard();
        expect(document.querySelector('input[type="month"]')).toBeNull();
        expect(field('date_from')).toBeNull();

        fireEvent.change(selectWith('Mes Actual'), { target: { value: 'custom' } });
        expect(document.querySelector('input[type="month"]')).not.toBeNull();

        fireEvent.change(selectWith('Mes Actual'), { target: { value: 'manual' } });
        expect(field('date_from')).not.toBeNull();
    });

    it('applies the filters with the status, defaulting to completed sales', () => {
        renderDashboard();

        fireEvent.change(selectWith('Completadas'), { target: { value: 'cancelled' } });
        fireEvent.click(screen.getByRole('button', { name: /Aplicar Filtros/ }));

        expect(vi.mocked(router.get).mock.calls[0][1]).toMatchObject({ status: 'cancelled' });
    });

    describe('applying a period with its own button', () => {
        const applyPeriod = (choice: string | null) => {
            if (choice) fireEvent.change(selectWith('Mes Actual'), { target: { value: choice } });
            fireEvent.click(screen.getByRole('button', { name: /Aplicar Período/ }));
        };
        const sent = () => vi.mocked(router.get).mock.calls[0][1];

        beforeEach(() => {
            vi.useFakeTimers({ toFake: ['Date'] });
            vi.setSystemTime(new Date(2026, 9, 15, 10, 0, 0));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('sends the dates of the chosen month on the very first press (it used to send the previous ones)', () => {
            renderDashboard();

            applyPeriod('last');

            expect(sent()).toMatchObject({ date_from: '2026-09-01', date_to: '2026-09-30' });
            expect(router.get).toHaveBeenCalledWith('/reports', expect.any(Object), { preserveState: true, preserveScroll: true });
        });

        it('sends the current month', () => {
            renderDashboard();

            applyPeriod(null);

            expect(sent()).toMatchObject({ date_from: '2026-10-01', date_to: '2026-10-31' });
        });

        it('sends the month picked as "Mes Personalizado" and, without one, keeps the dates it already had', () => {
            renderDashboard();
            fireEvent.change(selectWith('Mes Actual'), { target: { value: 'custom' } });
            fireEvent.click(screen.getByRole('button', { name: /Aplicar Período/ }));
            expect(sent()).toMatchObject({ date_from: '', date_to: '' });
            vi.mocked(router.get).mockClear();

            fireEvent.change(screen.getByLabelText('Mes'), { target: { value: '2026-02' } });
            fireEvent.click(screen.getByRole('button', { name: /Aplicar Período/ }));

            expect(sent()).toMatchObject({ date_from: '2026-02-01', date_to: '2026-02-28' });
        });

        it('applies the typed dates of "Fechas Manuales" and does not wipe them', () => {
            renderDashboard();
            fireEvent.change(selectWith('Mes Actual'), { target: { value: 'manual' } });
            fireEvent.change(field('date_from'), { target: { value: '2026-08-05' } });
            fireEvent.change(field('date_to'), { target: { value: '2026-08-20' } });

            fireEvent.click(screen.getByRole('button', { name: /Aplicar Período/ }));

            expect(sent()).toMatchObject({ date_from: '2026-08-05', date_to: '2026-08-20' });
            expect(field('date_from')).toHaveValue('2026-08-05');
            expect(field('date_to')).toHaveValue('2026-08-20');
        });

        it('keeps the other filters when it applies a period', () => {
            renderDashboard();
            fireEvent.change(selectWith('Completadas'), { target: { value: 'cancelled' } });

            applyPeriod('last');

            expect(sent()).toMatchObject({ status: 'cancelled', date_from: '2026-09-01' });
        });
    });
});

describe('Sales detail report', () => {
    const block = (sales: number, amount: number) => ({
        total_sales: sales,
        total_amount: amount,
        net_amount: amount * 0.8,
        tax_amount: amount * 0.2,
        average_sale: sales ? amount / sales : 0,
    });
    const salesData = [
        {
            period: '2026-10-01',
            completed: block(20000, 4000000),
            cancelled: block(2, 100000),
            pending: block(0, 0),
            credit_pending: block(3, 300000),
        },
        { period: '2026-10-02', completed: block(10000, 2000000), cancelled: block(0, 0), pending: block(1, 50000), credit_pending: block(0, 0) },
    ];
    const renderDetail = (groupBy = 'day', data: unknown[] = salesData) =>
        render(<SalesDetail salesData={data as never} filters={{}} branches={branches} categories={categories} groupBy={groupBy} />);

    it('adds up each state across the periods', () => {
        renderDetail();

        const page = text(document.body);
        expect(page).toContain('Completadas30.000');
        expect(page).toContain('$ 6.000.000');
        expect(page).toContain('Canceladas2');
        expect(page).toContain('$ 100.000');
        expect(page).toContain('Pendientes1');
        expect(page).toContain('Crédito Pendiente3');
    });

    it.each([
        ['day', 'día'],
        ['week', 'semana'],
        ['month', 'mes'],
        ['year', 'año'],
    ])('says it is grouped by %s', (groupBy, word) => {
        renderDetail(groupBy);

        expect(text(document.body)).toContain(`Ventas desglosadas por ${word}`);
    });

    it('lists each period in the table with its completed figures, and in a short form for phones', () => {
        renderDetail();

        const rows = within(screen.getByRole('table')).getAllByRole('row');
        expect(text(rows[2])).toContain('2026-10-01');
        expect(text(rows[2])).toContain('$ 4.000.000');
        expect(screen.queryByText('2 cancel.')).toBeNull();
    });

    it('swaps the 21-column table for a short card per period on a phone', () => {
        env.wide = false;
        renderDetail();

        expect(screen.queryByRole('table')).toBeNull();
        expect(screen.getAllByText('2 cancel.').length).toBe(1);
        expect(text(document.body)).toContain('$ 4.000.000');
    });
});

describe('Products report', () => {
    const productsData = {
        top_products: [
            { id: 1, name: 'Collar Luna', code: 'COL-001', total_quantity: 20000, total_amount: 900000, sales_count: 12000 },
            { id: 2, name: 'Aretes', code: 'ARE-002', total_quantity: 15000, total_amount: 300000, sales_count: 11000 },
        ],
        products_by_category: [{ id: 4, name: 'Collares', total_quantity: 20000, total_amount: 900000, unique_products: 15000 }],
        low_stock_products: [
            { id: 3, name: 'Pulsera', code: 'PUL-003', stock: 0, min_stock: 5 },
            { id: 4, name: 'Anillo', code: 'ANI-004', stock: 2, min_stock: 5 },
        ],
        products_performance: [],
    };
    const renderProducts = (data = productsData) =>
        render(<ProductsReport productsData={data as never} filters={{}} branches={branches} categories={categories} user={admin as never} />);

    it('summarizes the products sold, their revenue and those with low stock', () => {
        renderProducts();

        const page = text(document.body);
        expect(page).toContain('Productos Vendidos2');
        expect(page).toContain('Ingresos Totales$ 1.200.000');
        expect(page).toContain('Bajo Stock2');
    });

    it('lists the best sellers and the sales by category', () => {
        renderProducts();

        const tables = screen.getAllByRole('table');
        expect(text(tables[0])).toContain('COL-001');
        expect(text(tables[0])).toContain('Collar Luna');
        expect(text(tables[0])).toContain('20.000');
        expect(text(tables[0])).toContain('$ 900.000');
        expect(text(tables[1])).toContain('Collares');
        expect(text(tables[1])).toContain('15.000');
    });

    it('lists the products with low stock, in red when there is none left', () => {
        renderProducts();

        const table = screen.getAllByRole('table')[2];
        expect(text(table)).toContain('Pulsera');
        expect(within(table).getByText('0').className).toContain('bg-destructive');
        expect(within(table).getByText('2').className).not.toContain('bg-destructive');
    });

    it('does not show the low stock section when nothing is low', () => {
        renderProducts({ ...productsData, low_stock_products: [] });

        expect(screen.queryByText('Productos con Bajo Stock')).not.toBeInTheDocument();
    });
});

describe('Sellers report', () => {
    const sellersData = {
        sellers_performance: [
            { id: 1, name: 'Carlos', email: 'carlos@lu.co', total_sales: 20000, total_amount: 3000000, average_sale: 150 },
            { id: 2, name: 'Ana', email: 'ana@lu.co', total_sales: 15000, total_amount: 2000000, average_sale: 133 },
        ],
        sellers_comparison: [
            { id: 1, name: 'Carlos', current_period_sales: 20000, previous_period_sales: 16000, growth_percentage: 25 },
            { id: 2, name: 'Ana', current_period_sales: 15000, previous_period_sales: 20000, growth_percentage: -25 },
        ],
        sellers_by_branch: [{ id: 1, name: 'Carlos', email: 'carlos@lu.co', branch_name: 'Centro', total_sales: 20000, total_amount: 3000000 }],
    };
    const renderSellers = () =>
        render(<SellersReport sellersData={sellersData as never} filters={{}} branches={branches} categories={categories} user={admin as never} />);

    it('adds up the active sellers, their sales and their revenue', () => {
        renderSellers();

        const page = text(document.body);
        expect(page).toContain('Vendedores Activos2');
        expect(page).toContain('Total Ventas35.000');
        expect(page).toContain('Ingresos Totales$ 5.000.000');
    });

    it('lists the performance, the period comparison with signed growth and the sellers by branch', () => {
        renderSellers();

        const tables = screen.getAllByRole('table');
        expect(text(tables[0])).toContain('carlos@lu.co');
        expect(text(tables[0])).toContain('$ 3.000.000');
        expect(text(tables[1])).toContain('+25%');
        expect(text(tables[1])).toContain('-25%');
        expect(text(tables[2])).toContain('Centro');
    });
});

describe('Branches report', () => {
    const branchesData = {
        branches_performance: [
            {
                id: 1,
                name: 'Centro',
                business_name: 'Lu Centro',
                address: 'Cra 7',
                total_sales: 30000,
                total_amount: 3000000,
                average_sale: 100,
                active_sellers: 12000,
            },
        ],
        branches_comparison: [{ id: 1, name: 'Centro', sales_count: 30000, total_amount: 3000000, average_sale: 100, active_days: 20 }],
        branches_by_region: [{ id: 1, name: 'Centro', business_name: 'Lu Centro', region: 'Bogotá', total_sales: 30000, total_amount: 3000000 }],
    };

    it('summarizes the branches and lists performance, comparison and region', () => {
        render(<BranchesReport branchesData={branchesData as never} filters={{}} branches={branches} categories={categories} />);

        const page = text(document.body);
        expect(page).toContain('Sucursales Activas1');
        expect(page).toContain('Total Ventas30.000');
        expect(page).toContain('Ingresos Totales$ 3.000.000');
        const tables = screen.getAllByRole('table');
        expect(text(tables[0])).toContain('Cra 7');
        expect(text(tables[0])).toContain('12.000');
        expect(text(tables[1])).toContain('20');
        expect(text(tables[2])).toContain('Bogotá');
    });
});

describe('Returns report', () => {
    const returnsData = {
        returns_summary: { total_returns: 14000, total_amount: 700000, average_return: 50, return_rate: 7.5 },
        returns_by_product: [
            { id: 1, name: 'Collar Luna', code: 'COL-001', total_returns: 3, total_quantity: 4, total_amount: 200000, return_rate: 12 },
            { id: 2, name: 'Aretes', code: 'ARE-002', total_returns: 2, total_quantity: 2, total_amount: 90000, return_rate: 7 },
            { id: 3, name: 'Anillo', code: 'ANI-003', total_returns: 1, total_quantity: 1, total_amount: 30000, return_rate: 2 },
        ],
        returns_by_reason: [
            { reason: 'Defecto', count: 5, total_amount: 300000, percentage: 62.5 },
            { reason: '', count: 3, total_amount: 100000, percentage: 37.5 },
        ],
        returns_trend: [{ date: '2026-10-02', returns_count: 2, returns_amount: 80000 }],
        returns_detail: [
            {
                id: 1,
                sale_id: 9,
                sale_code: 'V-9',
                sale_deleted: false,
                reason: 'No le gustó',
                created_at: '05 oct 2026',
                user: 'Carlos',
                total: 80000,
                products: [
                    { name: 'Collar Luna', quantity: 1 },
                    { name: 'Aretes', quantity: 2 },
                ],
            },
            {
                id: 2,
                sale_id: 7,
                sale_code: 'V-7',
                sale_deleted: true,
                reason: null,
                created_at: '04 oct 2026',
                user: null,
                total: 20000,
                products: [{ name: 'Anillo', quantity: 1 }],
            },
            {
                id: 3,
                sale_id: 5,
                sale_code: null,
                sale_deleted: false,
                reason: null,
                created_at: '03 oct 2026',
                user: 'Ana',
                total: 10000,
                products: [],
            },
        ],
    };
    const renderReturns = (data: unknown = returnsData) =>
        render(<ReturnsReport returnsData={data as never} filters={{}} branches={branches} categories={categories} user={admin as never} />);

    it('summarizes the returns with the rate to two decimals', () => {
        renderReturns();

        const page = text(document.body);
        expect(page).toContain('Total Devoluciones14.000');
        expect(page).toContain('Monto Total$ 700.000');
        expect(page).toContain('Promedio por Devolución$ 50');
        expect(page).toContain('7.50%');
    });

    it('rates each product: high above 10%, medium above 5%, low otherwise', () => {
        renderReturns();

        const table = screen.getAllByRole('table')[0];
        expect(within(table).getByText('Alto')).toBeInTheDocument();
        expect(within(table).getByText('Medio')).toBeInTheDocument();
        expect(within(table).getByText('Bajo')).toBeInTheDocument();
        expect(within(table).getByText('12.00%').className).toContain('text-red-600');
        expect(within(table).getByText('7.00%').className).toContain('text-orange-600');
        expect(within(table).getByText('2.00%').className).toContain('text-green-600');
    });

    it('lists the reasons and writes "Sin especificar" when there is none', () => {
        renderReturns();

        const table = screen.getAllByRole('table')[1];
        expect(text(table)).toContain('Defecto');
        expect(text(table)).toContain('62.50%');
        expect(text(table)).toContain('Sin especificar');
    });

    it('lists every return with its products and a link to the original sale, marking a deleted one', () => {
        renderReturns();

        const table = screen.getAllByRole('table')[2];
        const rows = within(table).getAllByRole('row');
        expect(text(rows[1])).toContain('1× Collar Luna, 2× Aretes');
        expect(text(rows[1])).toContain('No le gustó');
        expect(text(rows[1])).toContain('Carlos');
        expect(within(rows[1]).getByRole('link', { name: '#V-9' })).toHaveAttribute('href', '/sales.show/9');
        expect(within(rows[2]).getByRole('link', { name: '#V-7' })).toHaveAttribute('href', '/sales.deleted.show/7');
        expect(text(rows[2])).toContain('Eliminada');
        expect(text(rows[3])).toContain('—');
    });

    it('shows the trend, and hides the history and the trend when there is nothing', () => {
        const { unmount } = renderReturns();
        expect(text(document.body)).toContain('Tendencia de Devoluciones');
        unmount();

        renderReturns({ ...returnsData, returns_detail: [], returns_trend: [] });
        expect(screen.queryByText('Historial de Devoluciones')).not.toBeInTheDocument();
        expect(screen.queryByText('Tendencia de Devoluciones')).not.toBeInTheDocument();
    });
});

describe('Cash balance report', () => {
    const data = [
        {
            branch_id: 1,
            branch_name: 'Centro',
            return_count: 2,
            total_revenue: 900000,
            net_cash: 540000,
            payment_rows: [
                { payment_method: 'cash', sale_count: 6, revenue: 600000, total_received: 650000, total_change: 50000 },
                { payment_method: 'nequi', sale_count: 3, revenue: 300000, total_received: 300000, total_change: 0 },
            ],
        },
        {
            branch_id: 2,
            branch_name: 'Norte',
            return_count: 1,
            total_revenue: 100000,
            net_cash: 0,
            payment_rows: [{ payment_method: 'credit_card', sale_count: 1, revenue: 100000, total_received: 100000, total_change: 0 }],
        },
    ];
    const renderBalance = (props: Record<string, unknown> = {}) =>
        render(<CashBalance data={data as never} filters={{ date: '2026-10-10' }} availableBranches={branches} isAdmin {...(props as object)} />);

    it('adds up the revenue, the net cash and the branches', () => {
        renderBalance();

        const page = text(document.body);
        expect(page).toContain('Total ingresos$ 1.000.000');
        expect(page).toContain('Efectivo neto en caja$ 540.000');
        expect(page).toContain('Sucursales activas2');
    });

    it('shows each branch with its payment methods, and the net cash only when it took cash', () => {
        renderBalance();

        const [centro, norte] = screen.getAllByRole('table').map((table) => table.closest('section') as HTMLElement);
        expect(text(centro)).toContain('Efectivo');
        expect(text(centro)).toContain('Nequi');
        expect(text(centro)).toContain('Cobrado − cambio entregado');
        expect(text(centro)).toContain('$ 540.000');
        expect(text(norte)).toContain('Tarjeta de crédito');
        expect(text(norte)).not.toContain('Cobrado − cambio entregado');
    });

    it('says how many returns each branch registered, in the plural and the singular', () => {
        renderBalance();

        // Finding fixed by the redesign: the plural used to read "devoluciónes".
        expect(text(document.body)).toContain('2 devoluciones registradas');
        expect(text(document.body)).toContain('1 devolución registrada');
    });

    it('says so when there are no sales that day', () => {
        renderBalance({ data: [] });

        expect(screen.getByText('No hay ventas registradas para esta fecha')).toBeInTheDocument();
        expect(screen.queryByText('Total ingresos')).not.toBeInTheDocument();
    });

    it('reloads as soon as the date changes, and as soon as the branch changes, replacing the history entry', () => {
        renderBalance();

        fireEvent.change(document.querySelector('input[type="date"]') as HTMLInputElement, { target: { value: '2026-10-09' } });
        expect(router.get).toHaveBeenLastCalledWith('/reports.cash-balance', { date: '2026-10-09' }, { preserveState: true, replace: true });

        fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
        expect(router.get).toHaveBeenLastCalledWith(
            '/reports.cash-balance',
            { date: '2026-10-09', branch_id: '2' },
            { preserveState: true, replace: true },
        );
    });

    it('offers the branch filter only to an administrator with branches', () => {
        const { unmount } = renderBalance({ isAdmin: false });
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
        unmount();

        renderBalance({ availableBranches: [] });
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });
});
