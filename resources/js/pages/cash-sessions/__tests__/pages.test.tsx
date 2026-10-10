/** Characterization tests for the cash history, the session detail and the close form: pin today's behavior before the redesign. */
import { router } from '@inertiajs/react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Close from '../close';
import Index from '../index';
import Show from '../show';

const env = vi.hoisted(() => ({
    wide: true,
    post: vi.fn(),
    errors: {} as Record<string, string>,
    printer: { status: 'idle', selectedPrinter: '', printCashSession: vi.fn() } as {
        status: string;
        selectedPrinter: string;
        printCashSession: ReturnType<typeof vi.fn>;
    },
}));

vi.mock('@inertiajs/react', async () => {
    const React = await import('react');
    return {
        router: { get: vi.fn(), visit: vi.fn(), post: vi.fn() },
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
                post: (url: string, options?: unknown) => env.post(url, options, snapshot.current),
            };
        },
    };
});
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/hooks/use-polling', () => ({ usePolling: vi.fn() }));
vi.mock('@/hooks/use-printer', () => ({ usePrinter: () => env.printer }));

const text = (node: HTMLElement) => (node.textContent ?? '').replace(/\s/g, ' ');

const session = (overrides: Record<string, unknown> = {}) => ({
    id: 7,
    status: 'closed',
    opened_at: '2026-10-05T13:00:00Z',
    closed_at: '2026-10-05T21:30:00Z',
    opening_amount: 100000,
    total_sales_cash: 250000,
    total_sales_card: 120000,
    total_sales_transfer: 80000,
    total_sales_other: 0,
    total_refunds_cash: 15000,
    expected_cash: 360000,
    closing_amount_declared: 355000,
    discrepancy: -5000,
    branch: { id: 1, name: 'Centro' },
    opened_by: { id: 2, name: 'Carlos' },
    closed_by: { id: 2, name: 'Carlos' },
    ...overrides,
});

const paginated = (data: unknown[], extra: Record<string, unknown> = {}) =>
    ({ data, links: [], current_page: 1, from: 1, to: data.length, total: data.length, last_page: 1, ...extra }) as never;

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
    env.printer = { status: 'idle', selectedPrinter: '', printCashSession: vi.fn() };
});

