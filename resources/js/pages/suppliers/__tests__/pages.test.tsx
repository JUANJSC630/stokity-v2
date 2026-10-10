/** Characterization tests for the suppliers list, detail and forms: pin today's behavior before the redesign. */
import { router } from '@inertiajs/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Create from '../create';
import Edit from '../edit';
import Index from '../index';
import Show from '../show';

const env = vi.hoisted(() => ({
    post: vi.fn(),
    put: vi.fn(),
    errors: {} as Record<string, string>,
}));

vi.mock('@inertiajs/react', async () => {
    const React = await import('react');
    return {
        router: { visit: vi.fn(), delete: vi.fn(), reload: vi.fn() },
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
                put: (url: string, options?: unknown) => env.put(url, options, snapshot.current),
            };
        },
    };
});
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/hooks/use-polling', () => ({ usePolling: vi.fn() }));
vi.mock('@/hooks/use-scroll-to-error', () => ({ useScrollToError: vi.fn() }));
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
const combos = () => screen.getAllByRole('combobox') as HTMLSelectElement[];
const field = (id: string) => document.getElementById(id) as HTMLInputElement;
const typeInto = (id: string, value: string) => fireEvent.change(field(id), { target: { value } });

const supplier = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    branch_id: 1,
    name: `Proveedor ${id}`,
    nit: '900123456',
    contact_name: 'Juan Pérez',
    phone: '3101234567',
    email: 'ventas@proveedor.co',
    address: 'Cra 7 # 32-15',
    notes: null,
    status: true,
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-02T10:00:00Z',
    deleted_at: null,
    branch: { id: 1, name: 'Centro' },
    ...overrides,
});

const paginated = (data: unknown[]) => ({ data, links: [], current_page: 1, from: 1, to: data.length, total: data.length, last_page: 1 }) as never;

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
    vi.stubGlobal('route', (name: string, id?: number) => `/${name}${id ? `/${id}` : ''}`);
});

beforeEach(() => {
    vi.clearAllMocks();
    env.errors = {};
    window.history.replaceState({}, '', '/suppliers');
});

describe('Suppliers list', () => {
    const branches = [
        { id: 1, name: 'Centro' },
        { id: 2, name: 'Norte' },
    ];
    const renderIndex = (data: unknown[], filters = {}, branchList: unknown[] = branches) =>
        render(<Index suppliers={paginated(data)} branches={branchList as never} filters={filters} />);

    it('lists each supplier with NIT, contact, phone, email and state, linking to its detail', () => {
        renderIndex([supplier(1)]);

        const row = text(within(screen.getByRole('table')).getAllByRole('row')[1]);
        expect(row).toContain('Proveedor 1');
        expect(row).toContain('900123456');
        expect(row).toContain('Juan Pérez');
        expect(row).toContain('3101234567');
        expect(row).toContain('ventas@proveedor.co');
        expect(row).toContain('Activo');
        expect(document.querySelector('a[href="/suppliers.show/1"]')).not.toBeNull();
    });

    it('shows dashes for missing data and marks inactive suppliers', () => {
        renderIndex([supplier(1, { nit: null, contact_name: null, phone: null, email: null, status: false })]);

        const row = text(within(screen.getByRole('table')).getAllByRole('row')[1]);
        expect(row).toContain('Inactivo');
        expect(row.match(/-/g)?.length).toBeGreaterThanOrEqual(4);
    });

    it('shows cards on phones with the NIT only when there is one', () => {
        renderIndex([supplier(1), supplier(2, { nit: null, status: false })]);

        expect(screen.getAllByText('NIT:').length).toBe(1);
        expect(screen.getAllByText('Contacto:').length).toBe(2);
    });

    it('says so when there are no suppliers', () => {
        renderIndex([]);

        expect(screen.getByText('No se encontraron proveedores')).toBeInTheDocument();
    });

    it('links to the new supplier form', () => {
        renderIndex([supplier(1)]);

        expect(screen.getByRole('link', { name: /Nuevo Proveedor/ })).toHaveAttribute('href', '/suppliers.create');
    });

    it('searches on submit with a partial reload of the suppliers only', () => {
        renderIndex([supplier(1)]);

        const box = screen.getByPlaceholderText('Nombre, NIT, contacto, correo...');
        fireEvent.change(box, { target: { value: 'cueros' } });
        fireEvent.submit(box.closest('form') as HTMLFormElement);

        expect(router.visit).toHaveBeenCalledWith(
            '/suppliers?search=cueros',
            expect.objectContaining({ preserveState: true, preserveScroll: true, only: ['suppliers'] }),
        );
    });

    it('goes back to the full list when a search that is in the address is cleared', () => {
        window.history.replaceState({}, '', '/suppliers?search=cueros');
        renderIndex([supplier(1)], { search: 'cueros' });

        fireEvent.change(screen.getByPlaceholderText('Nombre, NIT, contacto, correo...'), { target: { value: '' } });

        expect(router.visit).toHaveBeenCalledWith('/suppliers?', expect.objectContaining({ only: ['suppliers'] }));
    });

    it('filters by state and by branch, and the filters add up', () => {
        renderIndex([supplier(1)]);
        const [status, branch] = combos();

        fireEvent.change(status, { target: { value: 'active' } });
        expect(vi.mocked(router.visit).mock.lastCall?.[0]).toBe('/suppliers?status=active');

        fireEvent.change(branch, { target: { value: '2' } });
        expect(vi.mocked(router.visit).mock.lastCall?.[0]).toBe('/suppliers?status=active&branch=2');
    });

    it('keeps the search text when a filter changes and shows the branch filter only with branches', () => {
        const { unmount } = renderIndex([supplier(1)], {}, []);
        expect(combos()).toHaveLength(1);
        unmount();

        renderIndex([supplier(1)]);
        fireEvent.change(screen.getByPlaceholderText('Nombre, NIT, contacto, correo...'), { target: { value: 'cueros' } });
        fireEvent.change(combos()[0], { target: { value: 'inactive' } });

        expect(vi.mocked(router.visit).mock.lastCall?.[0]).toBe('/suppliers?search=cueros&status=inactive');
    });
});

