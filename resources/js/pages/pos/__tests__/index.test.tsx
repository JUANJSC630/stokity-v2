/**
 * Characterization tests for the POS: they pin what the page does TODAY with money (totals, discounts,
 * validations and the exact payloads sent to the server) so a visual redesign cannot change it silently.
 * They deliberately assert current behavior, not ideal behavior.
 */
import { router } from '@inertiajs/react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import PosIndex from '../index';

const page = vi.hoisted(() => ({
    flash: {} as Record<string, unknown>,
    moduleConfig: {} as Record<string, boolean>,
    play: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    router: { post: vi.fn(), patch: vi.fn(), delete: vi.fn(), visit: vi.fn() },
    Head: () => null,
    usePage: vi.fn(() => ({
        props: { auth: { user: { id: 7, branch_id: 1 } }, flash: page.flash, business: { module_config: page.moduleConfig, brand_color: '#C4686F' } },
    })),
}));
vi.mock('@/layouts/app-layout', () => ({
    default: ({ children, headerActions }: { children: ReactNode; headerActions?: ReactNode }) => (
        <div>
            <div data-testid="header-actions">{headerActions}</div>
            {children}
        </div>
    ),
}));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), dismiss: vi.fn() }) }));
vi.mock('@/hooks/use-polling', () => ({ usePolling: vi.fn() }));
vi.mock('@/hooks/use-sound', () => ({ useSound: () => ({ play: page.play }) }));
vi.mock('@/hooks/use-printer', () => ({
    usePrinter: () => ({
        status: 'unavailable',
        printers: [],
        selectedPrinter: '',
        autoPrint: false,
        connect: vi.fn(),
        setSelectedPrinter: vi.fn(),
        printReceipt: vi.fn().mockResolvedValue(undefined),
    }),
}));
vi.mock('@/components/PaymentMethodSelect', () => ({
    default: ({ onValueChange }: { onValueChange: (value: string) => void }) => (
        <div>
            <button type="button" onClick={() => onValueChange('cash')}>
                método-efectivo
            </button>
            <button type="button" onClick={() => onValueChange('transfer')}>
                método-transferencia
            </button>
        </div>
    ),
}));
vi.mock('@/components/ui/select', () => ({
    Select: ({
        value,
        onValueChange,
        disabled,
        children,
    }: {
        value?: string;
        onValueChange?: (v: string) => void;
        disabled?: boolean;
        children: ReactNode;
    }) => (
        <select value={value} disabled={disabled} onChange={(e) => onValueChange?.(e.target.value)}>
            {children}
        </select>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));

const products = [
    {
        id: 11,
        name: 'Collar de perlas Luna',
        code: 'COL-001',
        sale_price: 45000,
        tax: 0,
        stock: 12,
        type: 'producto',
        variable_price: false,
        image_url: '',
    },
    { id: 12, name: 'Aretes dorados', code: 'ARE-014', sale_price: 38500, tax: 19, stock: 3, type: 'producto', variable_price: false, image_url: '' },
    { id: 13, name: 'Pulsera agotada', code: 'PUL-032', sale_price: 12000, tax: 0, stock: 0, type: 'producto', variable_price: false, image_url: '' },
    {
        id: 14,
        name: 'Arreglo de joyería',
        code: 'SRV-001',
        sale_price: 20000,
        tax: 0,
        stock: 0,
        type: 'servicio',
        variable_price: true,
        image_url: '',
    },
];

const clients = [
    { id: 1, name: 'Consumidor Final', document: '222222222', is_wholesale: false, wholesale_discount_pct: null },
    { id: 2, name: 'Mayorista Ltda', document: '900100200', is_wholesale: true, wholesale_discount_pct: '15.00' },
    { id: 3, name: 'Ana Pérez', document: '1000200300', is_wholesale: false, wholesale_discount_pct: null },
];

const openSession = {
    id: 5,
    branch_id: 1,
    opened_by_user_id: 7,
    closed_by_user_id: null,
    status: 'open',
    opening_amount: 100000,
    opening_notes: null,
    opened_at: new Date().toISOString(),
    closing_amount_declared: null,
    closing_notes: null,
    closed_at: null,
    total_sales_cash: 0,
};

const pendingSale = {
    id: 90,
    code: '202610090000123456',
    client_id: '3',
    client_name: 'Ana Pérez',
    discount_type: 'percentage' as const,
    discount_value: 10,
    product_count: 1,
    net: 45000,
    total: 40500,
    notes: null,
    created_at: '2026-10-09T10:00:00Z',
    products: [
        { product_id: 11, product_name: 'Collar de perlas Luna', quantity: 1, price: 45000, subtotal: 45000, tax: 0, stock: 12, image_url: null },
    ],
};

function renderPos(overrides: Partial<React.ComponentProps<typeof PosIndex>> = {}) {
    return render(
        <PosIndex
            branches={[{ id: 1, name: 'Centro' } as never]}
            clients={clients as never}
            categories={[{ id: 1, name: 'Collares' }]}
            pendingSalesCount={0}
            currentSession={openSession as never}
            requireCashSession={false}
            {...overrides}
        />,
    );
}

const normalize = (text: string | null | undefined) => (text ?? '').replace(/\s/g, ' ');
const hasText = (text: string) => (_: string, node: Element | null) => normalize(node?.textContent) === text && node?.children.length === 0;

async function search(term: string) {
    fireEvent.change(screen.getByPlaceholderText(/Buscar producto por nombre o código/), { target: { value: term } });
}

async function addProduct(term: string, name: string) {
    await search(term);
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(`Agregar ${name}`) }, { timeout: 2000 }));
}

