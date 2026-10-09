/** Characterization tests for the catalog list and the trash: pin today's behavior before the redesign. */
import { router } from '@inertiajs/react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import ProductsIndex from '../index';
import ProductsTrashed from '../trashed';

const env = vi.hoisted(() => ({
    granted: [] as string[],
    printer: { status: 'idle', selectedPrinter: '', printLabels: vi.fn() } as {
        status: string;
        selectedPrinter: string;
        printLabels: ReturnType<typeof vi.fn>;
    },
    flash: {} as { error?: string },
}));

vi.mock('@inertiajs/react', () => ({
    router: { visit: vi.fn(), put: vi.fn(), delete: vi.fn() },
    Head: () => null,
    Link: 'a',
    usePage: vi.fn(() => ({ props: { flash: env.flash } })),
}));
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/hooks/use-permissions', () => ({ usePermissions: () => ({ can: (permission: string) => env.granted.includes(permission) }) }));
vi.mock('@/hooks/use-polling', () => ({ usePolling: vi.fn() }));
vi.mock('@/hooks/use-printer', () => ({ usePrinter: () => env.printer }));
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

const categories = [
    { id: 1, name: 'Bolsos' },
    { id: 2, name: 'Joyas' },
];
const branches = [
    { id: 1, name: 'Centro' },
    { id: 2, name: 'Norte' },
];

const product = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    name: `Producto ${id}`,
    code: `SKU-${id}`,
    sale_price: 12000 * id,
    purchase_price: 5000,
    tax: 19,
    stock: 20,
    min_stock: 5,
    status: true,
    type: 'producto',
    image_url: `/img/${id}.jpg`,
    category: categories[0],
    branch: branches[0],
    ...overrides,
});

const text = (node: HTMLElement) => (node.textContent ?? '').replace(/\s/g, ' ');

function paginated(data: unknown[]) {
    return { data, links: [], current_page: 1, from: 1, to: data.length, total: data.length, last_page: 1 } as never;
}

function renderIndex(data: unknown[], filters: Record<string, string> = {}) {
    return render(<ProductsIndex products={paginated(data)} categories={categories as never} branches={branches as never} filters={filters} />);
}

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
    vi.useFakeTimers();
    env.granted = [];
    env.flash = {};
    env.printer = { status: 'idle', selectedPrinter: '', printLabels: vi.fn() };
});

afterEach(() => vi.useRealTimers());

describe('Catalog list', () => {
    it('lists each product with code, category, price, tax, stock, type and state', () => {
        renderIndex([product(1)]);

        const table = screen.getByRole('table');
        const cells = text(table);
        expect(cells).toContain('Producto 1');
        expect(cells).toContain('SKU-1');
        expect(cells).toContain('Bolsos');
        expect(cells).toContain('$12.000');
        expect(cells).toContain('19%');
        expect(cells).toContain('20');
        expect(cells).toContain('Producto');
        expect(cells).toContain('Activo');
        expect(within(table).getByRole('link')).toHaveAttribute('href', '/products/1');
    });

    it('shows a dash instead of stock for services and marks inactive products', () => {
        renderIndex([product(1, { type: 'servicio', stock: 0, status: false })]);

        const cells = text(screen.getByRole('table'));
        expect(cells).toContain('Servicio');
        expect(cells).toContain('—');
        expect(cells).toContain('Inactivo');
    });

    it('highlights stock at or under the minimum', () => {
        renderIndex([product(1, { stock: 5, min_stock: 5 }), product(2, { stock: 6, min_stock: 5 })]);

        const rows = within(screen.getByRole('table')).getAllByRole('row');
        expect(within(rows[1]).getByText('5').className).toContain('red');
        expect(within(rows[2]).getByText('6').className).not.toContain('red');
    });

    it('shows the branch column and filter only with permission to see branches', () => {
        const { unmount } = renderIndex([product(1)]);
        expect(screen.queryByText('Sucursal')).not.toBeInTheDocument();
        unmount();

        env.granted = ['branches.view'];
        renderIndex([product(1)]);
        expect(screen.getAllByText('Sucursal').length).toBeGreaterThan(0);
        expect(text(screen.getByRole('table'))).toContain('Centro');
    });

    it('offers new product and trash links only with their permissions', () => {
        const { unmount } = renderIndex([product(1)]);
        expect(screen.queryByRole('link', { name: /Nuevo/ })).not.toBeInTheDocument();
        expect(document.querySelector('a[href="/products/trashed"]')).toBeNull();
        unmount();

        env.granted = ['products.create', 'products.delete'];
        renderIndex([product(1)]);
        expect(screen.getByRole('link', { name: /Nuevo/ })).toHaveAttribute('href', '/products/create');
        expect(document.querySelector('a[href="/products/trashed"]')).not.toBeNull();
    });

    it('says so on small screens when there is nothing to show', () => {
        renderIndex([]);

        expect(screen.getByText('No hay productos que mostrar')).toBeInTheDocument();
    });

    it('filters by type with the tabs, keeping the other filters out of the address when they are "all"', () => {
        renderIndex([product(1)]);

        fireEvent.click(screen.getByRole('button', { name: 'Servicios' }));

        expect(router.visit).toHaveBeenLastCalledWith(
            '/products?type=servicio',
            expect.objectContaining({ preserveState: true, preserveScroll: true, replace: true, only: ['products'] }),
        );
    });

    it('filters by state and by category, and the filters add up', () => {
        renderIndex([product(1)]);
        const [state, category] = screen.getAllByRole('combobox');

        fireEvent.change(state, { target: { value: '1' } });
        expect(vi.mocked(router.visit).mock.lastCall?.[0]).toBe('/products?status=1');

        fireEvent.change(category, { target: { value: '2' } });
        expect(vi.mocked(router.visit).mock.lastCall?.[0]).toBe('/products?status=1&category=2');
    });

    it('searches automatically 350 ms after typing and right away on submit', () => {
        renderIndex([product(1)]);
        act(() => {
            vi.advanceTimersByTime(400);
        });
        vi.mocked(router.visit).mockClear();

        const box = screen.getByRole('searchbox');
        fireEvent.change(box, { target: { value: 'bolso' } });
        expect(router.visit).not.toHaveBeenCalled();
        act(() => {
            vi.advanceTimersByTime(350);
        });
        expect(vi.mocked(router.visit).mock.lastCall?.[0]).toBe('/products?search=bolso');

        fireEvent.change(box, { target: { value: 'collar' } });
        fireEvent.submit(box.closest('form') as HTMLFormElement);
        expect(vi.mocked(router.visit).mock.lastCall?.[0]).toBe('/products?search=collar');
    });
});

