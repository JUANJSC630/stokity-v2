import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CartLine } from '../cart-line';
import { CashTender } from '../cash-tender';

const product = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    name: 'Collar Luna',
    code: 'COL-1',
    sale_price: 45000,
    tax: 0,
    stock: 5,
    type: 'producto',
    ...overrides,
});

function line(overrides: Record<string, unknown> = {}, quantity = 2) {
    const handlers = { onDecrease: vi.fn(), onIncrease: vi.fn(), onTypeQuantity: vi.fn(), onRemove: vi.fn() };
    render(
        <ul>
            <CartLine item={{ product: product(overrides) as never, quantity, subtotal: quantity * 45000 }} {...handlers} />
        </ul>,
    );
    return handlers;
}

describe('CartLine', () => {
    it('shows the name, the unit price and the subtotal', () => {
        line();

        expect(screen.getByText('Collar Luna')).toBeInTheDocument();
        expect(screen.getByText(/\$\s45\.000 c\/u/)).toBeInTheDocument();
        expect(screen.getByText(/^\$\s90\.000$/)).toBeInTheDocument();
    });

    it('reports each action', () => {
        const handlers = line();

        fireEvent.click(screen.getByLabelText('Disminuir cantidad de Collar Luna'));
        fireEvent.click(screen.getByLabelText('Aumentar cantidad de Collar Luna'));
        fireEvent.click(screen.getByLabelText('Eliminar Collar Luna del carrito'));

        expect(handlers.onDecrease).toHaveBeenCalledTimes(1);
        expect(handlers.onIncrease).toHaveBeenCalledTimes(1);
        expect(handlers.onRemove).toHaveBeenCalledTimes(1);
    });

    it('reports a typed quantity only when it is a valid number from 1', () => {
        const handlers = line();
        const box = screen.getByLabelText('Cantidad de Collar Luna');

        fireEvent.change(box, { target: { value: '4' } });
        fireEvent.change(box, { target: { value: '0' } });
        fireEvent.change(box, { target: { value: '' } });

        expect(handlers.onTypeQuantity).toHaveBeenCalledTimes(1);
        expect(handlers.onTypeQuantity).toHaveBeenCalledWith(4);
    });

    it('disables "more" at the stock of a product but never for a service', () => {
        line({}, 5);
        expect(screen.getByLabelText('Aumentar cantidad de Collar Luna')).toBeDisabled();
    });

    it('lets a service grow past any stock', () => {
        line({ type: 'servicio', stock: 0 }, 9);
        expect(screen.getByLabelText('Aumentar cantidad de Collar Luna')).toBeEnabled();
    });
});

function tender(overrides: Partial<React.ComponentProps<typeof CashTender>> = {}) {
    const props = {
        total: 45000,
        amountPaid: 0,
        amountDisplay: '',
        onAmountTyped: vi.fn(),
        onExact: vi.fn(),
        onBill: vi.fn(),
        change: 0,
        ...overrides,
    };
    render(<CashTender {...props} />);
    return props;
}

describe('CashTender', () => {
    it('reports typing, the exact button and the suggested bills', () => {
        const props = tender();

        fireEvent.change(screen.getByLabelText('Recibido:'), { target: { value: '50000' } });
        fireEvent.click(screen.getByRole('button', { name: /Pago exacto de \$\s45\.000/ }));
        fireEvent.click(screen.getByRole('button', { name: '50.000' }));

        expect(props.onAmountTyped).toHaveBeenCalledWith('50000');
        expect(props.onExact).toHaveBeenCalledTimes(1);
        expect(props.onBill).toHaveBeenCalledWith(50000);
    });

    it('shows nothing about change or shortfall before anything is typed', () => {
        tender();

        expect(screen.queryByText('Cambio:')).not.toBeInTheDocument();
        expect(screen.queryByText('Faltan:')).not.toBeInTheDocument();
    });

    it('shows the change when the cash covers the total', () => {
        tender({ amountPaid: 50000, change: 5000 });

        expect(screen.getByText('Cambio:').parentElement?.textContent?.replace(/\s/g, ' ')).toContain('$ 5.000');
        expect(screen.queryByText('Faltan:')).not.toBeInTheDocument();
    });

    it('shows what is still missing when the cash does not cover the total', () => {
        tender({ amountPaid: 40000 });

        expect(screen.getByText('Faltan:').parentElement?.textContent?.replace(/\s/g, ' ')).toContain('$ 5.000');
        expect(screen.queryByText('Cambio:')).not.toBeInTheDocument();
    });

    it('does not claim change for a zero total', () => {
        tender({ total: 0, amountPaid: 10000 });

        expect(screen.queryByText('Cambio:')).not.toBeInTheDocument();
    });
});