const receivedInput = () => screen.getByText('Recibido:').parentElement!.querySelector('input') as HTMLInputElement;
const priceModalInput = () => screen.getByRole('textbox', { name: 'Precio del servicio' }) as HTMLInputElement;
const submitButton = () => screen.getByRole('button', { name: /Cobrar|Procesando/ });
const discountSelect = () => screen.getAllByRole('combobox').find((s) => within(s).queryByText('Ninguno')) as HTMLSelectElement;
const clientSelect = () => screen.getAllByRole('combobox').find((s) => within(s).queryByText('Mayorista Ltda')) as HTMLSelectElement;

function lastPost() {
    const calls = vi.mocked(router.post).mock.calls;
    const [url, data, options] = calls[calls.length - 1] as unknown as [
        string,
        Record<string, unknown>,
        { onSuccess?: (page: unknown) => void; onError?: (e: Record<string, string>) => void; onFinish?: () => void },
    ];
    return { url, data, options };
}

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
    vi.stubGlobal('IntersectionObserver', NoopObserver);
    vi.stubGlobal('route', (name: string, id?: number) => `/${name}${id ? `/${id}` : ''}`);
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
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn(() => false);
});

beforeEach(() => {
    vi.clearAllMocks();
    page.flash = {};
    page.moduleConfig = {};
    window.history.replaceState({}, '', '/pos');
    vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string) => {
            if (String(url).includes('sales.pending')) return { ok: true, json: async () => [pendingSale] };
            return { ok: true, json: async () => products };
        }),
    );
});