describe('Catalog list: labels', () => {
    const select = (name: string) => screen.getAllByLabelText(`Seleccionar ${name} para imprimir etiqueta`)[0];

    it('offers selection and printing only with permission to create', () => {
        const { unmount } = renderIndex([product(1)]);
        expect(screen.queryByLabelText(/para imprimir etiqueta/)).not.toBeInTheDocument();
        unmount();

        env.granted = ['products.create'];
        renderIndex([product(1)]);
        expect(select('Producto 1')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Imprimir etiquetas/ })).not.toBeInTheDocument();
    });

    it('asks to connect the printer when it is not connected', async () => {
        env.granted = ['products.create'];
        renderIndex([product(1)]);
        fireEvent.click(select('Producto 1'));

        fireEvent.click(screen.getByRole('button', { name: 'Imprimir etiquetas (1)' }));

        expect(toast.error).toHaveBeenCalledWith('QZ Tray no conectado. Configura la impresora en el POS.');
        expect(env.printer.printLabels).not.toHaveBeenCalled();
    });

    it('prints the selected labels and clears the selection', async () => {
        env.granted = ['products.create'];
        env.printer = { status: 'connected', selectedPrinter: 'Zebra', printLabels: vi.fn().mockResolvedValue({ printedCount: 2 }) };
        renderIndex([product(1), product(2)]);
        fireEvent.click(select('Producto 1'));
        fireEvent.click(select('Producto 2'));

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Imprimir etiquetas (2)' }));
        });

        expect(env.printer.printLabels).toHaveBeenCalledWith([1, 2]);
        expect(toast.success).toHaveBeenCalledWith('2 etiqueta(s) enviadas a la impresora');
        expect(screen.queryByRole('button', { name: /Imprimir etiquetas/ })).not.toBeInTheDocument();
    });

    it('reports when only some labels could be printed and when none could', async () => {
        env.granted = ['products.create'];
        env.printer = { status: 'connected', selectedPrinter: 'Zebra', printLabels: vi.fn().mockResolvedValueOnce({ printedCount: 1 }) };
        renderIndex([product(1), product(2)]);
        fireEvent.click(select('Producto 1'));
        fireEvent.click(select('Producto 2'));
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Imprimir etiquetas (2)' }));
        });
        expect(toast.success).toHaveBeenCalledWith('1 de 2 etiqueta(s) enviadas — algunos productos no están disponibles para ti');

        env.printer.printLabels.mockResolvedValueOnce({ printedCount: 0 });
        fireEvent.click(select('Producto 1'));
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Imprimir etiquetas (1)' }));
        });
        expect(toast.error).toHaveBeenCalledWith('Ninguno de los productos seleccionados está disponible para imprimir.');
    });

    it('reports a printer failure', async () => {
        env.granted = ['products.create'];
        env.printer = { status: 'connected', selectedPrinter: 'Zebra', printLabels: vi.fn().mockRejectedValue(new Error('sin papel')) };
        renderIndex([product(1)]);
        fireEvent.click(select('Producto 1'));

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Imprimir etiquetas (1)' }));
        });

        expect(toast.error).toHaveBeenCalledWith('Error al imprimir: sin papel');
    });

    it('forgets the selection of products that leave the page', () => {
        env.granted = ['products.create'];
        const { rerender } = renderIndex([product(1), product(2)]);
        fireEvent.click(select('Producto 1'));
        expect(screen.getByRole('button', { name: 'Imprimir etiquetas (1)' })).toBeInTheDocument();

        rerender(<ProductsIndex products={paginated([product(2)])} categories={categories as never} branches={branches as never} filters={{}} />);

        expect(screen.queryByRole('button', { name: /Imprimir etiquetas/ })).not.toBeInTheDocument();
    });
});

