import { router } from '@inertiajs/react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Edit from '../edit';

const form = vi.hoisted(() => ({
    data: {} as Record<string, string>,
    errors: {} as Record<string, string>,
    put: vi.fn(),
    setData: vi.fn(),
    processing: false,
}));

vi.mock('@inertiajs/react', () => ({
    router: { delete: vi.fn() },
    Head: () => null,
    Link: 'a',
    useForm: () => form,
    usePage: vi.fn(() => ({ props: { business: { brand_color: '#C4686F' } } })),
}));
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/PaymentMethodSelect', () => ({ default: () => <div data-testid="payment-method" /> }));
vi.mock('@/hooks/use-scroll-to-error', () => ({ useScrollToError: vi.fn() }));

const sale = {
    id: 5,
    branch_id: 1,
    code: 'V-1005',
    client_id: 3,
    seller_id: 2,
    tax: 7315,
    net: 164500,
    total: 171815,
    payment_method: 'cash',
    date: '2026-10-08T10:00:00Z',
    status: 'completed',
};
const props = { sale, branches: [{ id: 1, name: 'Centro' }], clients: [{ id: 3, name: 'María Gómez' }], sellers: [{ id: 2, name: 'Carlos' }] };

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
    vi.stubGlobal('route', (name: string, id?: number) => `/${name}${id ? `/${id}` : ''}`);
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
    form.errors = {};
    form.processing = false;
    form.data = {
        branch_id: '1',
        client_id: '3',
        seller_id: '2',
        tax: '7315',
        net: '164500',
        total: '171815',
        payment_method: 'cash',
        date: '2026-10-08T10:00',
        status: 'completed',
    };
});

describe('Sales edit', () => {
    it('shows the sale code, the live total and the amounts as pesos', () => {
        render(<Edit {...props} />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Editar venta V-1005');
        expect(screen.getByLabelText('Código de venta')).toBeDisabled();
        expect(screen.getByText('$ 171.815', { selector: '.sr-only' })).toBeInTheDocument();
        expect((screen.getByLabelText(/Valor neto/) as HTMLInputElement).value.replace(/\s/g, ' ')).toBe('$ 164.500');
    });

    it('recomputes tax and total when the net value changes', () => {
        render(<Edit {...props} />);

        fireEvent.change(screen.getByLabelText(/Valor neto/), { target: { value: '$ 100.000' } });

        expect(form.setData).toHaveBeenCalledWith('net', '100000');
        expect(form.setData).toHaveBeenCalledWith('tax', '19000.00');
        expect(form.setData).toHaveBeenCalledWith('total', '119000.00');
    });

    it('keeps the total read-only', () => {
        render(<Edit {...props} />);

        expect(screen.getByLabelText(/^Total/)).toHaveAttribute('readonly');
    });

    it('submits the update to the sale', () => {
        render(<Edit {...props} />);

        fireEvent.submit(screen.getByRole('button', { name: 'Actualizar venta' }).closest('form') as HTMLFormElement);

        expect(form.put).toHaveBeenCalledWith('/sales.update/5');
    });

    it('disables saving while the request is in flight', () => {
        form.processing = true;
        render(<Edit {...props} />);

        expect(screen.getByRole('button', { name: 'Actualizar venta' })).toBeDisabled();
    });

    it('shows server validation messages next to their field', () => {
        form.errors = { date: 'La fecha no es válida.', net: 'El valor neto es obligatorio.' };
        render(<Edit {...props} />);

        expect(screen.getByText('La fecha no es válida.')).toBeInTheDocument();
        expect(screen.getByText('El valor neto es obligatorio.')).toBeInTheDocument();
    });

    it('asks for a long press before deleting the sale', () => {
        render(<Edit {...props} />);

        fireEvent.click(screen.getByRole('button', { name: 'Eliminar venta' }));

        expect(screen.getByRole('dialog', { name: 'Eliminar venta' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Mantén para eliminar/ })).toBeInTheDocument();
        expect(router.delete).not.toHaveBeenCalled();
    });

    it('goes back to the sale from cancel and from the back arrow', () => {
        render(<Edit {...props} />);

        expect(screen.getByRole('link', { name: 'Cancelar' })).toHaveAttribute('href', '/sales.show/5');
        expect(screen.getByRole('link', { name: 'Volver a la venta' })).toHaveAttribute('href', '/sales.show/5');
    });
});
