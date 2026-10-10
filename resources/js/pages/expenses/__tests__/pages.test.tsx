/** Characterization tests for the expenses list, the expense categories and the recurring (fixed) expenses: pin today's behavior before the redesign. */
import { router } from '@inertiajs/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import ExpenseCategories from '../categories';
import ExpensesIndex from '../index';
import ExpenseTemplates from '../templates';

const env = vi.hoisted(() => ({
    wide: true,
    post: vi.fn(),
    put: vi.fn(),
    errors: {} as Record<string, string>,
    pageErrors: {} as Record<string, string>,
}));

vi.mock('@inertiajs/react', async () => {
    const React = await import('react');
    return {
        router: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), reload: vi.fn() },
        Head: () => null,
        Link: 'a',
        usePage: () => ({ props: { business: { brand_color: '#C4686F' }, errors: env.pageErrors } }),
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
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
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
const combos = () => screen.getAllByRole('combobox') as HTMLSelectElement[];
const buttons = (name: string) => screen.getAllByRole('button', { name });

const category = (id: number, name: string, overrides: Record<string, unknown> = {}) => ({
    id,
    name,
    icon: null,
    color: 'red',
    is_system: false,
    ...overrides,
});

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
    name: `Gasto fijo ${id}`,
    reference_amount: 120000,
    due_day: 5,
    is_active: true,
    due_status: 'pending',
    category: category(2, 'Servicios', { color: 'blue' }),
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
    env.pageErrors = {};
});

