/** Characterization of what the return form sends to the server and how it reacts to the answer. */
import { router } from '@inertiajs/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SaleReturnForm from '../SaleReturnForm';

vi.mock('@inertiajs/react', () => ({ router: { post: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const products = [
    { id: 1, name: 'Producto A', quantity: 5, alreadyReturned: 1 },
    { id: 2, name: 'Producto B', quantity: 3, alreadyReturned: 0 },
    { id: 3, name: 'Servicio C', quantity: 2, alreadyReturned: 2, isService: true },
];

const setup = (overrides: Record<string, unknown> = {}) => {
    const props = { saleId: 100, products, open: true, onClose: vi.fn(), onSuccess: vi.fn(), ...overrides };
    render(<SaleReturnForm {...(props as unknown as React.ComponentProps<typeof SaleReturnForm>)} />);
    return props;
};

const quantityOf = (index: number) => screen.getAllByRole('spinbutton')[index];

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('SaleReturnForm payload', () => {
    it('posts only the products with a quantity, with the reason, to the sale returns route', () => {
        setup();

        fireEvent.change(quantityOf(0), { target: { value: '2' } });
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Defectuoso' } });
        fireEvent.click(screen.getByRole('button', { name: 'Registrar devolución' }));

        expect(router.post).toHaveBeenCalledWith(
            '/sales/100/returns',
            { products: [{ product_id: 1, quantity: 2 }], reason: 'Defectuoso' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('caps a typed quantity at what can still be returned and never goes below zero (once the field is left)', () => {
        setup();

        fireEvent.change(quantityOf(0), { target: { value: '99' } });
        fireEvent.blur(quantityOf(0));
        expect(quantityOf(0)).toHaveValue(4);
        fireEvent.change(quantityOf(0), { target: { value: '-3' } });
        fireEvent.blur(quantityOf(0));
        expect(quantityOf(0)).toHaveValue(0);
    });

    it('sends every returnable product when "Devolver todo" was used', () => {
        setup();

        fireEvent.click(screen.getByRole('button', { name: 'Devolver todo' }));
        fireEvent.click(screen.getByRole('button', { name: 'Registrar devolución' }));

        expect(vi.mocked(router.post).mock.calls[0][1]).toEqual({
            products: [
                { product_id: 1, quantity: 4 },
                { product_id: 2, quantity: 3 },
            ],
            reason: '',
        });
        expect(toast.success).toHaveBeenCalledWith('Todos los productos han sido seleccionados para devolución');
    });

    it('tags services and says clearing worked', () => {
        setup();

        expect(screen.getByText('Servicio')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Devolver todo' }));
        fireEvent.click(screen.getByRole('button', { name: 'Limpiar todo' }));
        expect(toast.success).toHaveBeenLastCalledWith('Todas las cantidades han sido limpiadas');
    });

    it('does not offer "Devolver todo" when everything was already returned', () => {
        setup({ products: [{ id: 3, name: 'Servicio C', quantity: 2, alreadyReturned: 2 }] });

        expect(screen.queryByRole('button', { name: 'Devolver todo' })).not.toBeInTheDocument();
    });

    it('does not post without a quantity', () => {
        setup();

        fireEvent.click(screen.getByRole('button', { name: 'Registrar devolución' }));

        expect(router.post).not.toHaveBeenCalled();
    });

    it('confirms, notifies the page and closes itself two seconds later', async () => {
        vi.mocked(router.post).mockImplementation(((_url: string, _data: unknown, options: { onSuccess: () => void }) => {
            options.onSuccess();
        }) as never);
        const props = setup();
        fireEvent.change(quantityOf(1), { target: { value: '1' } });
        vi.useFakeTimers();

        fireEvent.click(screen.getByRole('button', { name: 'Registrar devolución' }));

        expect(screen.getByText('Devolución registrada correctamente.')).toBeInTheDocument();
        expect(toast.success).toHaveBeenCalledWith('Devolución registrada correctamente.');
        expect(props.onSuccess).toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
        expect(props.onClose).not.toHaveBeenCalled();
        vi.advanceTimersByTime(2000);
        expect(props.onClose).toHaveBeenCalled();
    });

    it('says when the server rejects it and keeps the form open', async () => {
        vi.mocked(router.post).mockImplementation(((_url: string, _data: unknown, options: { onError: (e: unknown) => void }) => {
            options.onError({ products: 'mal' });
        }) as never);
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const props = setup();
        fireEvent.change(quantityOf(1), { target: { value: '1' } });

        fireEvent.click(screen.getByRole('button', { name: 'Registrar devolución' }));

        await waitFor(() => expect(screen.getByText('Error al registrar la devolución.')).toBeInTheDocument());
        expect(toast.error).toHaveBeenCalledWith('Error al registrar la devolución.');
        expect(props.onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Registrar devolución' })).not.toBeDisabled();
        consoleError.mockRestore();
    });

    it('starts clean every time it opens', () => {
        const { rerender } = render(<SaleReturnForm saleId={1} products={products} open onClose={vi.fn()} />);
        fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '3' } });
        rerender(<SaleReturnForm saleId={1} products={products} open={false} onClose={vi.fn()} />);
        rerender(<SaleReturnForm saleId={1} products={products} open onClose={vi.fn()} />);

        expect(screen.getAllByRole('spinbutton')[0]).toHaveValue(0);
    });
});
