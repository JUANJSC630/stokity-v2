/** Characterization tests for the stock movements list, the new-movement form and the product history: pin today's behavior before the redesign. */
import { router } from '@inertiajs/react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import axios from 'axios';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import StockMovementCreate from '../create';
import StockMovementsIndex from '../index';
import ProductMovements from '../product-movements';

const env = vi.hoisted(() => ({
    post: vi.fn(),
    errors: {} as Record<string, string>,
}));

vi.mock('@inertiajs/react', async () => {
    const React = await import('react');
    return {
        router: { get: vi.fn(), visit: vi.fn(), reload: vi.fn() },
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
vi.mock('@/hooks/use-scroll-to-error', () => ({ useScrollToError: vi.fn() }));
vi.mock('axios', () => ({ default: { get: vi.fn() } }));
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

const movement = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    type: 'ingreso',
    quantity: 12,
    previous_stock: 3,
    new_stock: 15,
    unit_cost: 8000,
    reference: 'Factura #001',
    notes: null,
    movement_date: '2026-10-05T10:30:00',
    created_at: '2026-10-05T10:30:00',
    product: { id: 4, name: 'Collar Luna', code: 'COL-001', deleted_at: null },
    user: { id: 1, name: 'Carlos' },
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
});

describe('Stock movements list', () => {
    const products = [
        { id: 4, name: 'Collar Luna', code: 'COL-001' },
        { id: 5, name: 'Aretes', code: 'ARE-002' },
    ];
    const branches = [
        { id: 1, name: 'Centro' },
        { id: 2, name: 'Norte' },
    ];

    function renderIndex(data: unknown[], filters = {}, branchList: unknown[] = branches) {
        return render(<StockMovementsIndex movements={paginated(data)} branches={branchList as never} products={products} filters={filters} />);
    }

    it('lists each movement with date, product, type, quantities, cost, reference, user and branch', () => {
        renderIndex([movement(1)]);

        const row = text(within(screen.getByRole('table', { name: 'Movimientos de stock' })).getAllByRole('row')[1]);
        expect(row).toContain('05/10/2026 10:30');
        expect(row).toContain('COL-001 - Collar Luna');
        expect(row).toContain('Ingreso');
        expect(row).toContain('12');
        expect(row).toContain('3');
        expect(row).toContain('15');
        expect(row).toContain('$ 8.000');
        expect(row).toContain('Factura #001');
        expect(row).toContain('Carlos');
        expect(row).toContain('Centro');
        expect(screen.getAllByRole('link', { name: 'COL-001 - Collar Luna' })[0]).toHaveAttribute('href', '/products/4');
        expect(screen.getByText('Movimientos (1)')).toBeInTheDocument();
    });

    it.each([
        ['ingreso', 'Ingreso'],
        ['out', 'Salida'],
        ['adjustment', 'Ajuste'],
        ['write_off', 'Baja'],
        ['supplier_return', 'Dev. Proveedor'],
    ])('names the %s type as %s', (type, label) => {
        renderIndex([movement(1, { type })]);

        expect(within(screen.getByRole('table')).getByText(label)).toBeInTheDocument();
    });

    it('shows dashes when there is no cost or reference, and a dash for a missing branch', () => {
        renderIndex([movement(1, { unit_cost: null, reference: null, branch: null })]);

        const row = text(within(screen.getByRole('table')).getAllByRole('row')[1]);
        expect(row).not.toContain('$');
        expect(row).toContain('-');
        expect(row).toContain('—');
    });

    it('marks movements of deleted products and does not link them', () => {
        renderIndex([
            movement(1, { product: { id: 4, name: 'Collar Luna', code: 'COL-001', deleted_at: '2026-10-01T10:00:00' } }),
            movement(2, { product: null }),
        ]);

        const table = within(screen.getByRole('table'));
        expect(table.getByText('COL-001 - Collar Luna (eliminado)')).toBeInTheDocument();
        expect(table.getByText('Producto eliminado')).toBeInTheDocument();
        expect(table.queryByRole('link')).not.toBeInTheDocument();
    });

    it('says so when there are no movements', () => {
        renderIndex([]);

        expect(screen.getAllByText('No se encontraron movimientos de stock').length).toBeGreaterThan(0);
    });

    it('links to the new movement form', () => {
        renderIndex([movement(1)]);

        expect(screen.getByRole('link', { name: /Nuevo Movimiento/ })).toHaveAttribute('href', '/stock-movements/create');
    });

    it('filters by every field at once, sending empty values for "all"', () => {
        renderIndex([movement(1)]);
        const [type, branch, product] = combos();
        const [from, to] = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];

        fireEvent.change(screen.getByPlaceholderText('Buscar por referencia, notas o producto...'), { target: { value: 'factura' } });
        fireEvent.change(type, { target: { value: 'write_off' } });
        fireEvent.change(branch, { target: { value: '2' } });
        fireEvent.change(product, { target: { value: '5' } });
        fireEvent.change(from, { target: { value: '2026-10-01' } });
        fireEvent.change(to, { target: { value: '2026-10-09' } });
        fireEvent.click(screen.getByRole('button', { name: /Filtrar/ }));

        expect(router.get).toHaveBeenCalledWith(
            '/stock-movements',
            { search: 'factura', type: 'write_off', branch: '2', product: '5', start_date: '2026-10-01', end_date: '2026-10-09' },
            { preserveState: true, preserveScroll: true },
        );
    });

    it('sends empty strings when nothing is chosen', () => {
        renderIndex([movement(1)]);

        fireEvent.click(screen.getByRole('button', { name: /Filtrar/ }));

        expect(vi.mocked(router.get).mock.calls[0][1]).toEqual({ search: '', type: '', branch: '', product: '', start_date: '', end_date: '' });
    });

    it('clears the fields and reloads the full list', () => {
        renderIndex([movement(1)], { search: 'x', type: 'out', start_date: '2026-10-01' });
        expect((screen.getByPlaceholderText('Buscar por referencia, notas o producto...') as HTMLInputElement).value).toBe('x');

        fireEvent.click(screen.getByRole('button', { name: /Limpiar/ }));

        expect(router.get).toHaveBeenCalledWith('/stock-movements');
        expect((screen.getByPlaceholderText('Buscar por referencia, notas o producto...') as HTMLInputElement).value).toBe('');
    });

    it('shows the branch filter only when there are branches to choose from', () => {
        const { unmount } = renderIndex([movement(1)], {}, []);
        expect(screen.queryByText('Sucursal', { selector: 'label' })).not.toBeInTheDocument();
        unmount();

        renderIndex([movement(1)]);
        expect(screen.getByText('Sucursal', { selector: 'label' })).toBeInTheDocument();
    });

    it('opens the product from a card on phones', () => {
        renderIndex([movement(1)]);

        expect(screen.getByRole('button', { name: 'Ver producto' }).closest('a')).toHaveAttribute('href', '/products/4');
    });
});