describe('POS: cart and totals', () => {
    it('starts with an empty cart and the charge button disabled', () => {
        renderPos();

        expect(screen.getByText('Carrito vacío')).toBeInTheDocument();
        expect(submitButton()).toBeDisabled();
    });

    it('adds a product and charges its price with no tax', async () => {
        renderPos();
        await addProduct('co', 'Collar de perlas Luna');

        expect(screen.getByLabelText('Cantidad de Collar de perlas Luna')).toHaveValue(1);
        expect(normalize(submitButton().textContent)).toContain('Cobrar $ 45.000');
        expect(screen.queryByText('Impuesto')).not.toBeInTheDocument();
    });

    it('adds the tax of the product on top of the subtotal', async () => {
        renderPos();
        await addProduct('ar', 'Aretes dorados');

        expect(screen.getAllByText(hasText('$ 38.500'), { selector: 'span' }).length).toBeGreaterThan(0);
        expect(screen.getByText('Impuesto')).toBeInTheDocument();
        expect(screen.getAllByText(hasText('$ 7.315'), { selector: 'span' }).length).toBeGreaterThan(0);
        expect(normalize(submitButton().textContent)).toContain('Cobrar $ 45.815');
    });

    it('sums the quantity of the same product and stops at its stock', async () => {
        renderPos();
        await addProduct('ar', 'Aretes dorados');

        const more = screen.getByLabelText('Aumentar cantidad de Aretes dorados');
        fireEvent.click(more);
        fireEvent.click(more);

        expect(screen.getByLabelText('Cantidad de Aretes dorados')).toHaveValue(3);
        expect(more).toBeDisabled();
    });

    it('refuses a product with no stock', async () => {
        renderPos();
        await search('pu');
        const button = await screen.findByRole('button', { name: /Agregar Pulsera agotada/ }, { timeout: 2000 });

        expect(button).toBeDisabled();
    });

    it('adds the first result with Enter while the search box is focused (it is focused on load)', async () => {
        renderPos();
        await search('co');
        await screen.findByRole('button', { name: /Agregar Collar de perlas Luna/ }, { timeout: 2000 });

        expect(screen.getByPlaceholderText(/Buscar producto por nombre o código/)).toHaveFocus();
        fireEvent.keyDown(window, { key: 'Enter' });

        expect(await screen.findByLabelText('Cantidad de Collar de perlas Luna')).toBeInTheDocument();
    });

    it('removes a line when its quantity goes down to zero or with the trash button', async () => {
        renderPos();
        await addProduct('co', 'Collar de perlas Luna');

        fireEvent.click(screen.getByLabelText('Disminuir cantidad de Collar de perlas Luna'));

        expect(screen.getByText('Carrito vacío')).toBeInTheDocument();

        await addProduct('co', 'Collar de perlas Luna');
        fireEvent.click(screen.getByLabelText('Eliminar Collar de perlas Luna del carrito'));
        expect(screen.getByText('Carrito vacío')).toBeInTheDocument();
    });

    it('keeps typed quantities inside the stock', async () => {
        renderPos();
        await addProduct('ar', 'Aretes dorados');

        fireEvent.change(screen.getByLabelText('Cantidad de Aretes dorados'), { target: { value: '99' } });

        expect(screen.getByLabelText('Cantidad de Aretes dorados')).toHaveValue(3);
    });

    it('asks for the price of a variable-price service, prefilled with the catalog price, and rejects zero', async () => {
        renderPos();
        await addProduct('ar', 'Arreglo de joyería');

        expect(screen.getByText('Precio del servicio')).toBeInTheDocument();
        expect(priceModalInput().value.replace(/\D/g, '')).toBe('20000');

        fireEvent.change(priceModalInput(), { target: { value: '' } });
        fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));

        expect(toast.error).toHaveBeenCalledWith('Ingresa un precio válido');
        expect(screen.queryByLabelText('Cantidad de Arreglo de joyería')).not.toBeInTheDocument();
    });

    it('adds a variable-price service at the price the cashier types', async () => {
        renderPos();
        await addProduct('ar', 'Arreglo de joyería');

        fireEvent.change(priceModalInput(), { target: { value: '35000' } });
        fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));

        expect(await screen.findByLabelText('Cantidad de Arreglo de joyería')).toBeInTheDocument();
        expect(normalize(submitButton().textContent)).toContain('Cobrar $ 35.000');
    });
});