describe('Supplier detail', () => {
    const product = (id: number, overrides: Record<string, unknown> = {}) => ({
        id,
        name: `Collar ${id}`,
        code: `COL-00${id}`,
        stock: 12,
        pivot: { purchase_price: 18000, supplier_code: 'CP-77', is_default: id === 1 },
        ...overrides,
    });
    const movement = (id: number, overrides: Record<string, unknown> = {}) => ({
        id,
        type: 'ingreso',
        quantity: 24,
        unit_cost: 18000,
        reference: 'Factura #001',
        movement_date: '2026-10-05T10:00:00Z',
        product_id: 1,
        product: { id: 1, name: 'Collar 1' },
        ...overrides,
    });

    function renderShow(
        overrides: Record<string, unknown> = {},
        extra: { movements?: unknown[]; totalCost?: number; filters?: Record<string, string> } = {},
    ) {
        return render(
            <Show
                supplier={{ ...supplier(9), products: [product(1), product(2)], ...overrides } as never}
                movements={paginated(extra.movements ?? [movement(1)])}
                totalCost={extra.totalCost ?? 432000}
                filters={extra.filters ?? {}}
            />,
        );
    }

    it('shows the supplier with its data, and only the data it has', () => {
        const { unmount } = renderShow({ notes: 'Pago a 30 días' });
        const page = text(document.body);
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Detalle del Proveedor');
        expect(page).toContain('Proveedor 9');
        expect(page).toContain('NIT: 900123456');
        expect(page).toContain('Juan Pérez');
        expect(page).toContain('3101234567');
        expect(page).toContain('ventas@proveedor.co');
        expect(page).toContain('Cra 7 # 32-15');
        expect(page).toContain('Centro');
        expect(page).toContain('1 de sept de 2026');
        expect(page).toContain('Pago a 30 días');
        unmount();

        renderShow({ nit: null, contact_name: null, phone: null, email: null, address: null, notes: null, branch: null });
        const bare = text(document.body);
        expect(bare).not.toContain('NIT:');
        expect(bare).not.toContain('Contacto');
        expect(bare).not.toContain('Notas');
    });

    it('marks an inactive supplier', () => {
        renderShow({ status: false });

        expect(screen.getAllByText('Inactivo').length).toBeGreaterThan(0);
    });

    it('lists the linked products with supplier code, purchase price, stock and which is the default', () => {
        renderShow();

        const rows = within(screen.getAllByRole('table')[0]).getAllByRole('row');
        expect(text(rows[1])).toContain('Collar 1');
        expect(text(rows[1])).toContain('COL-001');
        expect(text(rows[1])).toContain('CP-77');
        expect(text(rows[1])).toContain('$ 18.000');
        expect(text(rows[1])).toContain('12');
        expect(text(rows[1])).toContain('Sí');
        expect(text(rows[2])).toContain('—');
        expect(text(document.body)).toContain('2 producto(s) asociado(s) a este proveedor');
        expect(document.querySelector('a[href="/products.show/1"]')).not.toBeNull();
    });

    it('says so when there are no linked products', () => {
        renderShow({ products: [] });

        expect(text(document.body)).toContain('Ningún producto asociado aún');
        expect(screen.getByText(/Sin productos\. Asocia productos/)).toBeInTheDocument();
    });

    it('lists the movements with type, product, quantity, cost and reference, and the total of purchases', () => {
        renderShow(
            {},
            { movements: [movement(1), movement(2, { type: 'supplier_return', product: null, product_id: 5, unit_cost: null, reference: null })] },
        );

        const table = screen.getAllByRole('table')[1];
        const rows = within(table).getAllByRole('row');
        expect(text(rows[1])).toContain('5 de oct de 2026');
        expect(text(rows[1])).toContain('Ingreso');
        expect(text(rows[1])).toContain('Collar 1');
        expect(text(rows[1])).toContain('24');
        expect(text(rows[1])).toContain('$ 18.000');
        expect(text(rows[1])).toContain('Factura #001');
        expect(text(rows[2])).toContain('Dev. a proveedor');
        expect(text(rows[2])).toContain('#5');
        expect(text(document.body)).toContain('Total compras: $ 432.000');
    });

    it('hides the total of purchases when there is none, and says so when there are no movements', () => {
        renderShow({}, { movements: [], totalCost: 0 });

        expect(text(document.body)).not.toContain('Total compras');
        expect(screen.getByText('Sin movimientos registrados con este proveedor.')).toBeInTheDocument();
    });

    it('filters the movements by date with a partial reload, and clears the filter', () => {
        const { unmount } = renderShow();
        expect(screen.queryByRole('button', { name: 'Limpiar' })).not.toBeInTheDocument();
        const [from, to] = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
        fireEvent.change(from, { target: { value: '2026-10-01' } });
        fireEvent.change(to, { target: { value: '2026-10-09' } });
        fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }));

        expect(router.visit).toHaveBeenCalledWith(
            '/suppliers/9?start_date=2026-10-01&end_date=2026-10-09',
            expect.objectContaining({ only: ['movements', 'totalCost', 'filters'] }),
        );
        unmount();

        renderShow({}, { filters: { start_date: '2026-10-01' } });
        fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
        expect(vi.mocked(router.visit).mock.lastCall?.[0]).toBe('/suppliers/9');
    });

    it('links back and to edit', () => {
        renderShow();

        expect(document.querySelector('a[href="/suppliers.index"]')).not.toBeNull();
        expect(document.querySelector('a[href="/suppliers.edit/9"]')).not.toBeNull();
    });

    it('deletes the supplier only after confirming, naming it', async () => {
        renderShow();

        fireEvent.click(screen.getByRole('button', { name: /Eliminar/ }));
        const dialog = await screen.findByRole('dialog');
        expect(text(dialog)).toContain('¿Eliminar al proveedor "Proveedor 9"?');
        expect(router.delete).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

        await vi.waitFor(() => expect(router.delete).toHaveBeenCalledWith('/suppliers.destroy/9'));
    });

    it('does not delete when the confirmation is cancelled', async () => {
        renderShow();
        fireEvent.click(screen.getByRole('button', { name: /Eliminar/ }));

        fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

        expect(router.delete).not.toHaveBeenCalled();
    });
});