describe('Expenses list', () => {
    const cats = [category(1, 'Arriendo'), category(2, 'Servicios', { color: 'blue' })];
    const branches = [
        { id: 1, name: 'Centro' },
        { id: 2, name: 'Norte' },
    ];

    function renderIndex(data: unknown[], extra: Record<string, unknown> = {}) {
        const { filters, pendingTemplates, branchList, ...paging } = {
            filters: {},
            pendingTemplates: [] as unknown[],
            branchList: [] as unknown[],
            ...extra,
        };
        return render(
            <ExpensesIndex
                expenses={paginated(data, paging)}
                pendingTemplates={pendingTemplates as never}
                categories={cats as never}
                branches={branchList as never}
                currentMonth="octubre 2026"
                filters={filters as never}
                userBranchId={1}
            />,
        );
    }

    it('lists each expense with date, category, description, amount and its origin', () => {
        renderIndex([expense(1), expense(2, { description: null, category: null, template: template(1) })]);

        const rows = within(screen.getByRole('table')).getAllByRole('row');
        expect(text(rows[1])).toContain('05/10/2026');
        expect(text(rows[1])).toContain('Arriendo');
        expect(text(rows[1])).toContain('Arriendo local');
        expect(text(rows[1])).toContain('$ 800.000');
        expect(text(rows[1])).toContain('Puntual');
        expect(text(rows[2])).toContain('—');
        expect(text(rows[2])).toContain('Recurrente');
        expect(screen.getByText('Gastos (2)')).toBeInTheDocument();
    });

    it('sums what is shown and says how many there are in total', () => {
        renderIndex([expense(1), expense(2, { amount: 200000 })], { total: 7 });

        expect(text(document.body)).toContain('Total mostrado:$ 1.000.000');
        expect(text(document.body)).toContain('7 gastos en total');
    });

    it('invites to register the first expense when there are none, and to clear filters when a filter hides them all', () => {
        const { unmount } = renderIndex([]);
        expect(screen.getAllByText('Sin gastos registrados').length).toBeGreaterThan(0);
        fireEvent.click(buttons('Registrar primer gasto')[0]);
        expect(screen.getByRole('dialog', { name: 'Registrar gasto' })).toBeInTheDocument();
        unmount();

        renderIndex([], { filters: { category: '1' } });
        expect(screen.getAllByText('No se encontraron gastos con los filtros seleccionados').length).toBeGreaterThan(0);
        fireEvent.click(buttons('Limpiar filtros')[0]);
        expect(router.get).toHaveBeenCalledWith('/expenses');
    });

    it('offers the fixed expenses registration only when some are pending, with a banner', () => {
        const { unmount } = renderIndex([expense(1)]);
        expect(screen.queryByRole('button', { name: 'Registrar gastos fijos' })).not.toBeInTheDocument();
        unmount();

        renderIndex([expense(1)], { pendingTemplates: [template(1), template(2)] });
        expect(screen.getByRole('button', { name: 'Registrar gastos fijos' })).toBeInTheDocument();
        expect(text(document.body)).toContain('Tienes 2 gastos fijos sin registrar para octubre 2026.');
        expect(screen.getByRole('button', { name: 'Registrar ahora' })).toBeInTheDocument();
    });

    it('lists swipeable rows on phones with the full date, the origin and the amount', () => {
        env.wide = false;
        renderIndex([expense(1), expense(2, { template: template(1), description: 'Internet' })]);

        expect(screen.queryByRole('table')).not.toBeInTheDocument();
        const list = screen.getByRole('list', { name: '2 gasto(s)' });
        expect(text(list)).toContain('05/10/2026 · Arriendo');
        expect(text(list)).toContain('Puntual');
        expect(text(list)).toContain('Recurrente');
        expect(text(list)).toContain('$ 800.000');
    });

    it('keeps the filters folded on phones until there is an active one, and counts them', () => {
        env.wide = false;
        const { unmount } = renderIndex([expense(1)]);
        expect(screen.queryByText('Fecha desde')).not.toBeInTheDocument();
        fireEvent.click(screen.getByText('Filtros'));
        expect(screen.getByText('Fecha desde')).toBeInTheDocument();
        unmount();

        renderIndex([expense(1)], { filters: { category: '2', start_date: '2026-10-01' } });
        expect(screen.getByText('Fecha desde')).toBeInTheDocument();
        expect(screen.getByText('2 activos')).toBeInTheDocument();
    });

    it('filters by category, branch and dates, sending empty strings for "all"', () => {
        renderIndex([expense(1)], { branchList: branches, filters: { category: '1' } });
        const [category, branch] = combos();
        const [from, to] = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];

        fireEvent.change(category, { target: { value: '2' } });
        fireEvent.change(branch, { target: { value: '2' } });
        fireEvent.change(from, { target: { value: '2026-10-01' } });
        fireEvent.change(to, { target: { value: '2026-10-09' } });
        fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }));

        expect(router.get).toHaveBeenCalledWith(
            '/expenses',
            { category: '2', branch: '2', start_date: '2026-10-01', end_date: '2026-10-09' },
            { preserveState: true, preserveScroll: true },
        );

        fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
        expect(router.get).toHaveBeenLastCalledWith('/expenses');
    });

    it('registers an expense from a dialog with every field', () => {
        renderIndex([expense(1)]);

        fireEvent.click(screen.getByRole('button', { name: 'Registrar gasto' }));
        const dialog = screen.getByRole('dialog', { name: 'Registrar gasto' });
        fireEvent.change(within(dialog).getByPlaceholderText('Ej: Arriendo local'), { target: { value: 'Internet' } });
        fireEvent.change(within(dialog).getByPlaceholderText('0'), { target: { value: '90000' } });
        fireEvent.change(within(dialog).getAllByRole('combobox')[0], { target: { value: '2' } });
        fireEvent.change(within(dialog).getByPlaceholderText('Observaciones adicionales...'), { target: { value: 'Mes de octubre' } });
        fireEvent.submit(within(dialog).getByRole('button', { name: 'Registrar' }).closest('form') as HTMLFormElement);

        expect(env.post).toHaveBeenCalledWith('/expenses', expect.objectContaining({ preserveScroll: true }), {
            expense_category_id: '2',
            description: 'Internet',
            amount: 90000,
            expense_date: new Date().toISOString().slice(0, 10),
            branch_id: '1',
            notes: 'Mes de octubre',
        });
    });

    it('edits an expense from a prefilled dialog with a PUT', () => {
        renderIndex([expense(1, { notes: 'Nota' })]);

        fireEvent.click(buttons('Editar')[0]);
        const dialog = screen.getByRole('dialog', { name: 'Editar gasto' });
        expect((within(dialog).getByPlaceholderText('Ej: Arriendo local') as HTMLInputElement).value).toBe('Arriendo local');
        fireEvent.submit(within(dialog).getByRole('button', { name: 'Guardar cambios' }).closest('form') as HTMLFormElement);

        expect(env.put).toHaveBeenCalledWith('/expenses/1', expect.objectContaining({ preserveScroll: true }), {
            expense_category_id: '1',
            description: 'Arriendo local',
            amount: 800000,
            expense_date: '2026-10-05',
            branch_id: '1',
            notes: 'Nota',
        });
    });

    it('shows the validation errors of the server inside the dialog', () => {
        env.errors = { amount: 'El monto debe ser mayor a 0.', expense_date: 'Fecha inválida.' };
        renderIndex([expense(1)]);

        fireEvent.click(screen.getByRole('button', { name: 'Registrar gasto' }));

        expect(screen.getByText('El monto debe ser mayor a 0.')).toBeInTheDocument();
        expect(screen.getByText('Fecha inválida.')).toBeInTheDocument();
    });

    it('registers the pending fixed expenses with each reference amount, skipping those marked as not applicable', () => {
        renderIndex([expense(1)], { pendingTemplates: [template(1), template(2, { reference_amount: 90000 })] });

        fireEvent.click(screen.getByRole('button', { name: 'Registrar gastos fijos' }));
        const dialog = screen.getByRole('dialog', { name: 'Gastos fijos de octubre 2026' });
        fireEvent.click(within(dialog).getAllByLabelText('No aplica')[1]);
        fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar gastos' }));

        // Fixed in the redesign: this page used to post to '/expenses/batch' (no such route); it now posts the list to '/expenses' like the dashboard.
        expect(router.post).toHaveBeenCalledWith(
            '/expenses',
            {
                expenses: [
                    {
                        expense_template_id: 1,
                        branch_id: 1,
                        expense_category_id: 2,
                        amount: 120000,
                        expense_date: new Date().toISOString().slice(0, 10),
                    },
                ],
            },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('deletes an expense only after confirming, sending the reason', () => {
        renderIndex([expense(1)]);

        fireEvent.click(buttons('Eliminar')[0]);
        const dialog = screen.getByRole('dialog', { name: 'Eliminar gasto' });
        expect(text(dialog)).toContain('¿Eliminar Arriendo local por $ 800.000?');
        expect(router.delete).not.toHaveBeenCalled();
        fireEvent.change(within(dialog).getByPlaceholderText('¿Por qué se elimina?'), { target: { value: 'Duplicado' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

        expect(router.delete).toHaveBeenCalledWith(
            '/expenses/1',
            expect.objectContaining({ data: { deletion_reason: 'Duplicado' }, preserveScroll: true }),
        );
    });
});

describe('Expense categories', () => {
    const list = [category(1, 'Arriendo', { is_system: true }), category(2, 'Publicidad'), category(3, 'Transporte', { color: 'green' })];

    it('separates the categories of the system (locked) from the custom ones', () => {
        render(<ExpenseCategories categories={list as never} />);

        expect(screen.getByText('Categorías personalizadas (2)')).toBeInTheDocument();
        expect(screen.getByText('Categorías del sistema (1)')).toBeInTheDocument();
        expect(screen.getByText('Publicidad')).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: 'Editar' })).toHaveLength(2);
        expect(screen.getAllByRole('button', { name: 'Eliminar' })).toHaveLength(2);
    });

    it('invites to create the first custom category', () => {
        render(<ExpenseCategories categories={[list[0]] as never} />);

        expect(screen.getByText('No hay categorías personalizadas aún.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Crear la primera/ }));
        expect(screen.getByRole('dialog', { name: 'Nueva categoría' })).toBeInTheDocument();
    });

    it('creates a category with a name and a color, and confirms with a notification', () => {
        render(<ExpenseCategories categories={list as never} />);

        fireEvent.click(screen.getByRole('button', { name: /Nueva categoría/ }));
        const dialog = screen.getByRole('dialog', { name: 'Nueva categoría' });
        fireEvent.change(within(dialog).getByPlaceholderText('Ej: Publicidad'), { target: { value: 'Capacitación' } });
        fireEvent.click(within(dialog).getByTitle('Morado'));
        expect(text(dialog)).toContain('Seleccionado: Morado');
        fireEvent.submit(within(dialog).getByRole('button', { name: 'Crear' }).closest('form') as HTMLFormElement);

        expect(env.post).toHaveBeenCalledWith('/expense-categories', expect.objectContaining({ preserveScroll: true }), {
            name: 'Capacitación',
            color: 'purple',
        });
        (env.post.mock.calls[0][1] as { onSuccess: () => void }).onSuccess();
        expect(toast.success).toHaveBeenCalledWith('Categoría creada.');
    });

    it('edits a category from a prefilled dialog with a PUT', () => {
        render(<ExpenseCategories categories={list as never} />);

        fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
        const dialog = screen.getByRole('dialog', { name: 'Editar categoría' });
        expect((within(dialog).getByPlaceholderText('Ej: Publicidad') as HTMLInputElement).value).toBe('Publicidad');
        fireEvent.submit(within(dialog).getByRole('button', { name: 'Guardar cambios' }).closest('form') as HTMLFormElement);

        expect(env.put).toHaveBeenCalledWith('/expense-categories/2', expect.any(Object), { name: 'Publicidad', color: 'red' });
        (env.put.mock.calls[0][1] as { onSuccess: () => void }).onSuccess();
        expect(toast.success).toHaveBeenCalledWith('Categoría actualizada.');
    });

    it('shows the name error that comes with the page', () => {
        env.pageErrors = { name: 'Ya existe una categoría con ese nombre.' };
        render(<ExpenseCategories categories={list as never} />);

        fireEvent.click(screen.getByRole('button', { name: /Nueva categoría/ }));

        expect(screen.getByText('Ya existe una categoría con ese nombre.')).toBeInTheDocument();
    });

    it('deletes a custom category only after confirming, sending the reason', () => {
        render(<ExpenseCategories categories={list as never} />);

        fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
        const dialog = screen.getByRole('dialog', { name: 'Eliminar categoría' });
        expect(text(dialog)).toContain('¿Eliminar la categoría Publicidad? Los gastos asociados quedarán sin categoría.');
        fireEvent.change(within(dialog).getByPlaceholderText('¿Por qué se elimina?'), { target: { value: 'Ya no se usa' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

        expect(router.delete).toHaveBeenCalledWith(
            '/expense-categories/2',
            expect.objectContaining({ data: { deletion_reason: 'Ya no se usa' }, preserveScroll: true }),
        );
        (vi.mocked(router.delete).mock.calls[0][1] as { onSuccess: () => void }).onSuccess();
        expect(toast.success).toHaveBeenCalledWith('Categoría eliminada.');
    });
});

describe('Recurring expenses', () => {
    const cats = [category(1, 'Arriendo'), category(2, 'Servicios', { color: 'blue' })];
    const branches = [
        { id: 1, name: 'Centro' },
        { id: 2, name: 'Norte' },
    ];
    const renderTemplates = (templates: unknown[], branchList: unknown[] = []) =>
        render(
            <ExpenseTemplates
                templates={templates as never}
                categories={cats as never}
                branches={branchList as never}
                userBranchId={1}
                currentDay={10}
            />,
        );

    it('lists each fixed expense with category, reference amount, due day and state', () => {
        renderTemplates([template(1), template(2, { category: null, due_day: null, due_status: 'registered' })]);

        const rows = within(screen.getByRole('table')).getAllByRole('row');
        expect(text(rows[1])).toContain('Gasto fijo 1');
        expect(text(rows[1])).toContain('Servicios');
        expect(text(rows[1])).toContain('$ 120.000');
        expect(text(rows[1])).toContain('Día 5');
        expect(text(rows[1])).toContain('Pendiente');
        expect(text(rows[2])).toContain('—');
        expect(text(rows[2])).toContain('Registrado');
        expect(screen.getByText('Mis gastos fijos (2)')).toBeInTheDocument();
    });

    it.each([
        ['registered', 'Registrado'],
        ['overdue', 'Vencido'],
        ['due_soon', 'Vence pronto'],
        ['inactive', 'Pausada'],
        ['pending', 'Pendiente'],
    ])('names the %s state as %s', (due_status, label) => {
        renderTemplates([template(1, { due_status })]);

        expect(within(screen.getByRole('table')).getByText(label)).toBeInTheDocument();
    });

    it('offers to register the payment, to undo it once registered, and nothing for a paused one', () => {
        const { unmount } = renderTemplates([template(1)]);
        expect(screen.getAllByRole('button', { name: 'Registrar pago' }).length).toBeGreaterThan(0);
        unmount();

        const { unmount: again } = renderTemplates([template(1, { due_status: 'registered' })]);
        expect(screen.getAllByRole('button', { name: 'Des-registrar pago de este mes' }).length).toBeGreaterThan(0);
        expect(screen.queryByRole('button', { name: 'Registrar pago' })).not.toBeInTheDocument();
        again();

        renderTemplates([template(1, { due_status: 'inactive' })]);
        expect(screen.queryByRole('button', { name: 'Registrar pago' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Des-registrar pago de este mes' })).not.toBeInTheDocument();
    });

    it('invites to add the first fixed expense', () => {
        renderTemplates([]);

        expect(screen.getByText('Sin gastos fijos configurados')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Agregar primer gasto fijo/ }));
        expect(screen.getByRole('dialog', { name: 'Nuevo gasto fijo' })).toBeInTheDocument();
    });

    it('creates a fixed expense with every field', () => {
        renderTemplates([template(1)], branches);

        fireEvent.click(screen.getByRole('button', { name: /Nuevo gasto fijo/ }));
        const dialog = screen.getByRole('dialog', { name: 'Nuevo gasto fijo' });
        fireEvent.change(within(dialog).getByPlaceholderText('Ej: Arriendo local'), { target: { value: 'Internet' } });
        fireEvent.change(within(dialog).getAllByRole('combobox')[0], { target: { value: '2' } });
        fireEvent.change(within(dialog).getByPlaceholderText('0'), { target: { value: '90000' } });
        fireEvent.change(within(dialog).getAllByRole('combobox')[1], { target: { value: '15' } });
        fireEvent.submit(within(dialog).getByRole('button', { name: 'Crear gasto fijo' }).closest('form') as HTMLFormElement);

        expect(env.post).toHaveBeenCalledWith('/expense-templates', expect.objectContaining({ preserveScroll: true }), {
            name: 'Internet',
            expense_category_id: '2',
            reference_amount: 90000,
            due_day: '15',
            branch_id: '1',
            is_active: true,
        });
    });

    it('edits a fixed expense, with the option to pause it', () => {
        renderTemplates([template(1)]);

        fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
        const dialog = screen.getByRole('dialog', { name: 'Editar gasto fijo' });
        fireEvent.click(within(dialog).getByLabelText('Activa'));
        fireEvent.submit(within(dialog).getByRole('button', { name: 'Guardar cambios' }).closest('form') as HTMLFormElement);

        expect(env.put).toHaveBeenCalledWith(
            '/expense-templates/1',
            expect.any(Object),
            expect.objectContaining({ name: 'Gasto fijo 1', is_active: false, due_day: '5' }),
        );
    });

    it('registers the payment of a month from a prefilled dialog and confirms with a notification', () => {
        renderTemplates([template(1)]);

        fireEvent.click(screen.getAllByRole('button', { name: 'Registrar pago' })[0]);
        const dialog = screen.getByRole('dialog', { name: 'Registrar pago' });
        expect(text(dialog)).toContain('Gasto fijo 1');
        fireEvent.submit(within(dialog).getByRole('button', { name: 'Registrar pago' }).closest('form') as HTMLFormElement);

        expect(env.post).toHaveBeenCalledWith('/expenses', expect.objectContaining({ preserveScroll: true }), {
            expense_category_id: '2',
            description: 'Gasto fijo 1',
            amount: 120000,
            expense_date: new Date().toISOString().slice(0, 10),
            branch_id: '1',
            notes: '',
            expense_template_id: '1',
        });
        (env.post.mock.calls[0][1] as { onSuccess: () => void }).onSuccess();
        expect(toast.success).toHaveBeenCalledWith('Gasto registrado correctamente.');
    });

    it('undoes the payment of the month only after confirming', () => {
        renderTemplates([template(1, { due_status: 'registered' })]);

        fireEvent.click(screen.getAllByRole('button', { name: 'Des-registrar pago de este mes' })[0]);
        const dialog = screen.getByRole('dialog', { name: 'Des-registrar pago' });
        expect(text(dialog)).toContain('El gasto será eliminado.');
        expect(router.delete).not.toHaveBeenCalled();
        fireEvent.click(within(dialog).getByRole('button', { name: 'Des-registrar' }));

        expect(router.delete).toHaveBeenCalledWith('/expense-templates/1/unregister-month', expect.objectContaining({ preserveScroll: true }));
        (vi.mocked(router.delete).mock.calls[0][1] as { onSuccess: () => void }).onSuccess();
        expect(toast.success).toHaveBeenCalledWith('Pago des-registrado.');
    });

    it('deletes a fixed expense only after confirming, sending the reason', () => {
        renderTemplates([template(1)]);

        fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
        const dialog = screen.getByRole('dialog', { name: 'Eliminar gasto fijo' });
        fireEvent.change(within(dialog).getByPlaceholderText('¿Por qué se elimina?'), { target: { value: 'Ya no lo pago' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

        expect(router.delete).toHaveBeenCalledWith(
            '/expense-templates/1',
            expect.objectContaining({ data: { deletion_reason: 'Ya no lo pago' }, preserveScroll: true }),
        );
    });
});
