import { router } from '@inertiajs/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Create from '../create';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    router: { post: vi.fn(), reload: vi.fn() },
    Head: () => null,
    Link: 'a',
    usePage: vi.fn(() => ({ props: { auth: { user: { id: 7, branch_id: 1 } }, business: { brand_color: '#C4686F' } } })),
}));
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/clients', () => ({ CardCreateClient: () => <div>crear-cliente</div> }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/components/PaymentMethodSelect', () => ({
    default: ({ onValueChange }: { onValueChange: (value: string) => void }) => (
        <div>
            <button type="button" onClick={() => onValueChange('cash')}>
                pago-efectivo
            </button>
            <button type="button" onClick={() => onValueChange('transfer')}>
                pago-transferencia
            </button>
        </div>
    ),
}));

const products = [
    { id: 11, name: 'Collar de perlas Luna', code: 'COL-001', sale_price: 45000, tax: 0, stock: 12, image_url: '' },
    { id: 12, name: 'Aretes dorados', code: 'ARE-014', sale_price: 38500, tax: 19, stock: 3, image_url: '' },
    { id: 13, name: 'Pulsera agotada', code: 'PUL-032', sale_price: 12000, tax: 0, stock: 0, image_url: '' },
];

const props = {
    branches: [{ id: 1, name: 'Centro' }],
    clients: [
        { id: 1, name: 'Consumidor Final' },
        { id: 3, name: 'María Gómez' },
    ],
    sellers: [],
} as unknown as ComponentProps<typeof Create>;

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
    vi.stubGlobal('IntersectionObserver', NoopObserver);
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
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn(() => false);
});

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({ ok: true, json: async () => products })),
    );
});

async function addFromSearch(term: string, name: string) {
    fireEvent.change(screen.getByLabelText('Buscar producto'), { target: { value: term } });
    fireEvent.click(await screen.findByRole('button', { name: `Agregar ${name}` }, { timeout: 2000 }));
}

const normalize = (text: string | null) => (text ?? '').replace(/\s/g, ' ');
const totalOf = () => screen.getAllByText(/^\$\s[\d.]+$/, { selector: '.sr-only' }).map((el) => normalize(el.textContent));

describe('Sales create', () => {
    it('starts empty with a hint to search', () => {
        render(<Create {...props} />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nueva venta');
        expect(screen.getByText('Escribe al menos 2 letras para buscar.')).toBeInTheDocument();
        expect(screen.getByText(/Aún no hay productos/)).toBeInTheDocument();
    });

    it('searches products and shows price and stock, disabling those without stock', async () => {
        render(<Create {...props} />);

        fireEvent.change(screen.getByLabelText('Buscar producto'), { target: { value: 'co' } });

        expect(await screen.findByRole('button', { name: 'Agregar Collar de perlas Luna' }, { timeout: 2000 })).toBeEnabled();
        expect(screen.getByText('Sin stock')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Agregar Pulsera agotada' })).toBeDisabled();
    });

    it('adds a product to the sale and updates the total with its tax', async () => {
        render(<Create {...props} />);

        await addFromSearch('ar', 'Aretes dorados');

        expect(screen.getAllByText('Aretes dorados').length).toBeGreaterThan(0);
        await waitFor(() => expect(totalOf()).toContain('$ 45.815'));
    });

    it('keeps the quantity inside the stock and shows when the maximum is reached', async () => {
        render(<Create {...props} />);
        await addFromSearch('ar', 'Aretes dorados');

        const more = screen.getAllByRole('button', { name: 'Más Aretes dorados' })[0];
        fireEvent.click(more);
        fireEvent.click(more);

        expect(more).toBeDisabled();
        expect(screen.getAllByText('máx.').length).toBeGreaterThan(0);
        expect(screen.getAllByRole('button', { name: 'Menos Aretes dorados' })[0]).toBeEnabled();
    });

    it('applies a percentage discount to the gross amount', async () => {
        render(<Create {...props} />);
        await addFromSearch('co', 'Collar de perlas Luna');

        fireEvent.click(screen.getByRole('button', { name: 'Porcentaje %' }));
        fireEvent.change(screen.getByLabelText('Porcentaje de descuento'), { target: { value: '10' } });

        await waitFor(() => expect(totalOf()).toContain('$ 40.500'));
        expect(screen.getAllByText(/− \$ 4\.500/).length).toBeGreaterThan(0);
    });

    it('refuses to register a sale without products', () => {
        render(<Create {...props} />);

        fireEvent.submit(screen.getByRole('button', { name: 'Registrar venta' }).closest('form') as HTMLFormElement);

        expect(toast.error).toHaveBeenCalledWith('Debes agregar al menos un producto a la venta.');
        expect(router.post).not.toHaveBeenCalled();
    });

    it('asks for enough cash and fills the amount with the quick buttons', async () => {
        render(<Create {...props} />);
        await addFromSearch('co', 'Collar de perlas Luna');
        fireEvent.click(screen.getByRole('button', { name: 'pago-efectivo' }));

        fireEvent.submit(screen.getByRole('button', { name: 'Registrar venta' }).closest('form') as HTMLFormElement);
        expect(toast.error).toHaveBeenCalled();
        expect(router.post).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: '10 mil' }));
        expect(normalize((screen.getByLabelText(/Con cuánto paga/) as HTMLInputElement).value)).toBe('50.000');
        expect(within(screen.getByText('Cambio').parentElement as HTMLElement).getByText(/5\.000/)).toBeInTheDocument();
    });

    it('posts the sale with the products, totals and payment method', async () => {
        render(<Create {...props} />);
        await addFromSearch('co', 'Collar de perlas Luna');
        fireEvent.click(screen.getByRole('button', { name: 'pago-transferencia' }));

        fireEvent.submit(screen.getByRole('button', { name: 'Registrar venta' }).closest('form') as HTMLFormElement);

        expect(router.post).toHaveBeenCalledTimes(1);
        const [url, data] = vi.mocked(router.post).mock.calls[0] as unknown as [string, Record<string, unknown>];
        expect(url).toBe('/sales.store');
        expect(data).toMatchObject({
            payment_method: 'transfer',
            branch_id: '1',
            seller_id: '7',
            total: '45000.00',
            products: [{ id: 11, quantity: 1, price: 45000, subtotal: 45000 }],
        });
    });

    it('removes a product from the sale', async () => {
        render(<Create {...props} />);
        await addFromSearch('co', 'Collar de perlas Luna');

        fireEvent.click(screen.getByRole('button', { name: 'Quitar Collar de perlas Luna' }));

        await waitFor(() => expect(screen.getByText(/Aún no hay productos/)).toBeInTheDocument());
    });

    it('opens the new client dialog', () => {
        render(<Create {...props} />);

        fireEvent.click(screen.getByRole('button', { name: 'Crear cliente' }));

        expect(screen.getByText('crear-cliente')).toBeInTheDocument();
    });
});
