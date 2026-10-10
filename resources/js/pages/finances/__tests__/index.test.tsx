/** Characterization tests for the finances dashboard: its figures, its filters and the inline expense management. */
import { router } from '@inertiajs/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import FinancesIndex from '../index';

const env = vi.hoisted(() => ({
    wide: true,
    post: vi.fn(),
    put: vi.fn(),
    errors: {} as Record<string, string>,
}));

vi.mock('@inertiajs/react', async () => {
    const React = await import('react');
    return {
        router: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), reload: vi.fn() },
        Head: () => null,
        Link: 'a',
        usePage: () => ({ props: { business: { brand_color: '#C4686F' } } }),
        useForm: (initial: Record<string, unknown>) => {
            const [data, setAll] = React.useState(initial);
            const snapshot = React.useRef(data);
            snapshot.current = data;
            return {
                data,
                errors: env.errors,
                processing: false,
                setData: (key: string, value: unknown) => setAll((previous) => ({ ...previous, [key]: value })),
                reset: () => setAll(initial),
                post: (url: string, options?: unknown) => env.post(url, options, snapshot.current),
                put: (url: string, options?: unknown) => env.put(url, options, snapshot.current),
            };
        },
    };
});
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/hooks/use-polling', () => ({ usePolling: vi.fn() }));
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
vi.mock('@/components/ui/tooltip', () => ({
    Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
    TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
    TooltipContent: () => null,
}));

const text = (node: HTMLElement) => (node.textContent ?? '').replace(/\s/g, ' ');

const category = (id: number, name: string, color: string | null = '#ef4444') => ({ id, name, icon: null, color });

const expense = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    branch_id: 1,
    user_id: 1,
    expense_category_id: 1,
    expense_template_id: null,
    amount: 800000,
    description: 'Arriendo local',
    expense_date: '2026-10-05T12:00:00',
    notes: null,
    category: category(1, 'Arriendo'),
    template: null,
    ...overrides,
});

const template = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    branch_id: 1,
    expense_category_id: 2,
    name: `Plantilla ${id}`,
    reference_amount: 120000,
    due_day: 5,
    is_active: true,
    category: category(2, 'Servicios', '#3b82f6'),
    ...overrides,
});

const baseProps = {
    period: 'this_month' as const,
    dateFrom: '2026-10-01',
    dateTo: '2026-10-31',
    periodLabel: 'Este mes',
    selectedBranch: null,
    branches: [] as Array<{ id: number; name: string }>,
    revenue: 5000000,
    returnsTotal: 0,
    netRevenue: 5000000,
    cogs: 2000000,
    grossProfit: 3000000,
    grossMarginPct: 60,
    totalExpenses: 1200000,
    netProfit: 1800000,
    hasCOGSWarning: false,
    expensesByCategory: [{ category: 'Arriendo', icon: null, color: '#ef4444', amount: 800000, pct: 66.7 }],
    expenses: [expense(1), expense(2, { id: 2, amount: 400000, description: null, category: null, expense_category_id: null })],
    pendingTemplates: [] as unknown[],
    categories: [category(1, 'Arriendo'), category(2, 'Servicios', '#3b82f6')],
    currentMonth: 'octubre 2026',
    userBranchId: 1,
    receivables: 0,
    activeCreditsCount: 0,
};

const renderPage = (overrides: Record<string, unknown> = {}) =>
    render(<FinancesIndex {...({ ...baseProps, ...overrides } as unknown as Parameters<typeof FinancesIndex>[0])} />);

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
});

beforeEach(() => {
    vi.clearAllMocks();
    env.wide = true;
    env.errors = {};
});

