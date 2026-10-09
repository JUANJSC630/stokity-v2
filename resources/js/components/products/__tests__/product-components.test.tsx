import { router } from '@inertiajs/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageField, MoneyField, NumberField, SwitchRow, TaxField, TypeSwitch } from '../product-fields';
import { ProductCards, ProductTable, priceLabel } from '../product-list';
import { ProductThumb, StatusPill, StockFigure, TypePill, isLowStock } from '../product-meta';

vi.mock('@inertiajs/react', () => ({ Link: 'a', router: { visit: vi.fn() } }));
vi.mock('@/lib/image-upload', () => ({ prepareImageForUpload: vi.fn(async (file: File) => file) }));

const product = (overrides: Record<string, unknown> = {}) =>
    ({
        id: 1,
        name: 'Bolso',
        code: 'SKU-1',
        sale_price: 150000,
        tax: 19,
        stock: 12,
        min_stock: 5,
        status: true,
        type: 'producto',
        variable_price: false,
        image_url: '/img/1.jpg',
        category: { id: 1, name: 'Bolsos' },
        branch: { id: 1, name: 'Centro' },
        ...overrides,
    }) as never;

const text = (node: HTMLElement) => (node.textContent ?? '').replace(/\s/g, ' ');

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
});

beforeEach(() => vi.clearAllMocks());

describe('product meta', () => {
    it('treats stock at or under the minimum as low, and never a service', () => {
        expect(isLowStock({ type: 'producto', stock: 5, min_stock: 5 })).toBe(true);
        expect(isLowStock({ type: 'producto', stock: 6, min_stock: 5 })).toBe(false);
        expect(isLowStock({ type: 'servicio', stock: 0, min_stock: 5 })).toBe(false);
    });

    it('shows a dash for a service and the figure alone otherwise', () => {
        const { rerender } = render(<StockFigure product={{ type: 'servicio', stock: 0, min_stock: 0 }} />);
        expect(screen.getByText('—')).toBeInTheDocument();

        rerender(<StockFigure product={{ type: 'producto', stock: 3, min_stock: 5 }} />);
        expect(screen.getByText('3').className).toContain('red');

        rerender(<StockFigure product={{ type: 'producto', stock: 9, min_stock: 5 }} />);
        expect(screen.getByText('9').className).not.toContain('red');
    });

    it('names the type and the state', () => {
        const { rerender } = render(<TypePill type="servicio" />);
        expect(screen.getByText('Servicio')).toBeInTheDocument();
        rerender(<TypePill type="producto" />);
        expect(screen.getByText('Producto')).toBeInTheDocument();

        rerender(<StatusPill active={false} />);
        expect(screen.getByText('Inactivo')).toBeInTheDocument();
        rerender(<StatusPill active />);
        expect(screen.getByText('Activo')).toBeInTheDocument();
    });

    it('renders the photo only when there is an address', () => {
        const { rerender } = render(<ProductThumb src="/a.jpg" name="Bolso" />);
        expect(screen.getByAltText('Bolso')).toHaveAttribute('src', '/a.jpg');

        rerender(<ProductThumb src="" name="Bolso" />);
        expect(screen.queryByAltText('Bolso')).not.toBeInTheDocument();
    });
});

describe('product list', () => {
    const base = { selectable: true, selectedIds: new Set<number>(), onToggle: vi.fn(), busy: false, showBranch: false, canEdit: true };

    it('words the price, with "Variable" for a quoted service', () => {
        expect(priceLabel(product()).replace(/\s/g, ' ')).toBe('$ 150.000');
        expect(priceLabel(product({ type: 'servicio', variable_price: true }))).toBe('Variable');
        expect(priceLabel(product({ type: 'servicio', variable_price: false })).replace(/\s/g, ' ')).toBe('$ 150.000');
    });

    it('lets a card be ticked for labels without opening it', () => {
        render(<ProductCards {...base} products={[product()]} />);

        fireEvent.click(screen.getByLabelText('Seleccionar Bolso para imprimir etiqueta'));

        expect(base.onToggle).toHaveBeenCalledWith(1);
        expect(router.visit).not.toHaveBeenCalled();
    });

    it('has no checkbox when the user cannot print labels', () => {
        render(<ProductCards {...base} selectable={false} products={[product()]} />);

        expect(screen.queryByLabelText(/para imprimir etiqueta/)).not.toBeInTheDocument();
    });

    it('shows the branch next to the category only when asked', () => {
        const { rerender } = render(<ProductCards {...base} products={[product()]} />);
        expect(text(screen.getByRole('link', { name: /Bolso/ }))).not.toContain('Centro');

        rerender(<ProductCards {...base} showBranch products={[product()]} />);
        expect(text(screen.getByRole('link', { name: /Bolso/ }))).toContain('SKU-1 · Bolsos · Centro');
    });

    it('opens the product when a table row is pressed, but not when its checkbox or links are', () => {
        render(<ProductTable {...base} canEdit products={[product()]} />);

        fireEvent.click(screen.getByLabelText('Seleccionar Bolso para imprimir etiqueta'));
        expect(router.visit).not.toHaveBeenCalled();

        const edit = screen.getByRole('link', { name: 'Editar Bolso' });
        edit.addEventListener('click', (event) => event.preventDefault());
        fireEvent.click(edit);
        expect(router.visit).not.toHaveBeenCalled();

        fireEvent.click(within(screen.getByRole('table')).getByText('SKU-1'));
        expect(router.visit).toHaveBeenCalledWith('/products/1');
    });

    it('offers the edit shortcut only with permission and marks the selected row', () => {
        const { rerender } = render(<ProductTable {...base} canEdit={false} selectedIds={new Set([1])} products={[product()]} />);
        expect(screen.queryByRole('link', { name: 'Editar Bolso' })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Ver Bolso' })).toHaveAttribute('href', '/products/1');
        expect(screen.getByLabelText('Seleccionar Bolso para imprimir etiqueta')).toBeChecked();

        rerender(<ProductTable {...base} canEdit products={[product()]} />);
        expect(screen.getByRole('link', { name: 'Editar Bolso' })).toHaveAttribute('href', '/products/1/edit');
    });

    it('hides the selection and branch columns when they do not apply', () => {
        render(<ProductTable {...base} selectable={false} products={[product()]} />);

        expect(screen.queryByText('Sucursal')).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/para imprimir etiqueta/)).not.toBeInTheDocument();
    });
});