describe('POS: discounts', () => {
    async function withCollar() {
        renderPos();
        await addProduct('co', 'Collar de perlas Luna');
    }

    it('applies a percentage discount to the gross amount', async () => {
        await withCollar();

        fireEvent.change(discountSelect(), { target: { value: 'percentage' } });
        fireEvent.change(screen.getAllByPlaceholderText('0').find((i) => (i as HTMLInputElement).type === 'number') as HTMLInputElement, {
            target: { value: '10' },
        });

        expect(normalize(submitButton().textContent)).toContain('Cobrar $ 40.500');
        expect(screen.getByText(/− \$\s4\.500/)).toBeInTheDocument();
    });

    it('caps a fixed discount at the gross amount so the total never goes negative', async () => {
        await withCollar();

        fireEvent.change(discountSelect(), { target: { value: 'fixed' } });
        const amount = screen
            .getAllByPlaceholderText('0')
            .find((i) => (i as HTMLInputElement).type === 'text' && !(i as HTMLInputElement).value) as HTMLInputElement;
        fireEvent.change(amount, { target: { value: '999999' } });

        expect(submitButton()).toHaveTextContent(/^Cobrar/);
        expect(normalize(submitButton().textContent)).not.toContain('$ 999');
        expect(screen.getByText(/− \$\s45\.000/)).toBeInTheDocument();
    });

    it('applies the wholesale percentage of the selected client and clears it for the others', async () => {
        await withCollar();

        fireEvent.change(clientSelect(), { target: { value: '2' } });
        expect(screen.getByText('Cliente mayorista · 15% aplicado')).toBeInTheDocument();
        expect(normalize(submitButton().textContent)).toContain('Cobrar $ 38.250');

        fireEvent.change(clientSelect(), { target: { value: '3' } });
        expect(screen.queryByText(/Cliente mayorista/)).not.toBeInTheDocument();
        expect(normalize(submitButton().textContent)).toContain('Cobrar $ 45.000');
    });
});