describe('Finances: figures', () => {
    it('shows the net revenue, gross profit with its margin, expenses and net profit', () => {
        renderPage();

        const page = text(document.body);
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Finanzas');
        expect(page).toContain('Ingresos netos');
        expect(page).toContain('$ 5.000.000');
        expect(page).toContain('Ganancia bruta');
        expect(page).toContain('$ 3.000.000');
        expect(page).toContain('60.0% de margen');
        expect(page).toContain('Gastos');
        expect(page).toContain('$ 1.200.000');
        expect(page).toContain('2 registros');
        expect(page).toContain('Ganancia neta');
        expect(page).toContain('$ 1.800.000');
    });

    it('marks a net loss in red and a net profit in green', () => {
        const { unmount } = renderPage();
        const profit = screen.getByRole('region', { name: 'Ganancia neta' });
        expect(profit.className).toContain('border-green-300');
        expect(text(profit)).toContain('$ 1.800.000');
        unmount();

        renderPage({ netProfit: -500000 });
        const loss = screen.getByRole('region', { name: 'Ganancia neta' });
        expect(loss.className).toContain('border-red-300');
        expect(text(loss)).toContain('-$ 500.000');
        expect(text(loss)).toContain('Los costos y gastos superan a los ingresos del periodo');
    });

    it('writes "1 registro" in the singular', () => {
        renderPage({ expenses: [expense(1)] });

        expect(text(document.body)).toContain('1 registro');
        expect(text(document.body)).not.toContain('1 registros');
    });

    it('shows the receivables card only when there are credits or a balance, linking to the credits', () => {
        const { unmount } = renderPage();
        expect(text(document.body)).not.toContain('Cartera por cobrar');
        unmount();

        renderPage({ receivables: 750000, activeCreditsCount: 3 });
        expect(text(document.body)).toContain('Cartera por cobrar');
        expect(text(document.body)).toContain('$ 750.000');
        expect(text(document.body)).toContain('3 créditos activos');
        expect(screen.getByRole('link', { name: 'Ver créditos' })).toHaveAttribute('href', '/credits');
    });

    it('warns that old cost data may be estimated, only when the server says so', () => {
        const { unmount } = renderPage();
        expect(screen.queryByText(/pueden ser estimados/)).not.toBeInTheDocument();
        unmount();

        renderPage({ hasCOGSWarning: true });
        expect(screen.getByText(/Los datos de costo de productos pueden ser estimados/)).toBeInTheDocument();
    });

    it('lays out the profit and loss statement, with the returns row only when there are returns', () => {
        const { unmount } = renderPage();
        const table = screen.getByRole('table', { name: 'Estado de resultados' });
        expect(text(table)).toContain('Ingresos por ventas');
        expect(text(table)).toContain('$ 5.000.000');
        expect(text(table)).not.toContain('(-) Devoluciones');
        expect(text(table)).toContain('= Ingresos netos');
        expect(text(table)).toContain('(-) Costo de lo vendido');
        expect(text(table)).toContain('$ 2.000.000');
        expect(text(table)).toContain('= Ganancia bruta');
        expect(text(table)).toContain('(-) Gastos del período');
        expect(text(table)).toContain('= Ganancia neta');
        unmount();

        renderPage({ returnsTotal: 150000, netRevenue: 4850000 });
        expect(text(screen.getByRole('table', { name: 'Estado de resultados' }))).toContain('(-) Devoluciones');
        expect(text(screen.getByRole('table', { name: 'Estado de resultados' }))).toContain('$ 150.000');
    });

    it('shows the expenses by category with their share, or says there are none', () => {
        const { unmount } = renderPage();
        expect(text(document.body)).toContain('Gastos por categoría');
        expect(text(document.body)).toContain('67%');
        unmount();

        renderPage({ expensesByCategory: [] });
        expect(screen.getByText('Sin gastos registrados en este período')).toBeInTheDocument();
    });
});

