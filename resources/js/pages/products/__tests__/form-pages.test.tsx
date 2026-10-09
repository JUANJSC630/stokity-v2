/** Characterization tests for the product form (create and edit): fields, validation, the exact payload and the supplier links. */
import { router } from '@inertiajs/react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import axios from 'axios';
import Cookies from 'js-cookie';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import CreateProduct from '../create';
import EditProduct from '../edit';

const env = vi.hoisted(() => ({
    post: vi.fn(),
    flash: {} as { error?: string },
    lastData: {} as Record<string, unknown>,
}));

vi.mock('@inertiajs/react', async () => {
    const React = await import('react');
    return {
        router: { post: vi.fn(), delete: vi.fn() },
        Head: () => null,
        Link: 'a',
        usePage: () => ({ props: { flash: env.flash, business: { brand_color: '#C4686F' } } }),
        useForm: (initial: Record<string, unknown>) => {
            const [data, setAll] = React.useState(initial);
            const [errors, setErrors] = React.useState<Record<string, string>>({});
            env.lastData = data;
            return {
                data,
                errors,
                processing: false,
                setData: (key: string, value: unknown) => setAll((previous) => ({ ...previous, [key]: value })),
                setError: (key: string, message: string) => setErrors((previous) => ({ ...previous, [key]: message })),
                clearErrors: (...keys: string[]) =>
                    setErrors((previous) => (keys.length ? Object.fromEntries(Object.entries(previous).filter(([key]) => !keys.includes(key))) : {})),
                post: (url: string, options: unknown) => env.post(url, options, env.lastData),
            };
        },
    };
});
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/hooks/use-scroll-to-error', () => ({ useScrollToError: vi.fn() }));
vi.mock('@/lib/image-upload', () => ({ prepareImageForUpload: vi.fn(async (file: File) => file) }));
vi.mock('axios', () => ({
    default: { post: vi.fn(), isAxiosError: (error: unknown) => Boolean((error as { isAxiosError?: boolean })?.isAxiosError) },
}));
vi.mock('@/components/ui/select', () => ({
    Select: ({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children: ReactNode }) => (
        <select value={value} onChange={(e) => onValueChange?.(e.target.value)}>
            <option value="">—</option>
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
const suppliersList = [
    { id: 11, name: 'Cueros SAS', nit: '900123' },
    { id: 12, name: 'Hilos del Sur', nit: null },
];

const text = (node: HTMLElement) => (node.textContent ?? '').replace(/\s/g, ' ');
const field = (id: string) => document.getElementById(id) as HTMLInputElement;
const typeInto = (id: string, value: string) => fireEvent.change(field(id), { target: { value } });
const combos = () => screen.getAllByRole('combobox') as HTMLSelectElement[];
const submitForm = (button: RegExp | string) => fireEvent.submit(screen.getByRole('button', { name: button }).closest('form') as HTMLFormElement);

function renderCreate(props: { userBranchId?: number | null } = {}) {
    return render(
        <Tooltip.Provider>
            <CreateProduct categories={categories as never} branches={branches as never} userBranchId={props.userBranchId ?? null} />
        </Tooltip.Provider>,
    );
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
    env.flash = {};
    Cookies.remove('stokity_product_tax');
});

describe('New product', () => {
    it('starts as a product with 19% tax, active, and no stock typed yet', () => {
        renderCreate();

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Crear Producto');
        expect(field('tax').value).toBe('19');
        expect(field('stock').value).toBe('');
        expect(field('min_stock').value).toBe('');
        expect(screen.getByText('Activo')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Volver/ })).toHaveAttribute('href', '/products');
    });

    it('remembers the last tax chosen and preselects the branch of the user', () => {
        Cookies.set('stokity_product_tax', '8');
        renderCreate({ userBranchId: 2 });

        expect(field('tax').value).toBe('8');
        expect(combos()[1].value).toBe('2');
    });

    it('switches to a service: no stock, a variable price option and its own wording', () => {
        renderCreate();

        fireEvent.click(screen.getByRole('button', { name: /Servicio/ }));

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Crear Servicio');
        expect(document.getElementById('stock')).toBeNull();
        expect(document.getElementById('min_stock')).toBeNull();
        expect(screen.getByText('Costo del servicio')).toBeInTheDocument();
        expect(screen.getByText(/Precio base/)).toBeInTheDocument();
        expect(screen.getByLabelText(/No — usar el precio base siempre/)).toBeInTheDocument();
    });

    it('toggles the tax between 19% and 0% and remembers it in a cookie', () => {
        renderCreate();

        fireEvent.click(screen.getByRole('button', { name: 'Sin IVA (0%)' }));
        expect(field('tax').value).toBe('0');
        expect(Cookies.get('stokity_product_tax')).toBe('0');

        fireEvent.click(screen.getByRole('button', { name: 'IVA 19%' }));
        expect(field('tax').value).toBe('19');
        expect(Cookies.get('stokity_product_tax')).toBe('19');
    });

    it('refuses to save until the sale price has been entered, and says so', () => {
        renderCreate();
        typeInto('name', 'Bolso');

        submitForm(/Guardar Producto/);

        expect(screen.getByText('El precio de venta es obligatorio.')).toBeInTheDocument();
        expect(env.post).not.toHaveBeenCalled();
    });

    it('posts the product as multipart form data with every field the server expects', () => {
        renderCreate();
        typeInto('name', 'Bolso de cuero');
        typeInto('code', 'SKU-9');
        fireEvent.change(combos()[0], { target: { value: '1' } });
        fireEvent.change(combos()[1], { target: { value: '2' } });
        typeInto('purchase_price', '80000');
        typeInto('sale_price', '150000');
        typeInto('stock', '12');
        typeInto('min_stock', '3');
        typeInto('description', 'Cierre metálico');

        submitForm(/Guardar Producto/);

        expect(env.post).toHaveBeenCalledWith('/products', expect.objectContaining({ forceFormData: true }), {
            name: 'Bolso de cuero',
            code: 'SKU-9',
            description: 'Cierre metálico',
            type: 'producto',
            variable_price: false,
            purchase_price: 80000,
            sale_price: 150000,
            tax: 19,
            stock: 12,
            min_stock: 3,
            category_id: '1',
            branch_id: '2',
            status: true,
            image: null,
        });
    });

    it('lets the user deactivate the product before saving', () => {
        renderCreate();
        typeInto('sale_price', '1000');

        fireEvent.click(screen.getByRole('switch', { name: 'Activo' }));
        submitForm(/Guardar Producto/);

        expect(env.post.mock.calls[0][2]).toMatchObject({ status: false });
    });

    it('keeps the picked image and shows its preview', async () => {
        renderCreate();
        const file = new File(['x'], 'bolso.png', { type: 'image/png' });

        await act(async () => {
            fireEvent.change(field('image'), { target: { files: [file] } });
        });

        await waitFor(() => expect(screen.getByAltText('Vista previa')).toBeInTheDocument());
        typeInto('sale_price', '1000');
        submitForm(/Guardar Producto/);
        expect(env.post.mock.calls[0][2]).toMatchObject({ image: file });
    });
});

describe('New product: code generator', () => {
    it('asks for the name first', async () => {
        renderCreate();

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Generar código' }));
        });

        const dialog = screen.getByRole('dialog');
        expect(text(dialog)).toContain('Ingrese el nombre del producto primero');
        expect(axios.post).not.toHaveBeenCalled();
    });

    it('fills the code with the one the server generates', async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({ data: { code: '12345678' } });
        renderCreate();
        typeInto('name', 'Bolso');

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Generar código' }));
        });

        expect(axios.post).toHaveBeenCalledWith('/products/generate-code', { name: 'Bolso' });
        expect(field('code').value).toBe('12345678');
    });

    it('shows the server message when the code cannot be generated', async () => {
        vi.mocked(axios.post).mockRejectedValueOnce({ isAxiosError: true, response: { data: { error: 'Nombre demasiado corto' } } });
        renderCreate();
        typeInto('name', 'B');

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Generar código' }));
        });

        expect(text(screen.getByRole('dialog'))).toContain('Nombre demasiado corto');
    });
});

