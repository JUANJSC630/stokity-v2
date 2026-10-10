import { act, fireEvent, render, screen } from '@testing-library/react';
import axios from 'axios';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MovementTypePicker, ProductPicker, QuantityField, StockPreview } from '../movement-form-fields';
import { MovementTypePill, formatMovementDate, signedQuantity, stockAfter, typeStyle } from '../stock-meta';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));

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
afterEach(() => vi.useRealTimers());

describe('stock meta', () => {
    it('signs the quantity by what the movement does to the stock', () => {
        expect(signedQuantity('ingreso', 12)).toBe('+12');
        expect(signedQuantity('out', 5)).toBe('−5');
        expect(signedQuantity('write_off', 2)).toBe('−2');
        expect(signedQuantity('supplier_return', 3)).toBe('−3');
        expect(signedQuantity('adjustment', 40)).toBe('40');
    });

    it('predicts the stock after a movement with the server rule (never under zero)', () => {
        expect(stockAfter('ingreso', 10, 5)).toBe(15);
        expect(stockAfter('out', 10, 4)).toBe(6);
        expect(stockAfter('write_off', 3, 8)).toBe(0);
        expect(stockAfter('supplier_return', 10, 10)).toBe(0);
        expect(stockAfter('adjustment', 10, 25)).toBe(25);
    });

    it('names the types and keeps an unknown one readable', () => {
        expect(typeStyle('write_off').longLabel).toBe('Baja de Inventario');
        expect(typeStyle('algo').label).toBe('Desconocido');
        render(<MovementTypePill type="supplier_return" />);
        expect(screen.getByText('Dev. Proveedor')).toBeInTheDocument();
    });

    it('writes the date as day/month/year and time', () => {
        expect(formatMovementDate('2026-10-05T10:30:00')).toBe('05/10/2026 10:30');
    });
});

describe('type picker', () => {
    it('shows the five types, marks the chosen one and reports the change', () => {
        const onChange = vi.fn();
        render(<MovementTypePicker value="ingreso" onChange={onChange} />);

        expect(screen.getAllByRole('button')).toHaveLength(5);
        expect(screen.getByRole('button', { name: 'Ingreso' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Baja de Inventario' })).toHaveAttribute('aria-pressed', 'false');

        fireEvent.click(screen.getByRole('button', { name: 'Devolución a Proveedor' }));
        expect(onChange).toHaveBeenCalledWith('supplier_return');
    });
});

describe('quantity field', () => {
    it('starts empty and a tap on + gives the first unit', () => {
        const onChange = vi.fn();
        render(<QuantityField id="quantity" label="Cantidad a ingresar" value="" onChange={onChange} min={1} />);

        fireEvent.click(screen.getByRole('button', { name: 'Más cantidad' }));

        expect(onChange).toHaveBeenCalledWith('1');
    });

    it('steps up and down, never under the minimum', () => {
        const onChange = vi.fn();
        const { rerender } = render(<QuantityField id="quantity" label="Cantidad" value="5" onChange={onChange} min={1} />);

        fireEvent.click(screen.getByRole('button', { name: 'Menos cantidad' }));
        expect(onChange).toHaveBeenLastCalledWith('4');

        rerender(<QuantityField id="quantity" label="Cantidad" value="1" onChange={onChange} min={1} />);
        expect(screen.getByRole('button', { name: 'Menos cantidad' })).toBeDisabled();

        rerender(<QuantityField id="quantity" label="Nuevo stock total" value="0" onChange={onChange} min={0} />);
        expect(screen.getByRole('button', { name: 'Menos cantidad' })).toBeDisabled();
    });

    it('lets the number be typed and shows the hint and the error', () => {
        const onChange = vi.fn();
        render(<QuantityField id="quantity" label="Cantidad" value="" onChange={onChange} min={1} hint="Stock actual: 12" error="Obligatorio" />);

        fireEvent.change(document.getElementById('quantity') as HTMLInputElement, { target: { value: '30' } });

        expect(onChange).toHaveBeenCalledWith('30');
        expect(screen.getByText('Stock actual: 12')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent('Obligatorio');
    });
});

describe('stock preview', () => {
    it('shows the stock before and after, with the change', () => {
        render(<StockPreview type="out" current={12} quantity="5" />);

        const box = screen.getByText('Stock después del movimiento').parentElement?.parentElement as HTMLElement;
        expect(text(box)).toContain('12');
        expect(text(box)).toContain('7');
        expect(text(box)).toContain('−5');
    });

    it('shows nothing until there is a quantity', () => {
        const { container } = render(<StockPreview type="ingreso" current={12} quantity="" />);

        expect(container).toBeEmptyDOMElement();
    });

    it('shows no change when an adjustment keeps the stock', () => {
        render(<StockPreview type="adjustment" current={12} quantity="12" />);

        expect(screen.getByText('0')).toBeInTheDocument();
    });
});

describe('product picker', () => {
    const product = { id: 9, name: 'Aretes', code: 'ARE-002', stock: 0 } as never;

    it('searches 250 ms after typing, lists results with stock, and reports the chosen one', async () => {
        vi.useFakeTimers();
        vi.mocked(axios.get).mockResolvedValueOnce({ data: [product] });
        const onSelect = vi.fn();
        render(<ProductPicker selected={null} onSelect={onSelect} onClear={vi.fn()} />);

        fireEvent.change(screen.getByPlaceholderText('Buscar por nombre o código...'), { target: { value: 'are' } });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(250);
        });
        fireEvent.click(screen.getByRole('button', { name: /ARE-002/ }));

        expect(axios.get).toHaveBeenCalledWith('/api/products/search', { params: { q: 'are' } });
        expect(onSelect).toHaveBeenCalledWith(product);
    });

    it('clears the results when the box is emptied and survives a failed search', async () => {
        vi.useFakeTimers();
        vi.mocked(axios.get).mockRejectedValueOnce(new Error('red'));
        render(<ProductPicker selected={null} onSelect={vi.fn()} onClear={vi.fn()} />);
        const box = screen.getByPlaceholderText('Buscar por nombre o código...');

        fireEvent.change(box, { target: { value: 'x' } });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(250);
        });
        expect(screen.queryByRole('button', { name: /ARE/ })).not.toBeInTheDocument();

        fireEvent.change(box, { target: { value: '' } });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
        });
        expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('shows the chosen product with its stock and lets it be changed', () => {
        const onClear = vi.fn();
        render(
            <ProductPicker
                selected={{ ...(product as object), stock: 12 } as never}
                onSelect={vi.fn()}
                onClear={onClear}
                error="Elige un producto."
            />,
        );

        expect(text(document.body)).toContain('Stock: 12');
        expect(screen.getByRole('alert')).toHaveTextContent('Elige un producto.');
        fireEvent.click(screen.getByTitle('Cambiar producto'));
        expect(onClear).toHaveBeenCalledTimes(1);
    });
});
