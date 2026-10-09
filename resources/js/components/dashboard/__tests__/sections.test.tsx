import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { LowStockProducts } from '../low-stock-products';
import { SalesByBranch } from '../sales-by-branch';
import { TopProducts } from '../top-products';

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

beforeAll(() => {
    vi.stubGlobal('route', (name: string, id?: number) => `/${name}/${id ?? ''}`);
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
});

const lowStock = [
    { id: 1, name: 'Collar de perlas Luna', code: 'COL-001', stock: 2, min_stock: 5, category: { name: 'Collares' } },
    { id: 2, name: 'Aretes de plata', code: 'ARE-004', stock: 0, min_stock: 4 },
];

describe('LowStockProducts', () => {
    it('renders nothing without affected products', () => {
        const { container } = render(<LowStockProducts products={[]} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('summarises out-of-stock and below-minimum products', () => {
        render(<LowStockProducts products={lowStock} />);

        expect(screen.getByText('1 sin stock')).toBeInTheDocument();
        expect(screen.getByText('1 bajo mínimo')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Alerta de inventario/ })).toHaveAttribute('aria-expanded', 'true');
    });

    it('shows a stock level meter against the minimum for each product', () => {
        render(<LowStockProducts products={lowStock} />);

        const meters = screen.getAllByRole('meter');
        expect(meters).toHaveLength(2);
        expect(meters[0]).toHaveAttribute('aria-valuetext', '2 de 5 unidades mínimas');
        expect(meters[1]).toHaveAttribute('aria-valuetext', 'Sin stock');
        expect(screen.getByText('2 de 5')).toBeInTheDocument();
    });

    it('links every product with an accessible name', () => {
        render(<LowStockProducts products={lowStock} />);

        expect(screen.getByRole('link', { name: 'Ver producto Collar de perlas Luna' })).toHaveAttribute('href', '/products.show/1');
        expect(screen.getByRole('button', { name: 'Exportar lista de stock bajo como CSV' })).toBeInTheDocument();
    });
});

describe('TopProducts', () => {
    const products = [
        { id: 1, name: 'Collar', code: 'C-1', total_quantity: 40, total_amount: 1260000, sales_count: 31 },
        { id: 2, name: 'Aretes', code: 'A-1', total_quantity: 10, total_amount: 300000, sales_count: 1 },
    ];

    it('scales each bar against the best seller', () => {
        const { container } = render(<TopProducts products={products} />);

        const bars = Array.from(container.querySelectorAll<HTMLElement>('[aria-hidden="true"] > div')).map((bar) => bar.style.width);
        expect(bars).toEqual(['100%', '25%']);
        expect(screen.getByText('A-1 · 1 venta')).toBeInTheDocument();
    });

    it('shows an empty state', () => {
        render(<TopProducts products={[]} />);
        expect(screen.getByText('Sin datos de ventas')).toBeInTheDocument();
    });
});

describe('SalesByBranch', () => {
    const branches = [
        { id: 1, name: 'Centro', business_name: 'Stokity', total_sales: 30, total_amount: 2000000, average_sale: 66666 },
        { id: 2, name: 'Norte', business_name: '', total_sales: 5, total_amount: 500000, average_sale: 100000 },
    ];

    it('lists branches with a bar relative to the leading branch', () => {
        const { container } = render(<SalesByBranch branches={branches} />);

        expect(screen.getByText('Centro')).toBeInTheDocument();
        expect(screen.getByText('30 ventas')).toBeInTheDocument();
        const bars = Array.from(container.querySelectorAll<HTMLElement>('[aria-hidden="true"] > div')).map((bar) => bar.style.width);
        expect(bars).toEqual(['100%', '25%']);
    });

    it('shows an empty state', () => {
        render(<SalesByBranch branches={[]} />);
        expect(within(document.body).getByText('Sin datos de sucursales')).toBeInTheDocument();
    });
});