describe('product fields', () => {
    it('chooses the type and says which one is chosen', () => {
        const onChange = vi.fn();
        render(<TypeSwitch value="producto" onChange={onChange} />);

        expect(screen.getByRole('button', { name: /Producto/ })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: /Servicio/ }));

        expect(onChange).toHaveBeenCalledWith('servicio');
    });

    it('keeps a picked or dropped image and shows its preview, ignoring other files', async () => {
        const onChange = vi.fn();
        render(<ImageField onChange={onChange} />);
        const picker = document.getElementById('image') as HTMLInputElement;
        const zone = picker.closest('label') as HTMLElement;
        const image = new File(['x'], 'a.png', { type: 'image/png' });

        fireEvent.drop(zone, { dataTransfer: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } });
        expect(onChange).not.toHaveBeenCalled();

        fireEvent.drop(zone, { dataTransfer: { files: [image] } });
        await waitFor(() => expect(screen.getByAltText('Vista previa')).toBeInTheDocument());
        expect(onChange).toHaveBeenCalledWith(image);
        expect(screen.getByText('Cambiar imagen')).toBeInTheDocument();
    });

    it('starts from the saved image and shows an upload error', () => {
        render(<ImageField initialPreview="/img/9.jpg" error="La imagen es muy pesada." onChange={vi.fn()} />);

        expect(screen.getByAltText('Vista previa')).toHaveAttribute('src', '/img/9.jpg');
        expect(screen.getByRole('alert')).toHaveTextContent('La imagen es muy pesada.');
    });

    it('lets the tax be typed or switched between 19% and 0%', () => {
        const onInput = vi.fn();
        const onToggle = vi.fn();
        const { rerender } = render(<TaxField value={19} hint="ayuda" onInput={onInput} onToggle={onToggle} />);

        fireEvent.change(document.getElementById('tax') as HTMLInputElement, { target: { value: '5' } });
        expect(onInput).toHaveBeenCalledWith(5);
        fireEvent.click(screen.getByRole('button', { name: 'Sin IVA (0%)' }));
        expect(onToggle).toHaveBeenCalledTimes(1);

        rerender(<TaxField value={0} hint="ayuda" onInput={onInput} onToggle={onToggle} />);
        expect(screen.getByRole('button', { name: 'IVA 19%' })).toBeInTheDocument();
    });

    it('formats money while typing and reports the number', () => {
        const onChange = vi.fn();
        render(<MoneyField id="sale_price" label="Precio de venta" required value={0} onChange={onChange} error="Obligatorio" />);

        fireEvent.change(document.getElementById('sale_price') as HTMLInputElement, { target: { value: '150000' } });

        expect(onChange).toHaveBeenCalledWith(150000);
        expect(screen.getByRole('alert')).toHaveTextContent('Obligatorio');
    });

    it('keeps an empty number empty instead of turning it into zero', () => {
        const onChange = vi.fn();
        render(<NumberField id="stock" label="Stock inicial" value={4} onChange={onChange} />);
        const input = document.getElementById('stock') as HTMLInputElement;

        fireEvent.change(input, { target: { value: '' } });
        expect(onChange).toHaveBeenLastCalledWith('');
        fireEvent.change(input, { target: { value: '7' } });
        expect(onChange).toHaveBeenLastCalledWith(7);
    });

    it('toggles a labeled switch row through its label', () => {
        const onCheckedChange = vi.fn();
        render(<SwitchRow id="status" title="Visibilidad" checked label="Activo" hint="ayuda" onCheckedChange={onCheckedChange} />);

        fireEvent.click(screen.getByRole('switch', { name: 'Activo' }));

        expect(onCheckedChange).toHaveBeenCalledWith(false);
    });
});