describe('Cash history', () => {
    const branches = [
        { id: 1, name: 'Centro' },
        { id: 2, name: 'Norte' },
    ];
    const renderIndex = (data: unknown[], filters = {}, branchList: unknown[] = branches, extra: Record<string, unknown> = {}) =>
        render(<Index sessions={paginated(data, extra)} filters={filters} availableBranches={branchList as never} />);

    it('lists each session with branch, cashier, dates, opening amount, total sales, difference and state', () => {
        renderIndex([session()]);

        const row = text(within(screen.getByRole('table')).getAllByRole('row')[1]);
        expect(row).toContain('#7');
        expect(row).toContain('Centro');
        expect(row).toContain('Carlos');
        expect(row).toContain('5 de oct de 2026');
        expect(row).toContain('$ 100.000');
        expect(row).toContain('$ 450.000');
        expect(row).toContain('-$ 5.000');
        expect(row).toContain('Cerrada');
    });

    it('shows an open session without difference and marks a positive difference with a plus', () => {
        renderIndex([session({ status: 'open', closed_at: null, discrepancy: null }), session({ id: 8, discrepancy: 3000 })]);

        const rows = within(screen.getByRole('table')).getAllByRole('row');
        expect(text(rows[1])).toContain('Abierta');
        expect(text(rows[1])).toContain('—');
        expect(text(rows[2])).toContain('+$ 3.000');
    });

    it('colors the difference: green when it balances, red when short, amber when over', () => {
        renderIndex([session({ discrepancy: 0 }), session({ id: 8, discrepancy: -1 }), session({ id: 9, discrepancy: 1 })]);

        const cells = within(screen.getByRole('table'))
            .getAllByRole('row')
            .slice(1)
            .map((row) => within(row).getAllByRole('cell')[7].className);
        expect(cells[0]).toContain('text-green-600');
        expect(cells[1]).toContain('text-red-600');
        expect(cells[2]).toContain('text-amber-600');
    });

    it('opens a session from its table row', () => {
        renderIndex([session()]);

        fireEvent.click(within(screen.getByRole('table')).getAllByRole('row')[1]);

        expect(router.visit).toHaveBeenLastCalledWith('/cash-sessions.show/7');
    });

    it('lists cards on phones with sales, state and difference, opening the session on tap', () => {
        env.wide = false;
        renderIndex([session(), session({ id: 8, status: 'open', closed_at: null, discrepancy: null }), session({ id: 9, discrepancy: 0 })]);

        expect(screen.queryByRole('table')).not.toBeInTheDocument();
        const [closed, opened, balanced] = within(screen.getByRole('list', { name: '3 turno(s)' })).getAllByRole('listitem');
        expect(text(closed)).toContain('#7');
        expect(text(closed)).toContain('$ 450.000');
        expect(text(closed)).toContain('Faltante -$ 5.000');
        expect(text(closed)).toContain('Cierre:');
        expect(text(opened)).toContain('Abierta');
        expect(text(opened)).not.toContain('Cierre:');
        expect(text(balanced)).toContain('Cuadra');

        fireEvent.click(within(closed).getByRole('button'));
        expect(router.visit).toHaveBeenCalledWith('/cash-sessions.show/7');
    });

    it('folds the filters on phones and counts the active ones', () => {
        env.wide = false;
        renderIndex([session()], { date_from: '2026-10-01', branch_id: '2' });

        expect(document.querySelector('input[type="date"]')).toBeNull();
        const toggle = screen.getByRole('button', { name: /Filtros/ });
        expect(text(toggle)).toContain('2');

        fireEvent.click(toggle);

        expect(document.querySelectorAll('input[type="date"]')).toHaveLength(2);
        expect(screen.getByRole('button', { name: 'Filtrar' })).toBeInTheDocument();
    });

    it('says so when there are no sessions', () => {
        renderIndex([]);

        expect(screen.getByText('No hay sesiones registradas')).toBeInTheDocument();
    });

    it('filters by dates and branch, sending undefined for what is empty', () => {
        renderIndex([session()]);
        const [from, to] = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];

        fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }));
        expect(router.get).toHaveBeenLastCalledWith(
            '/cash-sessions.index',
            { date_from: undefined, date_to: undefined, branch_id: undefined },
            { preserveState: true },
        );

        fireEvent.change(from, { target: { value: '2026-10-01' } });
        fireEvent.change(to, { target: { value: '2026-10-09' } });
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
        fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }));
        expect(router.get).toHaveBeenLastCalledWith(
            '/cash-sessions.index',
            { date_from: '2026-10-01', date_to: '2026-10-09', branch_id: '2' },
            { preserveState: true },
        );
    });

    it('clears the filters and reloads without keeping state', () => {
        renderIndex([session()], { date_from: '2026-10-01', branch_id: '2' });

        fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));

        expect(router.get).toHaveBeenCalledWith('/cash-sessions.index', {}, { preserveState: false });
        expect((document.querySelector('input[type="date"]') as HTMLInputElement).value).toBe('');
    });

    it('offers the branch filter only with several branches', () => {
        const { unmount } = renderIndex([session()], {}, [branches[0]]);
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
        unmount();

        renderIndex([session()]);
        expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('pages through the history when there is more than one page', () => {
        renderIndex([session()], {}, branches, {
            last_page: 2,
            total: 25,
            from: 1,
            to: 20,
            links: [
                { url: null, label: '&laquo; Previous', active: false },
                { url: '/cash-sessions?page=1', label: '1', active: true },
                { url: '/cash-sessions?page=2', label: '2', active: false },
                { url: '/cash-sessions?page=2', label: 'Next &raquo;', active: false },
            ],
        });

        expect(screen.getByText(/Mostrando 1 a 20 de 25 turnos/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '2' }));
        expect(router.visit).toHaveBeenCalledWith('/cash-sessions?page=2', expect.any(Object));
    });
});