describe('Finances: filters', () => {
    const branches = [
        { id: 1, name: 'Centro' },
        { id: 2, name: 'Norte' },
    ];

    it('reloads with the chosen period, asking for all branches by default', () => {
        renderPage();

        expect(screen.getByRole('button', { name: 'Este mes' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));

        expect(router.get).toHaveBeenCalledWith(
            '/finances',
            { period: 'last_month', branch: '0', date_from: '', date_to: '' },
            { preserveState: true, preserveScroll: true },
        );
    });

    it('filters by branch and keeps the period, sending 0 for "all branches"', () => {
        renderPage({ branches });
        const branch = screen.getByRole('combobox');

        fireEvent.change(branch, { target: { value: '2' } });
        expect(vi.mocked(router.get).mock.lastCall?.[1]).toMatchObject({ period: 'this_month', branch: '2' });

        fireEvent.change(branch, { target: { value: 'all' } });
        expect(vi.mocked(router.get).mock.lastCall?.[1]).toMatchObject({ branch: '0' });
    });

    it('offers the branch selector only when there are branches to choose from', () => {
        const { unmount } = renderPage();
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
        unmount();

        renderPage({ branches });
        expect(screen.getAllByRole('combobox')).toHaveLength(1);
    });

    it('asks for dates with a custom period and only reloads when they are applied', () => {
        renderPage();

        fireEvent.click(screen.getByRole('button', { name: 'Personalizado' }));
        expect(router.get).not.toHaveBeenCalled();

        const [from, to] = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
        fireEvent.change(from, { target: { value: '2026-09-01' } });
        fireEvent.change(to, { target: { value: '2026-09-15' } });
        fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

        expect(router.get).toHaveBeenCalledWith(
            '/finances',
            { period: 'custom', branch: '0', date_from: '2026-09-01', date_to: '2026-09-15' },
            { preserveState: true, preserveScroll: true },
        );
    });
});

describe('Finances: expenses of the period', () => {
    afterEach(() => vi.useRealTimers());

    it('lists the expenses with description or category, date, category and amount, plus the total', () => {
        renderPage();

        const page = text(document.body);
        expect(page).toContain('Arriendo local');
        expect(page).toContain('05 oct');
        expect(text(screen.getByRole('table', { name: 'Gastos del periodo' }))).toContain('Arriendo');
        expect(page).toContain('$ 800.000');
        expect(page).toContain('Sin descripción');
        expect(page).toContain('2 gastos · Total: $ 1.200.000');
    });

    it('lists the expenses as swipeable rows on phones, with date, category and amount', () => {
        env.wide = false;
        renderPage();

        expect(screen.queryByRole('table', { name: 'Gastos del periodo' })).not.toBeInTheDocument();
        const list = screen.getByRole('list', { name: '2 gasto(s)' });
        expect(text(list)).toContain('Arriendo local');
        expect(text(list)).toContain('05 oct · Arriendo');
        expect(text(list)).toContain('$ 800.000');
        expect(text(list)).toContain('Sin descripción');
    });

    it('invites to register the first expense when there are none', () => {
        renderPage({ expenses: [] });

        expect(screen.getByText('Sin gastos en este período.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Registrar primer gasto/ }));

        expect(screen.getByRole('dialog', { name: 'Registrar gasto' })).toBeInTheDocument();
    });

    it('registers an expense from a dialog, posting every field', () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-10T15:00:00Z'));
        renderPage({ branches: [{ id: 1, name: 'Centro' }] });

        fireEvent.click(screen.getByRole('button', { name: /Agregar/ }));
        const dialog = screen.getByRole('dialog', { name: 'Registrar gasto' });
        fireEvent.change(within(dialog).getByPlaceholderText('Ej: Arriendo local'), { target: { value: 'Internet' } });
        fireEvent.change(within(dialog).getByPlaceholderText('0'), { target: { value: '90000' } });
        fireEvent.change(within(dialog).getAllByRole('combobox')[0], { target: { value: '2' } });
        fireEvent.submit(within(dialog).getByRole('button', { name: 'Registrar' }).closest('form') as HTMLFormElement);

        expect(env.post).toHaveBeenCalledWith('/expenses', expect.objectContaining({ preserveScroll: true }), {
            expense_category_id: '2',
            description: 'Internet',
            amount: 90000,
            expense_date: '2026-10-10',
            branch_id: '1',
            notes: '',
        });
    });

    it('edits an expense from a prefilled dialog with a PUT', () => {
        renderPage();

        fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
        const dialog = screen.getByRole('dialog', { name: 'Editar gasto' });
        expect((within(dialog).getByPlaceholderText('Ej: Arriendo local') as HTMLInputElement).value).toBe('Arriendo local');
        fireEvent.change(within(dialog).getByPlaceholderText('Ej: Arriendo local'), { target: { value: 'Arriendo octubre' } });
        fireEvent.submit(within(dialog).getByRole('button', { name: 'Guardar' }).closest('form') as HTMLFormElement);

        expect(env.put).toHaveBeenCalledWith(
            '/expenses/1',
            expect.objectContaining({ preserveScroll: true }),
            expect.objectContaining({ description: 'Arriendo octubre', amount: 800000, expense_date: '2026-10-05', expense_category_id: '1' }),
        );
    });

    it('shows the validation errors of the server inside the dialog', () => {
        env.errors = { amount: 'El monto debe ser mayor a 0.' };
        renderPage();

        fireEvent.click(screen.getByRole('button', { name: /Agregar/ }));

        expect(screen.getByText('El monto debe ser mayor a 0.')).toBeInTheDocument();
    });

    it('deletes an expense only after confirming', async () => {
        renderPage();

        fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
        const dialog = await screen.findByRole('dialog');
        expect(text(dialog)).toContain('¿Eliminar este gasto?');
        expect(router.delete).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

        await waitFor(() => expect(router.delete).toHaveBeenCalledWith('/expenses/1', { preserveScroll: true }));
    });

    it('does not delete when the confirmation is cancelled', async () => {
        renderPage();
        fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);

        fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

        expect(router.delete).not.toHaveBeenCalled();
    });
});

describe('Finances: fixed expenses of the month', () => {
    const pending = [template(1), template(2, { name: 'Internet', reference_amount: 90000, expense_category_id: null, category: null })];

    afterEach(() => vi.useRealTimers());

    it('warns about the fixed expenses not registered this month, in the plural and the singular', () => {
        const { unmount } = renderPage({ pendingTemplates: pending });
        expect(text(document.body)).toContain('Tienes 2 gastos fijos sin registrar este mes (octubre 2026)');
        unmount();

        renderPage({ pendingTemplates: [template(1)] });
        expect(text(document.body)).toContain('Tienes 1 gasto fijo sin registrar este mes');
    });

    it('registers every pending template with its reference amount, skipping those marked as not applicable', () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-10T15:00:00Z'));
        renderPage({ pendingTemplates: pending });

        fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
        const dialog = screen.getByRole('dialog', { name: 'Gastos fijos de octubre 2026' });
        expect(text(dialog)).toContain('Plantilla 1');
        expect(text(dialog)).toContain('Servicios');
        fireEvent.click(within(dialog).getAllByLabelText('No aplica')[1]);
        fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar gastos' }));

        expect(router.post).toHaveBeenCalledWith(
            '/expenses',
            { expenses: [{ expense_template_id: 1, branch_id: 1, expense_category_id: 2, amount: 120000, expense_date: '2026-10-10' }] },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('closes without sending anything when every template is marked as not applicable', () => {
        renderPage({ pendingTemplates: [template(1)] });
        fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
        const dialog = screen.getByRole('dialog');

        fireEvent.click(within(dialog).getByLabelText('No aplica'));
        fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar gastos' }));

        expect(router.post).not.toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('lets the amount of a template be adjusted before registering', () => {
        renderPage({ pendingTemplates: [template(1)] });
        fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
        const dialog = screen.getByRole('dialog');

        fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: '150000' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar gastos' }));

        expect(vi.mocked(router.post).mock.calls[0][1]).toMatchObject({ expenses: [{ amount: 150000 }] });
    });
});
