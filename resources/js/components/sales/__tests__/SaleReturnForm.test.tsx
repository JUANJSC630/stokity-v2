import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SaleReturnForm from '../SaleReturnForm';

const products = [
    { id: 1, name: 'Producto A', quantity: 5, alreadyReturned: 1 },
    { id: 2, name: 'Producto B', quantity: 3, alreadyReturned: 0 },
    { id: 3, name: 'Producto C', quantity: 2, alreadyReturned: 2 },
];

const defaultProps = {
    saleId: 100,
    products,
    open: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
};

describe('SaleReturnForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the dialog title', () => {
        render(<SaleReturnForm {...defaultProps} />);
        // Title appears in both the heading and submit button — use role
        expect(screen.getByRole('heading', { name: 'Registrar devolución' })).toBeInTheDocument();
    });

    it('renders all product names', () => {
        render(<SaleReturnForm {...defaultProps} />);
        expect(screen.getByText('Producto A')).toBeInTheDocument();
        expect(screen.getByText('Producto B')).toBeInTheDocument();
        expect(screen.getByText('Producto C')).toBeInTheDocument();
    });

    it('shows max returnable quantity for each product', () => {
        render(<SaleReturnForm {...defaultProps} />);
        // Product A: 5 - 1 = 4, Product B: 3 - 0 = 3, Product C: 2 - 2 = 0
        expect(screen.getByText('Máx: 4')).toBeInTheDocument();
        expect(screen.getByText('Máx: 3')).toBeInTheDocument();
        expect(screen.getByText('Máx: 0')).toBeInTheDocument();
    });

    it('disables input for fully returned products', () => {
        render(<SaleReturnForm {...defaultProps} />);
        const inputs = screen.getAllByRole('spinbutton');
        // Product C (index 2) has max 0 → disabled
        expect(inputs[2]).toBeDisabled();
        // Product A and B are not disabled
        expect(inputs[0]).not.toBeDisabled();
        expect(inputs[1]).not.toBeDisabled();
    });

    it('shows error when submitting without selecting products', async () => {
        const user = userEvent.setup();
        render(<SaleReturnForm {...defaultProps} />);

        const submitBtn = screen.getByRole('button', { name: 'Registrar devolución' });
        await user.click(submitBtn);

        expect(screen.getByText('Selecciona al menos un producto y cantidad a devolver.')).toBeInTheDocument();
    });

    it('"Devolver todo" sets max quantities', async () => {
        const user = userEvent.setup();
        render(<SaleReturnForm {...defaultProps} />);

        const returnAllBtn = screen.getByRole('button', { name: 'Devolver todo' });
        await user.click(returnAllBtn);

        const inputs = screen.getAllByRole('spinbutton');
        expect(inputs[0]).toHaveValue(4); // 5 - 1
        expect(inputs[1]).toHaveValue(3); // 3 - 0
        expect(inputs[2]).toHaveValue(0); // 2 - 2
    });

    it('"Limpiar todo" resets quantities to 0', async () => {
        const user = userEvent.setup();
        render(<SaleReturnForm {...defaultProps} />);

        // First set all to max
        await user.click(screen.getByRole('button', { name: 'Devolver todo' }));

        // Then clear
        await user.click(screen.getByRole('button', { name: 'Limpiar todo' }));

        const inputs = screen.getAllByRole('spinbutton');
        expect(inputs[0]).toHaveValue(0);
        expect(inputs[1]).toHaveValue(0);
    });

    it('renders Cancelar and submit buttons', () => {
        render(<SaleReturnForm {...defaultProps} />);
        expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Registrar devolución' })).toBeInTheDocument();
    });

    it('calls onClose when Cancelar is clicked', async () => {
        const user = userEvent.setup();
        render(<SaleReturnForm {...defaultProps} />);

        await user.click(screen.getByRole('button', { name: 'Cancelar' }));
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('does not render when open is false', () => {
        render(<SaleReturnForm {...defaultProps} open={false} />);
        expect(screen.queryByText('Registrar devolución')).not.toBeInTheDocument();
    });

    it('has a textarea for reason (motivo)', () => {
        render(<SaleReturnForm {...defaultProps} />);
        expect(screen.getByText('Motivo (opcional)')).toBeInTheDocument();
    });
});