describe('Cash session detail', () => {
    const salesDetail = [
        { method: 'cash', name: 'Efectivo', count: 5, total: 250000 },
        { method: 'transfer', name: 'Transferencia', count: 2, total: 80000 },
    ];
    const movements = [
        { id: 1, type: 'cash_in', concept: 'Abono cliente', amount: 20000, user: { id: 2, name: 'Carlos' } },
        { id: 2, type: 'cash_out', concept: 'Domicilio', amount: 7000, user: { id: 2, name: 'Carlos' } },
    ];

    const renderShow = (overrides: Record<string, unknown> = {}, extra: { isBlind?: boolean; movements?: unknown[]; salesDetail?: unknown[] } = {}) =>
        render(
            <Show
                session={session(overrides) as never}
                movements={(extra.movements ?? movements) as never}
                salesDetail={(extra.salesDetail ?? salesDetail) as never}
                isBlind={extra.isBlind ?? false}
            />,
        );

    it('shows the shift with branch, cashier, dates, duration and state', () => {
        renderShow();

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Turno #7');
        const page = text(document.body);
        expect(page).toContain('SucursalCentro');
        expect(page).toContain('CajeroCarlos');
        expect(page).toContain('Apertura5 de oct de 2026');
        expect(page).toContain('Cierre5 de oct de 2026');
        expect(page).toContain('Duración8h 30m');
        expect(screen.getByText('Cerrada')).toBeInTheDocument();
    });

    it('shows an open shift without closing time or duration', () => {
        renderShow({ status: 'open', closed_at: null });

        expect(screen.getByText('Abierta')).toBeInTheDocument();
        expect(text(document.body)).toContain('Duración—');
        expect(screen.queryByText('Cierre')).not.toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'Resultado del cuadre' })).not.toBeInTheDocument();
    });

    it('lists the sales by payment method with their totals and the grand total', () => {
        renderShow();

        const table = text(screen.getByRole('table'));
        expect(table).toContain('Efectivo');
        expect(table).toContain('$ 250.000');
        expect(table).toContain('Transferencia');
        expect(table).toContain('$ 330.000');
    });

    it('says so when there were no sales', () => {
        renderShow({}, { salesDetail: [] });

        expect(screen.getByText('Sin ventas en este turno')).toBeInTheDocument();
    });

    it('lists the manual movements with their sign, concept and who made them', () => {
        renderShow();

        const page = text(document.body);
        expect(page).toContain('INGRESO');
        expect(page).toContain('Abono cliente');
        expect(page).toContain('+$ 20.000');
        expect(page).toContain('EGRESO');
        expect(page).toContain('-$ 7.000');
        expect(page).toContain('Carlos');
    });

    it('shows the cash reconciliation of a closed shift with the difference', () => {
        renderShow();

        const page = text(document.body);
        expect(page).toContain('Cuadre de caja');
        expect(page).toContain('+ Fondo inicial$ 100.000');
        expect(page).toContain('+ Ventas en efectivo$ 250.000');
        expect(page).toContain('+ Ingresos manuales+$ 20.000');
        expect(page).toContain('− Egresos manuales-$ 7.000');
        expect(page).toContain('− Devoluciones efectivo-$ 15.000');
        expect(page).toContain('= Efectivo esperado$ 360.000');
        expect(page).toContain('Efectivo contado$ 355.000');
        expect(page).toContain('Diferencia-$ 5.000');
    });

    it('lists the other payment methods only when they have sales', () => {
        const { unmount } = renderShow();
        expect(text(document.body)).toContain('Otros métodos');
        expect(text(document.body)).toContain('Tarjeta$ 120.000');
        expect(text(document.body)).toContain('Transferencia$ 80.000');
        expect(text(document.body)).not.toContain('Otro$');
        unmount();

        renderShow({ total_sales_card: 0, total_sales_transfer: 0, total_sales_other: 0 });
        expect(text(document.body)).not.toContain('Otros métodos');
    });

    it('highlights the result of a closed shift: short, balanced or over', () => {
        const { unmount } = renderShow();
        expect(text(screen.getByRole('region', { name: 'Resultado del cuadre' }))).toContain('-$ 5.000');
        expect(text(screen.getByRole('region', { name: 'Resultado del cuadre' }))).toContain('Faltante');
        unmount();

        const { unmount: again } = renderShow({ discrepancy: 0 });
        expect(text(screen.getByRole('region', { name: 'Resultado del cuadre' }))).toContain('Cuadra');
        again();

        renderShow({ discrepancy: 2000 });
        expect(text(screen.getByRole('region', { name: 'Resultado del cuadre' }))).toContain('+$ 2.000');
        expect(text(screen.getByRole('region', { name: 'Resultado del cuadre' }))).toContain('Sobrante');
    });

    it('does not show the reconciliation while the shift is open', () => {
        renderShow({ status: 'open', closed_at: null });

        expect(text(document.body)).not.toContain('Cuadre de caja');
    });

    it('hides every amount from a blind user, but not the counts', () => {
        renderShow(
            { status: 'open', closed_at: null },
            {
                isBlind: true,
                salesDetail: [{ method: 'cash', name: 'Efectivo', count: 5 }],
                movements: [{ id: 1, type: 'cash_out', concept: 'Domicilio', user: { id: 2, name: 'Carlos' } }],
            },
        );

        const page = text(document.body);
        expect(page).toContain('Efectivo');
        expect(page).toContain('Domicilio');
        expect(page).not.toMatch(/\$\s?\d/);
        expect(screen.queryByRole('columnheader', { name: 'Total' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Imprimir/ })).not.toBeInTheDocument();
    });

    it('goes back to the history', () => {
        renderShow();

        fireEvent.click(screen.getByRole('button', { name: 'Historial' }));

        expect(router.visit).toHaveBeenCalledWith('/cash-sessions.index');
    });

    describe('printing', () => {
        afterEach(() => vi.restoreAllMocks());

        it('uses the browser print dialog when the printer is not connected', () => {
            const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
            renderShow();

            fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }));

            expect(print).toHaveBeenCalledTimes(1);
            expect(env.printer.printCashSession).not.toHaveBeenCalled();
        });

        it('sends the report to the connected printer', async () => {
            env.printer = { status: 'connected', selectedPrinter: 'Epson', printCashSession: vi.fn().mockResolvedValue(undefined) };
            const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
            renderShow();

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }));
            });

            expect(env.printer.printCashSession).toHaveBeenCalledWith(7);
            expect(print).not.toHaveBeenCalled();
        });

        it('falls back to the browser print dialog when the printer fails', async () => {
            env.printer = { status: 'connected', selectedPrinter: 'Epson', printCashSession: vi.fn().mockRejectedValue(new Error('sin papel')) };
            const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
            renderShow();

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }));
            });

            expect(print).toHaveBeenCalledTimes(1);
        });
    });
});