describe('Edit product', () => {
    const product = {
        id: 9,
        name: 'Bolso de cuero',
        code: 'SKU-9',
        description: 'Cierre metálico',
        purchase_price: '80000.00',
        sale_price: '150000.00',
        tax: 19,
        stock: 12,
        min_stock: 5,
        status: true,
        type: 'producto',
        variable_price: false,
        image_url: '/img/9.jpg',
        category_id: 1,
        branch_id: 1,
        suppliers: [{ id: 11, name: 'Cueros SAS', pivot: { purchase_price: '75000', supplier_code: 'CU-1', is_default: true } }],
    };

    function renderEdit(overrides: Record<string, unknown> = {}, suppliers: unknown[] = suppliersList) {
        return render(
            <Tooltip.Provider>
                <EditProduct
                    product={{ ...product, ...overrides } as never}
                    categories={categories as never}
                    branches={branches as never}
                    suppliers={suppliers as never}
                    userBranchId={null}
                />
            </Tooltip.Provider>,
        );
    }

    it('is prefilled with the product and shows the stock as read-only', () => {
        renderEdit();

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Editar Producto');
        expect(field('name').value).toBe('Bolso de cuero');
        expect(field('code').value).toBe('SKU-9');
        expect(field('purchase_price').value).toBe('80.000');
        expect(field('sale_price').value).toBe('150.000');
        expect(field('min_stock').value).toBe('5');
        expect(document.getElementById('stock')).toBeNull();
        expect(text(document.body)).toContain('El stock se actualiza mediante movimientos de stock');
        expect(screen.getByAltText('Vista previa')).toHaveAttribute('src', '/img/9.jpg');
    });

    it('saves with a POST to the product that the server reads as PUT, as multipart', () => {
        renderEdit();
        typeInto('name', 'Bolso nuevo');
        typeInto('sale_price', '160000');

        submitForm('Guardar Cambios');

        expect(env.post).toHaveBeenCalledWith(
            '/products/9',
            expect.objectContaining({ forceFormData: true }),
            expect.objectContaining({
                _method: 'PUT',
                name: 'Bolso nuevo',
                sale_price: 160000,
                purchase_price: 80000,
                min_stock: 5,
                tax: 19,
                type: 'producto',
            }),
        );
    });

    it('presents a service without stock, with the variable price option and without suppliers', () => {
        renderEdit({ type: 'servicio', variable_price: true });

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Editar Servicio');
        expect(document.getElementById('min_stock')).toBeNull();
        expect(screen.getByLabelText(/Activado — el vendedor ingresa el precio en cada venta/)).toBeInTheDocument();
        expect(screen.queryByText('Proveedores')).not.toBeInTheDocument();
    });

    it('does not delete a product that still has stock and explains what to do', () => {
        renderEdit();

        fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
        const dialog = screen.getByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

        expect(router.delete).not.toHaveBeenCalled();
        expect(text(screen.getByRole('dialog'))).toContain('Este producto tiene 12 unidades en inventario. Debes dar de baja el stock');
        expect(within(screen.getByRole('dialog')).queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
        expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    });

    it('sends a product without stock to the trash after confirming', () => {
        renderEdit({ stock: 0 });

        fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
        const dialog = screen.getByRole('dialog');
        expect(text(dialog)).toContain('será enviado a la papelera');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

        expect(router.delete).toHaveBeenCalledWith('/products/9', expect.objectContaining({ preserveState: true }));
    });

    it('closes the deletion dialog with Cancelar without deleting', () => {
        renderEdit({ stock: 0 });
        fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);

        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

        expect(router.delete).not.toHaveBeenCalled();
    });

    it('opens the deletion dialog with the message the server sent when it blocked the delete', async () => {
        env.flash = { error: 'No se puede eliminar: tiene ventas.' };
        renderEdit({ stock: 0 });
        fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);

        expect(text(screen.getByRole('dialog'))).toContain('No se puede eliminar: tiene ventas.');
    });
});

