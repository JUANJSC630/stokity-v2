import { fireEvent, render, screen, within } from '@testing-library/react';
import { createRef } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileTabs } from '../mobile-tabs';
import { ProductSearchPanel } from '../product-search-panel';

vi.mock('@inertiajs/react', () => ({ usePage: vi.fn(() => ({ props: { business: { brand_color: '#C4686F' } } })) }));

const products = [
    {
        id: 1,
        name: 'Collar de perlas Luna',
        code: 'COL-001',
        sale_price: 45000,
        tax: 0,
        stock: 12,
        type: 'producto',
        variable_price: false,
        image_url: '',
    },
    {
        id: 2,
        name: 'Pulsera agotada',
        code: 'PUL-032',
        sale_price: 12000,
        tax: 0,
        stock: 0,
        type: 'producto',
        variable_price: false,
        image_url: 'https://cdn.test/p.jpg',
    },
    {
        id: 3,
        name: 'Arreglo de joyería',
        code: 'SRV-001',
        sale_price: 20000,
        tax: 0,
        stock: 0,
        type: 'servicio',
        variable_price: true,
        image_url: '',
    },
] as never[];

const categories = [
    { id: 1, name: 'Collares' },
    { id: 2, name: 'Servicios' },
    { id: 3, name: 'Aretes' },
];

function setup(overrides: Partial<React.ComponentProps<typeof ProductSearchPanel>> = {}) {
    const props: React.ComponentProps<typeof ProductSearchPanel> = {
        query: '',
        onQueryChange: vi.fn(),
        searching: false,
        searchRef: createRef<HTMLInputElement>(),
        categories,
        selectedCategory: '',
        selectedType: '',
        onSelectAll: vi.fn(),
        onSelectServices: vi.fn(),
        onSelectCategory: vi.fn(),
        results: [],
        onAdd: vi.fn(),
        cartIsEmpty: true,
        showShortcuts: false,
        onShowShortcuts: vi.fn(),
        ...overrides,
    };
    render(<ProductSearchPanel {...props} />);
    return props;
}

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
});

beforeEach(() => vi.clearAllMocks());

describe('ProductSearchPanel', () => {
    it('invites to search when nothing was typed and the cart is empty', () => {
        setup();

        expect(screen.getByText('Escribe para buscar productos')).toBeInTheDocument();
    });

    it('does not show that invitation once the cart has items', () => {
        setup({ cartIsEmpty: false });

        expect(screen.queryByText('Escribe para buscar productos')).not.toBeInTheDocument();
    });

    it('reports typing and clears the search with the inline button', () => {
        const { onQueryChange } = setup({ query: 'co' });

        fireEvent.change(screen.getByLabelText('Buscar producto'), { target: { value: 'col' } });
        fireEvent.click(screen.getByRole('button', { name: 'Borrar búsqueda' }));

        expect(onQueryChange).toHaveBeenCalledWith('col');
        expect(onQueryChange).toHaveBeenCalledWith('');
    });

    it('shows the searching hint instead of the clear button while searching', () => {
        setup({ query: 'co', searching: true });

        expect(screen.getByText('Buscando...')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Borrar búsqueda' })).not.toBeInTheDocument();
    });

    it('lists the services chip once, hides a category that is itself called Servicios, and marks the selection', () => {
        setup({ selectedCategory: '3' });

        expect(screen.getAllByRole('button', { name: 'Servicios' })).toHaveLength(1);
        expect(screen.getByRole('button', { name: 'Aretes' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('reports each kind of filter', () => {
        const props = setup();

        fireEvent.click(screen.getByRole('button', { name: 'Servicios' }));
        fireEvent.click(screen.getByRole('button', { name: 'Collares' }));
        fireEvent.click(screen.getByRole('button', { name: 'Todas' }));

        expect(props.onSelectServices).toHaveBeenCalledTimes(1);
        expect(props.onSelectCategory).toHaveBeenCalledWith('1');
        expect(props.onSelectAll).toHaveBeenCalledTimes(1);
    });

    it('lists results with price and stock, and adds the one that is tapped', () => {
        const props = setup({ query: 'co', results: products });

        const collar = screen.getByRole('button', { name: /Agregar Collar de perlas Luna al carrito, \$\s45\.000/ });
        expect(within(collar).getByText('Stock: 12')).toBeInTheDocument();
        fireEvent.click(collar);

        expect(props.onAdd).toHaveBeenCalledWith(products[0]);
    });

    it('disables products without stock but keeps services available', () => {
        setup({ query: 'a', results: products });

        expect(screen.getByRole('button', { name: /Agregar Pulsera agotada/ })).toBeDisabled();
        expect(screen.getByRole('button', { name: /Agregar Arreglo de joyería/ })).toBeEnabled();
        expect(screen.getByText('A cotizar')).toBeInTheDocument();
    });

    it('says when nothing matches', () => {
        setup({ query: 'zzz', results: [] });

        expect(screen.getByText('No se encontraron productos')).toBeInTheDocument();
    });

    it('does not claim "nothing found" while it is still searching', () => {
        setup({ query: 'zzz', searching: true });

        expect(screen.queryByText('No se encontraron productos')).not.toBeInTheDocument();
    });

    it('opens and closes the shortcuts panel', () => {
        const { onShowShortcuts } = setup({ showShortcuts: true });

        expect(screen.getByText('Atajos de teclado')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar atajos' }));
        fireEvent.click(screen.getByTitle('Ver todos los atajos (?)'));

        expect(onShowShortcuts).toHaveBeenCalledWith(false);
        expect(onShowShortcuts).toHaveBeenCalledWith(true);
    });
});

describe('MobileTabs', () => {
    it('marks the active view and reports the one the user picks', () => {
        const onChange = vi.fn();
        render(<MobileTabs active="search" onChange={onChange} itemCount={0} total={0} />);

        expect(screen.getByRole('tab', { name: 'Buscar' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tab', { name: 'Carrito' })).toHaveAttribute('aria-selected', 'false');

        fireEvent.click(screen.getByRole('tab', { name: 'Carrito' }));
        expect(onChange).toHaveBeenCalledWith('cart');
    });

    it('shows how many lines and the running total on the cart tab', () => {
        render(<MobileTabs active="search" onChange={vi.fn()} itemCount={3} total={135000} />);

        const cart = screen.getByRole('tab', { name: /Ver carrito/ });
        expect(cart.textContent?.replace(/\s/g, ' ')).toContain('Ver carrito · $ 135.000');
        expect(within(cart).getByText('3')).toBeInTheDocument();
    });

    it('goes back to search from the cart view', () => {
        const onChange = vi.fn();
        render(<MobileTabs active="cart" onChange={onChange} itemCount={2} total={90000} />);

        fireEvent.click(screen.getByRole('tab', { name: 'Buscar' }));

        expect(onChange).toHaveBeenCalledWith('search');
    });
});
