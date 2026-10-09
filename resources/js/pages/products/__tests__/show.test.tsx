/** Characterization tests for the product detail: its facts, the service variant and the label printing. */
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import ProductShow from '../show';

const env = vi.hoisted(() => ({
    printer: { status: 'idle', selectedPrinter: '', printLabels: vi.fn() } as {
        status: string;
        selectedPrinter: string;
        printLabels: ReturnType<typeof vi.fn>;
    },
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: 'a',
    router: { visit: vi.fn() },
    usePage: () => ({ props: { business: { brand_color: '#C4686F' } } }),
}));
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/hooks/use-printer', () => ({ usePrinter: () => env.printer }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const baseProduct = {
    id: 7,
    name: 'Bolso de cuero',
    code: 'SKU-007',
    description: 'Cierre metálico\ncorrea ajustable',
    purchase_price: 80000,
    sale_price: 150000,
    tax: 19,
    stock: 12,
    min_stock: 5,
    status: true,
    type: 'producto',
    variable_price: false,
    image_url: '/img/7.jpg',
    category: { id: 1, name: 'Bolsos' },
    branch: { id: 1, name: 'Centro' },
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-10-02T10:00:00Z',
};

const renderShow = (overrides: Record<string, unknown> = {}) => render(<ProductShow product={{ ...baseProduct, ...overrides } as never} />);
const text = (node: HTMLElement) => (node.textContent ?? '').replace(/\s/g, ' ');

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
});

beforeEach(() => {
    vi.clearAllMocks();
    env.printer = { status: 'idle', selectedPrinter: '', printLabels: vi.fn() };
});

describe('Product detail', () => {
    it('shows the product with its prices, tax, stock, category, branch and dates', () => {
        renderShow();

        const page = text(document.body);
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bolso de cuero');
        expect(page).toContain('Detalles del producto');
        expect(screen.getByAltText('Bolso de cuero')).toHaveAttribute('src', '/img/7.jpg');
        expect(page).toContain('Precio de compra');
        expect(page).toContain('$ 80.000');
        expect(page).toContain('Precio de venta');
        expect(page).toContain('$ 150.000');
        expect(page).toContain('19%');
        expect(page).toContain('Stock actual');
        expect(screen.getByText('12')).toBeInTheDocument();
        expect(page).toContain('Stock mínimo');
        expect(page).toContain('SKU-007');
        expect(page).toContain('Bolsos');
        expect(page).toContain('Centro');
        expect(page).toContain('Activo');
        expect(screen.getByText(/Cierre metálico/)).toBeInTheDocument();
        expect(page).toContain('1 de sept de 2026');
        expect(page).toContain('2 de oct de 2026');
    });

    it('flags low stock and says when there is no description', () => {
        renderShow({ stock: 5, description: null });

        expect(screen.getByText('Bajo')).toBeInTheDocument();
        expect(screen.getByText('Sin descripción')).toBeInTheDocument();
    });

    it('does not flag stock above the minimum and marks inactive products', () => {
        renderShow({ stock: 6, status: false });

        expect(screen.queryByText('Bajo')).not.toBeInTheDocument();
        expect(screen.getByText('Inactivo')).toBeInTheDocument();
    });

    it('links to edit, back, the movements and the stock actions of the product', () => {
        renderShow();

        expect(document.querySelector('a[href="/products"]')).not.toBeNull();
        expect(document.querySelector('a[href="/products/7/edit"]')).not.toBeNull();
        expect(document.querySelector('a[href="/products/7/movements"]')).not.toBeNull();
        expect(document.querySelector('a[href="/stock-movements/create?product_id=7"]')).not.toBeNull();
        expect(document.querySelector('a[href="/stock-movements/create?product_id=7&type=write_off"]')).not.toBeNull();
    });

    it('presents a service without stock or movements, with its own wording', () => {
        renderShow({ type: 'servicio', stock: 0 });

        const page = text(document.body);
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bolso de cuero');
        expect(page).toContain('Detalles del servicio');
        expect(page).toContain('Costo del servicio');
        expect(page).toContain('Precio base');
        expect(page).not.toContain('Stock actual');
        expect(document.querySelector('a[href="/products/7/movements"]')).toBeNull();
        expect(document.querySelector('a[href^="/stock-movements/create"]')).toBeNull();
    });

    it('shows "Variable" instead of the base price for a variable-price service', () => {
        renderShow({ type: 'servicio', variable_price: true });

        expect(screen.getByText('Variable')).toBeInTheDocument();
        expect(text(document.body)).not.toContain('$ 150.000');
    });

    it('shows a QR code of the product code', () => {
        renderShow();

        expect(document.getElementById('product-qr')).not.toBeNull();
        expect(screen.getByRole('button', { name: /Descargar PNG/ })).toBeInTheDocument();
    });
});

describe('Product detail: label', () => {
    it('asks to connect the printer when it is not connected', () => {
        renderShow();

        fireEvent.click(screen.getByRole('button', { name: 'Imprimir etiqueta' }));

        expect(toast.error).toHaveBeenCalledWith('QZ Tray no conectado. Configura la impresora en el POS.');
        expect(env.printer.printLabels).not.toHaveBeenCalled();
    });

    it('prints the label of this product', async () => {
        env.printer = { status: 'connected', selectedPrinter: 'Zebra', printLabels: vi.fn().mockResolvedValue({ printedCount: 1 }) };
        renderShow();

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Imprimir etiqueta' }));
        });

        expect(env.printer.printLabels).toHaveBeenCalledWith([7]);
        expect(toast.success).toHaveBeenCalledWith('Etiqueta enviada a la impresora');
    });

    it('reports an unavailable product and a printer failure', async () => {
        env.printer = { status: 'connected', selectedPrinter: 'Zebra', printLabels: vi.fn().mockResolvedValueOnce({ printedCount: 0 }) };
        renderShow();
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Imprimir etiqueta' }));
        });
        expect(toast.error).toHaveBeenCalledWith('No se pudo imprimir la etiqueta: producto no disponible.');

        env.printer.printLabels.mockRejectedValueOnce(new Error('sin papel'));
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Imprimir etiqueta' }));
        });
        expect(toast.error).toHaveBeenCalledWith('Error al imprimir: sin papel');
    });
});
