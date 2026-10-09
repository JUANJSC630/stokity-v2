import { render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import PaymentMethodSelect from '../PaymentMethodSelect';

const methods = [
    { id: 1, name: 'Efectivo', code: 'cash', description: null, is_active: true, sort_order: 1 },
    { id: 2, name: 'Transferencia bancaria', code: 'bank_transfer', description: null, is_active: true, sort_order: 2 },
];

function mockMethods(list = methods) {
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({ ok: true, json: async () => list })),
    );
}

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn(() => false);
});

beforeEach(() => {
    mockMethods();
});

describe('PaymentMethodSelect', () => {
    it('shows the saved method as selected once the list loads', async () => {
        render(<PaymentMethodSelect value="cash" onValueChange={vi.fn()} />);

        await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Efectivo'));
    });

    it('picks cash by default when there is no value yet', async () => {
        const onValueChange = vi.fn();
        render(<PaymentMethodSelect value={undefined} onValueChange={onValueChange} />);

        await waitFor(() => expect(onValueChange).toHaveBeenCalledWith('cash'));
    });

    it('maps an old code to its active equivalent so the select is not left empty', async () => {
        const onValueChange = vi.fn();
        render(<PaymentMethodSelect value="transfer" onValueChange={onValueChange} />);

        await waitFor(() => expect(onValueChange).toHaveBeenCalledWith('bank_transfer'));
    });

    it('maps the "efectivo" default used by the credit forms to the active cash code', async () => {
        const onValueChange = vi.fn();
        render(<PaymentMethodSelect value="efectivo" onValueChange={onValueChange} />);

        await waitFor(() => expect(onValueChange).toHaveBeenCalledWith('cash'));
    });

    it('keeps showing a method that is no longer active, labelled as such', async () => {
        render(<PaymentMethodSelect value="nequi" onValueChange={vi.fn()} />);

        await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('nequi (ya no disponible)'));
    });

    it('does not change anything for a value that has no equivalent', async () => {
        const onValueChange = vi.fn();
        render(<PaymentMethodSelect value="nequi" onValueChange={onValueChange} />);

        await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('ya no disponible'));
        expect(onValueChange).not.toHaveBeenCalled();
    });

    it('shows the validation error under the field', async () => {
        render(<PaymentMethodSelect value="cash" onValueChange={vi.fn()} error="El método de pago no es válido." />);

        expect(await screen.findByText('El método de pago no es válido.')).toBeInTheDocument();
    });
});