describe('Catalog trash', () => {
    function renderTrashed(data: unknown[], extra: Record<string, unknown> = {}) {
        return render(
            <ProductsTrashed
                products={
                    {
                        data,
                        links: [],
                        meta: { current_page: 1, last_page: 1, per_page: 10, total: data.length, from: 1, to: data.length },
                        ...extra,
                    } as never
                }
                categories={categories as never}
                branches={[]}
                filters={{}}
            />,
        );
    }

    it('lists deleted products and links back to the catalog', () => {
        renderTrashed([product(3)]);

        const cells = text(screen.getByRole('table', { name: 'Productos eliminados' }));
        expect(cells).toContain('Producto 3');
        expect(cells).toContain('SKU-3');
        expect(cells).toContain('$36.000');
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Productos en Papelera');
        expect(screen.getByRole('link', { name: /Volver a Productos/ })).toHaveAttribute('href', '/products');
    });

    it('says so on small screens when the trash is empty', () => {
        renderTrashed([]);

        expect(screen.getByText('No hay productos eliminados que mostrar')).toBeInTheDocument();
    });

    it('restores a product only with permission, without asking', () => {
        const { unmount } = renderTrashed([product(3)]);
        expect(screen.queryByRole('button', { name: /Restaurar/ })).not.toBeInTheDocument();
        unmount();

        env.granted = ['products.restore'];
        renderTrashed([product(3)]);
        fireEvent.click(screen.getAllByRole('button', { name: /Restaurar/ })[0]);

        expect(router.put).toHaveBeenCalledWith('/products/3/restore');
    });

    it('deletes forever only after confirming, naming the product', () => {
        env.granted = ['products.force_delete'];
        renderTrashed([product(3)]);

        fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar permanentemente' })[0]);
        const dialog = screen.getByRole('dialog');
        expect(text(dialog)).toContain('El producto Producto 3 será eliminado permanentemente.');
        expect(router.delete).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar permanentemente' }));

        expect(router.delete).toHaveBeenCalledWith('/products/3/force-delete', expect.any(Object));
    });

    it('closes the confirmation with Cancelar without deleting', () => {
        env.granted = ['products.force_delete'];
        renderTrashed([product(3)]);
        fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar permanentemente' })[0]);

        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(router.delete).not.toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('searches 300 ms after typing and keeps the first page', () => {
        renderTrashed([product(3)]);

        fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'collar' } });
        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(router.visit).toHaveBeenLastCalledWith(
            '/products/trashed?search=collar&page=1',
            expect.objectContaining({ preserveState: true, preserveScroll: true, only: ['products'] }),
        );
    });

    it('pages through the results', () => {
        renderTrashed([product(3)], {
            links: [
                { url: null, label: '&laquo; Previous', active: false },
                { url: '/products/trashed?page=1', label: '1', active: true },
                { url: '/products/trashed?page=2', label: '2', active: false },
                { url: '/products/trashed?page=2', label: 'Next &raquo;', active: false },
            ],
            meta: { current_page: 1, last_page: 2, per_page: 1, total: 2, from: 1, to: 1 },
        });

        fireEvent.click(screen.getByRole('button', { name: '2' }));

        expect(router.visit).toHaveBeenLastCalledWith('/products/trashed?page=2', expect.objectContaining({ only: ['products'] }));
    });
});