describe('POS: charging', () => {
    async function withCollar() {
        renderPos();
        await addProduct('co', 'Collar de perlas Luna');
    }

    it('requires a payment method', async () => {
        await withCollar();

        fireEvent.click(submitButton());

        expect(toast.error).toHaveBeenCalledWith('Selecciona un método de pago');
        expect(router.post).not.toHaveBeenCalled();
    });

    it('refuses cash that does not cover the total', async () => {
        await withCollar();
        fireEvent.click(screen.getByRole('button', { name: 'método-efectivo' }));
        fireEvent.change(receivedInput(), { target: { value: '40000' } });

        fireEvent.click(submitButton());

        expect(toast.error).toHaveBeenCalledWith('El monto recibido es menor al total');
        expect(router.post).not.toHaveBeenCalled();
    });

    it('shows the change once the cash covers the total', async () => {
        await withCollar();
        fireEvent.click(screen.getByRole('button', { name: 'método-efectivo' }));

        fireEvent.change(receivedInput(), { target: { value: '50000' } });

        const change = screen.getByText('Cambio:').parentElement as HTMLElement;
        expect(normalize(change.textContent)).toContain('$ 5.000');
    });

    it('fills the exact amount and the suggested bills', async () => {
        await withCollar();
        fireEvent.click(screen.getByRole('button', { name: 'método-efectivo' }));

        fireEvent.click(screen.getByRole('button', { name: /Pago exacto/ }));
        expect(receivedInput()).toHaveValue('45.000');

        fireEvent.click(screen.getByRole('button', { name: '50.000' }));
        expect(receivedInput()).toHaveValue('50.000');
    });

    it('sends a cash sale with every field the server expects', async () => {
        await withCollar();
        fireEvent.click(screen.getByRole('button', { name: 'método-efectivo' }));
        fireEvent.change(receivedInput(), { target: { value: '50000' } });

        fireEvent.click(submitButton());

        const { url, data } = lastPost();
        expect(url).toBe('/sales.store');
        expect(data).toMatchObject({
            source: 'pos',
            branch_id: '1',
            client_id: '1',
            seller_id: '7',
            net: '45000.00',
            total: '45000.00',
            amount_paid: '50000.00',
            change_amount: '5000.00',
            payment_method: 'cash',
            status: 'completed',
            discount_type: 'none',
            discount_value: '0',
            notes: '',
            products: [{ id: 11, quantity: 1, price: 45000, subtotal: 45000 }],
        });
        expect(String(data.date)).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    it('sends a non-cash sale as paid in full with no change', async () => {
        await withCollar();
        fireEvent.click(screen.getByRole('button', { name: 'método-transferencia' }));

        fireEvent.click(submitButton());

        expect(lastPost().data).toMatchObject({ payment_method: 'transfer', amount_paid: '45000.00', change_amount: '0', total: '45000.00' });
    });

    it('sends the discount and the wholesale client as they are on screen', async () => {
        await withCollar();
        fireEvent.change(clientSelect(), { target: { value: '2' } });
        fireEvent.click(screen.getByRole('button', { name: 'método-transferencia' }));

        fireEvent.click(submitButton());

        expect(lastPost().data).toMatchObject({
            client_id: '2',
            discount_type: 'percentage',
            discount_value: '15',
            total: '38250.00',
            net: '45000.00',
        });
    });

    it('charges only once when F9 is pressed twice in a row', async () => {
        await withCollar();
        fireEvent.click(screen.getByRole('button', { name: 'método-transferencia' }));

        fireEvent.keyDown(window, { key: 'F9' });
        fireEvent.keyDown(window, { key: 'F9' });

        expect(router.post).toHaveBeenCalledTimes(1);
    });

    it('blocks the sale and opens the cash session form when the business requires an open cash register', async () => {
        renderPos({ currentSession: null, requireCashSession: true });

        expect(screen.getAllByText('Abrir caja').length).toBeGreaterThan(0);
        expect(screen.getByText('Debes abrir la caja antes de realizar ventas.')).toBeInTheDocument();
    });

    it('clears the cart, the payment and the client after a successful sale', async () => {
        await withCollar();
        fireEvent.change(clientSelect(), { target: { value: '3' } });
        fireEvent.click(screen.getByRole('button', { name: 'método-transferencia' }));
        fireEvent.click(submitButton());

        await act(async () => {
            lastPost().options.onSuccess?.({ props: { flash: { last_sale_id: 77, last_sale_code: 'V-77' } } });
            lastPost().options.onFinish?.();
        });

        expect(screen.getByText('Carrito vacío')).toBeInTheDocument();
        expect(clientSelect().value).toBe('1');
        expect(toast.success).toHaveBeenCalled();
    });

    it('keeps the cart when the server rejects the sale and reports every error', async () => {
        await withCollar();
        fireEvent.click(screen.getByRole('button', { name: 'método-transferencia' }));
        fireEvent.click(submitButton());

        await act(async () => {
            lastPost().options.onError?.({ stock: 'Sin stock suficiente.' });
            lastPost().options.onFinish?.();
        });

        expect(toast.error).toHaveBeenCalledWith('Sin stock suficiente.');
        expect(screen.getByLabelText('Cantidad de Collar de perlas Luna')).toBeInTheDocument();
        expect(submitButton()).toBeEnabled();
    });
});

describe('POS: quotes (pending sales)', () => {
    it('saves the cart as a pending sale without payment', async () => {
        renderPos();
        await addProduct('co', 'Collar de perlas Luna');

        fireEvent.click(screen.getByRole('button', { name: /Guardar cotización/ }));

        expect(lastPost().url).toBe('/sales.store');
        expect(lastPost().data).toMatchObject({
            source: 'pos',
            status: 'pending',
            payment_method: '',
            amount_paid: '0',
            change_amount: '0',
            total: '45000.00',
        });
    });

    it('loads a pending sale into the cart and completes it through the complete route', async () => {
        renderPos({ pendingSalesCount: 1 });

        fireEvent.click(screen.getByTitle('Cotizaciones pendientes'));
        fireEvent.click(await screen.findByRole('button', { name: 'Cargar' }));

        expect(screen.getByText('Completando cotización')).toBeInTheDocument();
        expect(normalize(submitButton().textContent)).toContain('Cobrar $ 40.500');
        expect(clientSelect()).toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: 'método-transferencia' }));
        fireEvent.click(submitButton());

        const { url, data } = lastPost();
        expect(url).toBe('/sales.complete/90');
        expect(data).toMatchObject({
            payment_method: 'transfer',
            total: '40500.00',
            net: '45000.00',
            discount_type: 'percentage',
            discount_value: '10',
        });
        expect(data).not.toHaveProperty('source');
    });

    it('updates the loaded quote instead of creating another one', async () => {
        renderPos({ pendingSalesCount: 1 });
        fireEvent.click(screen.getByTitle('Cotizaciones pendientes'));
        fireEvent.click(await screen.findByRole('button', { name: 'Cargar' }));

        fireEvent.click(screen.getByRole('button', { name: /Actualizar cotización/ }));

        expect(router.patch).toHaveBeenCalledWith('/sales.pending.update/90', expect.objectContaining({ total: '40500.00' }), expect.any(Object));
        expect(router.post).not.toHaveBeenCalled();
    });
});