describe('Supplier forms', () => {
    const branches = [
        { id: 1, name: 'Centro' },
        { id: 2, name: 'Norte' },
    ];

    it('starts a new supplier active, in the branch of the user, and shows the branch picker only with several branches', () => {
        const { unmount } = render(<Create branches={[branches[0]] as never} userBranchId={1} />);
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Crear Nuevo Proveedor');
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
        expect(screen.getByRole('switch', { name: 'Proveedor activo' })).toBeChecked();
        unmount();

        render(<Create branches={branches as never} userBranchId={null} />);
        expect(combos()[0].value).toBe('1');
    });

    it('posts the new supplier with every field', () => {
        render(<Create branches={branches as never} userBranchId={2} />);
        typeInto('name', 'Cueros SAS');
        typeInto('nit', '900.123.456-7');
        typeInto('contact_name', 'Juan Pérez');
        typeInto('phone', '310 123 4567');
        typeInto('email', 'ventas@cueros.co');
        typeInto('address', 'Cra 7');
        typeInto('notes', 'Pago a 30 días');
        fireEvent.click(screen.getByRole('switch', { name: 'Proveedor activo' }));

        fireEvent.submit(screen.getByRole('button', { name: /Guardar Proveedor/ }).closest('form') as HTMLFormElement);

        expect(env.post).toHaveBeenCalledWith('/suppliers.store', undefined, {
            branch_id: '2',
            name: 'Cueros SAS',
            nit: '900.123.456-7',
            contact_name: 'Juan Pérez',
            phone: '310 123 4567',
            email: 'ventas@cueros.co',
            address: 'Cra 7',
            notes: 'Pago a 30 días',
            status: false,
        });
    });

    it('shows the validation errors of the server under their fields', () => {
        env.errors = { name: 'El nombre es obligatorio.', email: 'Correo inválido.' };
        render(<Create branches={branches as never} userBranchId={1} />);

        expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument();
        expect(screen.getByText('Correo inválido.')).toBeInTheDocument();
    });

    it('prefills the edit form, turning missing data into empty text, and saves with a PUT', () => {
        render(<Edit supplier={supplier(9, { nit: null, notes: null, address: null }) as never} branches={[branches[0]] as never} />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Editar Proveedor');
        expect(field('name').value).toBe('Proveedor 9');
        expect(field('nit').value).toBe('');
        typeInto('name', 'Cueros del Sur');
        fireEvent.submit(screen.getByRole('button', { name: /Guardar Cambios/ }).closest('form') as HTMLFormElement);

        expect(env.put).toHaveBeenCalledWith('/suppliers.update/9', undefined, {
            branch_id: '1',
            name: 'Cueros del Sur',
            nit: '',
            contact_name: 'Juan Pérez',
            phone: '3101234567',
            email: 'ventas@proveedor.co',
            address: '',
            notes: '',
            status: true,
        });
        expect(document.querySelector('a[href="/suppliers.show/9"]')).not.toBeNull();
    });
});