describe('Close cash session', () => {
    const open = session({ status: 'open', closed_at: null, opened_at: '2026-10-10T13:00:00Z' });
    const summary = [{ method: 'cash', name: 'Efectivo', count: 5, total: 250000 }];
    const manual = [
        { id: 1, type: 'cash_in', concept: 'Abono cliente', notes: 'Ana', amount: 20000 },
        { id: 2, type: 'cash_out', concept: 'Domicilio', notes: null, amount: 7000 },
    ];

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-10T15:05:00Z'));
    });
    afterEach(() => vi.useRealTimers());

    const renderClose = (overrides: Record<string, unknown> = {}) =>
        render(
            <Close
                session={open as never}
                salesSummary={summary}
                movements={manual as never}
                isBlind={false}
                totalSales={250000}
                expectedCash={363000}
                creditPaymentsTotal={0}
                creditPaymentsCount={0}
                {...(overrides as object)}
            />,
        );

    it('shows the shift, how long it has been open, the sales and the expected cash', () => {
        renderClose();

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cierre de Caja — Turno #7');
        expect(text(document.body)).toContain('Duración: 2h 5m');
        expect(text(screen.getByRole('table'))).toContain('Total ventas');
        expect(text(screen.getByRole('table'))).toContain('$ 250.000');
        expect(text(document.body)).toContain('Efectivo esperado en caja:$ 363.000');
    });

    it('lists the manual movements with their notes and the totals in and out', () => {
        renderClose();

        const page = text(document.body);
        expect(page).toContain('Abono cliente');
        expect(page).toContain('· Ana');
        expect(page).toContain('Ingresos manuales+$ 20.000');
        expect(page).toContain('Egresos manuales-$ 7.000');
    });

    it('shows credit payments as an amount, or as a count for a blind user', () => {
        const { unmount } = renderClose({ creditPaymentsTotal: 20000 });
        expect(text(document.body)).toContain('Abonos de crédito');
        expect(text(document.body)).toContain('$ 20.000');
        unmount();

        renderClose({ isBlind: true, creditPaymentsTotal: null, creditPaymentsCount: 1, expectedCash: null, totalSales: null });
        expect(text(document.body)).toContain('1 abono');
        expect(text(document.body)).not.toContain('Efectivo esperado en caja');
    });

    it('closes with the amount typed, sending it as a number-like string with the notes', () => {
        renderClose();
        const amount = screen.getByText('Efectivo contado físicamente *').parentElement?.querySelector('input') as HTMLInputElement;

        fireEvent.change(amount, { target: { value: '355000' } });
        fireEvent.change(document.querySelector('textarea') as HTMLTextAreaElement, { target: { value: 'Faltaron 8 mil' } });
        fireEvent.submit(screen.getByRole('button', { name: 'Confirmar cierre de caja' }).closest('form') as HTMLFormElement);

        expect(env.post).toHaveBeenCalledWith('/cash-sessions.close/7', undefined, {
            closing_amount_declared: '355000',
            closing_notes: 'Faltaron 8 mil',
        });
    });

    it('counts by denomination and uses the total as the declared amount', () => {
        renderClose();

        fireEvent.click(screen.getByRole('button', { name: 'Contar por denominación' }));
        const countFor = (amount: string) => screen.getByLabelText(new RegExp(`^Billetes de \\$\\s${amount}$`)) as HTMLInputElement;
        fireEvent.change(countFor('100\\.000'), { target: { value: '2' } });
        fireEvent.change(countFor('50\\.000'), { target: { value: '3' } });
        fireEvent.change(countFor('1\\.000'), { target: { value: '5' } });
        const coins = screen.getByText('Monedas').parentElement?.querySelector('input') as HTMLInputElement;
        fireEvent.change(coins, { target: { value: '2500' } });

        expect(text(document.body)).toContain('Total contado:$ 357.500');
        fireEvent.click(screen.getByRole('button', { name: /Usar \$\s357\.500 como monto contado/ }));

        expect(text(document.body)).toContain('Monto a declarar: $ 357.500');
        fireEvent.submit(screen.getByRole('button', { name: 'Confirmar cierre de caja' }).closest('form') as HTMLFormElement);
        expect(env.post.mock.calls[0][2]).toMatchObject({ closing_amount_declared: '357500' });
    });

    it('does not let a negative count reduce the total and can go back to the direct amount', () => {
        renderClose();
        fireEvent.click(screen.getByRole('button', { name: 'Contar por denominación' }));

        fireEvent.change(screen.getByLabelText(/^Billetes de \$\s1\.000$/), { target: { value: '-3' } });
        expect(text(document.body)).toContain('Total contado:$ 0');

        fireEvent.click(screen.getByRole('button', { name: 'Monto directo' }));
        expect(screen.getByText('Efectivo contado físicamente *')).toBeInTheDocument();
    });

    it('always shows what will be declared, and warns when a count has not been used yet', () => {
        renderClose();
        expect(text(document.body)).toContain('A declarar—');

        fireEvent.click(screen.getByRole('button', { name: 'Contar por denominación' }));
        fireEvent.change(screen.getByLabelText(/^Billetes de \$\s10\.000$/), { target: { value: '4' } });
        expect(screen.getByRole('status')).toHaveTextContent(/Contaste \$\s40\.000, pero aún no lo usas/);
        expect(text(document.body)).toContain('A declarar—');

        fireEvent.click(screen.getByRole('button', { name: /Usar \$\s40\.000 como monto contado/ }));
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(text(document.body)).toContain('A declarar$ 40.000');
    });

    it('shows the server error of the declared amount', () => {
        env.errors = { closing_amount_declared: 'El monto contado es obligatorio.' };
        renderClose();

        expect(screen.getByText('El monto contado es obligatorio.')).toBeInTheDocument();
    });

    it('cancels back to the POS', () => {
        renderClose();

        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(router.visit).toHaveBeenCalledWith('/pos.index');
    });
});