describe('POS: credit sales', () => {
    it('asks for a client other than the default one before selling on credit', async () => {
        renderPos();
        await addProduct('co', 'Collar de perlas Luna');

        fireEvent.click(screen.getByRole('button', { name: /Vender a crédito/ }));

        expect(toast.error).toHaveBeenCalledWith('Selecciona un cliente para registrar un crédito');
        expect(screen.queryByText('Registrar como crédito')).not.toBeInTheDocument();
    });

    it('registers a credit with the items, the client and the conditions chosen', async () => {
        renderPos();
        await addProduct('co', 'Collar de perlas Luna');
        fireEvent.change(clientSelect(), { target: { value: '3' } });

        fireEvent.click(screen.getByRole('button', { name: /Vender a crédito/ }));
        expect(screen.getByText('Registrar como crédito')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Confirmar crédito/ }));

        const { url, data } = lastPost();
        expect(url).toBe('/credits');
        expect(data).toMatchObject({
            type: 'layaway',
            client_id: 3,
            branch_id: 1,
            initial_payment: null,
            items: [{ product_id: 11, quantity: 1, unit_price: 45000, subtotal: 45000 }],
        });
    });

    it('does not allow an initial payment above the total', async () => {
        renderPos();
        await addProduct('co', 'Collar de perlas Luna');
        fireEvent.change(clientSelect(), { target: { value: '3' } });
        fireEvent.click(screen.getByRole('button', { name: /Vender a crédito/ }));

        fireEvent.change(screen.getByText('Abono inicial (opcional)').parentElement!.querySelector('input') as HTMLInputElement, {
            target: { value: '99999999' },
        });

        expect(screen.getByRole('button', { name: /Confirmar crédito/ })).toBeDisabled();
    });

    it('hides the credit button when the credits module is off', async () => {
        page.moduleConfig = { credits: false };
        renderPos();
        await addProduct('co', 'Collar de perlas Luna');

        expect(screen.queryByRole('button', { name: /Vender a crédito/ })).not.toBeInTheDocument();
    });
});

describe('POS: cash register', () => {
    it('does not charge with F9 while the cash movement dialog is open', async () => {
        renderPos();
        await addProduct('co', 'Collar de perlas Luna');
        fireEvent.click(screen.getByRole('button', { name: 'método-transferencia' }));
        fireEvent.click(within(screen.getByTestId('header-actions')).getByRole('button', { name: /^Caja ·/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Ingreso de efectivo' }));

        fireEvent.keyDown(window, { key: 'F9' });

        expect(router.post).not.toHaveBeenCalled();
    });

    it('shows when the open cash register started and offers to close it', () => {
        renderPos();

        const widget = within(screen.getByTestId('header-actions')).getByRole('button', { name: /^Caja ·/ });
        fireEvent.click(widget);
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar caja' }));

        expect(router.visit).toHaveBeenCalledWith('/cash-sessions.close.form/5');
    });

    it('warns when the cash register has been open for more than ten hours and lets the user dismiss it', () => {
        renderPos({ currentSession: { ...openSession, opened_at: new Date(Date.now() - 11 * 3600 * 1000).toISOString() } as never });

        expect(screen.getByText(/lleva más de 10 horas abierta/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Descartar aviso' }));
        expect(screen.queryByText(/lleva más de 10 horas abierta/)).not.toBeInTheDocument();
    });

    it('does not warn for a recent cash register', () => {
        renderPos();

        expect(screen.queryByText(/lleva más de 10 horas abierta/)).not.toBeInTheDocument();
    });
});