describe('New stock movement', () => {
    const product = {
        id: 4,
        name: 'Collar Luna',
        code: 'COL-001',
        stock: 12,
        category: { id: 1, name: 'Collares' },
        branch: { id: 1, name: 'Centro' },
    };
    const suppliers = [{ id: 11, name: 'Cueros SAS' }];

    function renderCreate(props: Record<string, unknown> = {}) {
        return render(
            <StockMovementCreate
                branches={[]}
                suppliers={suppliers as never}
                userBranchId={1}
                now="2026-10-10T09:15"
                selectedType="ingreso"
                {...(props as object)}
            />,
        );
    }

    afterEach(() => vi.useRealTimers());

    it('starts as an ingreso with supplier, cost and date prefilled', () => {
        renderCreate();

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nuevo Movimiento de Stock');
        expect(combos()[0].value).toBe('ingreso');
        expect(screen.getByText('Cantidad a ingresar *')).toBeInTheDocument();
        expect(screen.getByText('Proveedor')).toBeInTheDocument();
        expect(field('unit_cost')).not.toBeNull();
        expect(field('movement_date').value).toBe('2026-10-10T09:15');
    });

    it.each([
        ['ingreso', 'Cantidad a ingresar *', true, true],
        ['out', 'Cantidad a retirar *', false, false],
        ['write_off', 'Cantidad a retirar *', false, false],
        ['supplier_return', 'Cantidad a retirar *', true, false],
        ['adjustment', 'Nuevo stock total *', false, false],
    ])('for %s it asks "%s", supplier: %s, unit cost: %s', (type, label, supplier, cost) => {
        renderCreate({ selectedType: type });

        expect(screen.getByText(label)).toBeInTheDocument();
        expect(screen.queryByText('Proveedor') !== null).toBe(supplier);
        expect(document.getElementById('unit_cost') !== null).toBe(cost);
        expect(field('quantity').min).toBe(type === 'adjustment' ? '0' : '1');
    });

    it('shows the selected product with its details and current stock', () => {
        renderCreate({ selectedProduct: product });

        const page = text(document.body);
        expect(page).toContain('COL-001');
        expect(page).toContain('Collar Luna');
        expect(page).toContain('Collares');
        expect(page).toContain('Centro');
        expect(page).toContain('Stock: 12');
        expect(screen.getByText('Stock actual: 12')).toBeInTheDocument();
    });

    it('lets the product be changed', () => {
        renderCreate({ selectedProduct: product });

        fireEvent.click(screen.getByTitle('Cambiar producto'));

        expect(screen.getByPlaceholderText('Buscar por nombre o código...')).toBeInTheDocument();
        expect(screen.queryByText('Stock actual: 12')).not.toBeInTheDocument();
    });

    it('searches products 250 ms after typing and lets one be picked', async () => {
        vi.useFakeTimers();
        vi.mocked(axios.get).mockResolvedValueOnce({ data: [{ ...product, id: 9, name: 'Aretes', code: 'ARE-002', stock: 0 }] });
        renderCreate();

        fireEvent.change(screen.getByPlaceholderText('Buscar por nombre o código...'), { target: { value: 'are' } });
        expect(axios.get).not.toHaveBeenCalled();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(250);
        });

        expect(axios.get).toHaveBeenCalledWith('/api/products/search', { params: { q: 'are' } });
        fireEvent.click(screen.getByRole('button', { name: /ARE-002/ }));
        expect(text(document.body)).toContain('Stock: 0');
        expect(screen.queryByPlaceholderText('Buscar por nombre o código...')).not.toBeInTheDocument();
    });

    it('says when a search finds nothing', async () => {
        vi.useFakeTimers();
        vi.mocked(axios.get).mockResolvedValueOnce({ data: [] });
        renderCreate();

        fireEvent.change(screen.getByPlaceholderText('Buscar por nombre o código...'), { target: { value: 'zzz' } });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(250);
        });

        expect(screen.getByText(/Sin resultados para/)).toBeInTheDocument();
    });

    it('posts the movement with every field the server expects', () => {
        renderCreate({ selectedProduct: product });
        fireEvent.change(combos()[1], { target: { value: '11' } });
        fireEvent.change(field('quantity'), { target: { value: '5' } });
        fireEvent.change(field('unit_cost'), { target: { value: '8000' } });
        fireEvent.change(field('reference'), { target: { value: 'Factura #9' } });
        fireEvent.change(field('notes'), { target: { value: 'Pedido mensual' } });

        fireEvent.submit(screen.getByRole('button', { name: /Guardar Movimiento/ }).closest('form') as HTMLFormElement);

        expect(env.post).toHaveBeenCalledWith('/stock-movements', undefined, {
            product_id: '4',
            type: 'ingreso',
            quantity: '5',
            unit_cost: '8000',
            supplier_id: '11',
            reference: 'Factura #9',
            notes: 'Pedido mensual',
            from_product: '1',
            movement_date: '2026-10-10T09:15',
        });
    });

    it('does not mark the movement as coming from a product when none was preselected', () => {
        renderCreate();

        fireEvent.submit(screen.getByRole('button', { name: /Guardar Movimiento/ }).closest('form') as HTMLFormElement);

        expect(env.post.mock.calls[0][2]).toMatchObject({ product_id: '', from_product: '' });
    });

    it('turns the supplier choice "Sin proveedor" into an empty value', () => {
        renderCreate({ selectedProduct: product });
        fireEvent.change(combos()[1], { target: { value: '11' } });
        fireEvent.change(combos()[1], { target: { value: '__none__' } });

        fireEvent.submit(screen.getByRole('button', { name: /Guardar Movimiento/ }).closest('form') as HTMLFormElement);

        expect(env.post.mock.calls[0][2]).toMatchObject({ supplier_id: '' });
    });

    it('shows the validation errors of the server under their fields', () => {
        env.errors = { product_id: 'Elige un producto.', quantity: 'La cantidad es obligatoria.', unit_cost: 'Costo inválido.' };
        renderCreate();

        const page = text(document.body);
        expect(page).toContain('Elige un producto.');
        expect(page).toContain('La cantidad es obligatoria.');
        expect(page).toContain('Costo inválido.');
    });
});