describe('Edit product: suppliers', () => {
    const product = {
        id: 9,
        name: 'Bolso',
        code: 'SKU-9',
        description: '',
        purchase_price: 1000,
        sale_price: 2000,
        tax: 19,
        stock: 0,
        min_stock: 1,
        status: true,
        type: 'producto',
        variable_price: false,
        image_url: '',
        category_id: 1,
        branch_id: 1,
        suppliers: [{ id: 11, name: 'Cueros SAS', pivot: { purchase_price: '75000', supplier_code: 'CU-1', is_default: true } }],
    };

    const renderEdit = (suppliers: unknown[] = suppliersList) =>
        render(
            <Tooltip.Provider>
                <EditProduct
                    product={product as never}
                    categories={categories as never}
                    branches={branches as never}
                    suppliers={suppliers as never}
                />
            </Tooltip.Provider>,
        );

    it('hides the section when the business has no suppliers', () => {
        renderEdit([]);

        expect(screen.queryByText('Proveedores')).not.toBeInTheDocument();
    });

    it('lists the linked suppliers with price, code and default switch', () => {
        renderEdit();

        expect(screen.getByText('Cueros SAS')).toBeInTheDocument();
        expect(screen.getByDisplayValue('75.000')).toBeInTheDocument();
        expect(screen.getByDisplayValue('CU-1')).toBeInTheDocument();
        expect(screen.getByRole('switch', { name: 'Predeterminado' })).toBeChecked();
    });

    it('offers only suppliers that are not linked yet, and Agregar waits for a choice', () => {
        renderEdit();

        expect(screen.getByRole('button', { name: 'Agregar' })).toBeDisabled();
        const picker = combos().at(-1) as HTMLSelectElement;
        expect(within(picker).queryByRole('option', { name: /Cueros SAS/ })).not.toBeInTheDocument();
        expect(within(picker).getByRole('option', { name: 'Hilos del Sur' })).toBeInTheDocument();
    });

    it('adds a supplier, makes it the default and syncs the whole list', () => {
        renderEdit();
        fireEvent.change(combos().at(-1) as HTMLSelectElement, { target: { value: '12' } });
        fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
        expect(screen.getByText('Hilos del Sur')).toBeInTheDocument();

        fireEvent.click(screen.getAllByRole('switch', { name: 'Predeterminado' })[1]);
        fireEvent.click(screen.getByRole('button', { name: 'Guardar proveedores' }));

        expect(router.post).toHaveBeenCalledWith(
            '/products.sync-suppliers/9',
            {
                suppliers: [
                    { supplier_id: 11, purchase_price: '75000', supplier_code: 'CU-1', is_default: false },
                    { supplier_id: 12, purchase_price: null, supplier_code: null, is_default: true },
                ],
            },
            expect.any(Object),
        );
    });

    it('removes a supplier link', () => {
        renderEdit();

        fireEvent.click(screen.getByRole('button', { name: 'Quitar proveedor Cueros SAS' }));
        fireEvent.click(screen.getByRole('button', { name: 'Guardar proveedores' }));

        expect(vi.mocked(router.post).mock.calls[0][1]).toEqual({ suppliers: [] });
    });
});