describe('Product stock history', () => {
    const product = {
        id: 4,
        name: 'Collar Luna',
        code: 'COL-001',
        stock: 12,
        category: { id: 1, name: 'Collares' },
        branch: { id: 1, name: 'Centro' },
    };

    const renderHistory = (data: unknown[]) => render(<ProductMovements product={product} movements={paginated(data)} />);

    it('shows the product with its stock and the movements as a table', () => {
        renderHistory([movement(1, { notes: 'Pedido mensual' })]);

        const page = text(document.body);
        expect(page).toContain('COL-001');
        expect(page).toContain('Collar Luna');
        expect(page).toContain('Collares');
        expect(page).toContain('Centro');
        expect(page).toContain('Historial de Movimientos (1)');
        const row = text(within(screen.getByRole('table', { name: 'Movimientos de stock del producto' })).getAllByRole('row')[1]);
        expect(row).toContain('05/10/2026 10:30');
        expect(row).toContain('Ingreso');
        expect(row).toContain('$ 8.000');
        expect(row).toContain('Pedido mensual');
    });

    it('links back to the product and to a new movement for it', () => {
        renderHistory([movement(1)]);

        expect(document.querySelector('a[href="/products/4"]')).not.toBeNull();
        expect(document.querySelector('a[href="/stock-movements/create?product_id=4"]')).not.toBeNull();
    });

    it('says so when the product has no movements', () => {
        renderHistory([]);

        expect(screen.getAllByText('No se encontraron movimientos para este producto').length).toBeGreaterThan(0);
    });

    it('opens a long note in a dialog and shows a short one in place', () => {
        const long = 'Nota muy larga '.repeat(8);
        renderHistory([movement(1, { notes: long }), movement(2, { notes: 'Corta' })]);

        const table = within(screen.getByRole('table'));
        expect(table.getAllByTitle('Ver nota completa')).toHaveLength(1);
        fireEvent.click(table.getByTitle('Ver nota completa'));

        expect(text(screen.getByRole('dialog', { name: 'Nota del movimiento' })).trim()).toContain('Nota muy larga');
    });

    it('explains when the product does not exist', () => {
        render(<ProductMovements product={undefined as never} movements={paginated([])} />);

        expect(screen.getByText('Producto no encontrado')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Volver a Productos/ })).toHaveAttribute('href', '/products');
    });
});
