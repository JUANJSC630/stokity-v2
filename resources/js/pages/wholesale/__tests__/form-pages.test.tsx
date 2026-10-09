/** Characterization tests for the wholesale order form (create and edit): lines, total, validation and the exact payload. */
import { router } from '@inertiajs/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import WholesaleCreate from '../create';
import WholesaleEdit from '../edit';

vi.mock('@inertiajs/react', () => ({
    router: { post: vi.fn(), put: vi.fn(), reload: vi.fn() },
    Head: () => null,
    usePage: vi.fn(() => ({ props: {} })),
}));
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/components/clients', () => ({ CardCreateClient: () => <div>crear-cliente</div> }));
vi.mock('@/components/PaymentMethodSelect', () => ({
    default: ({ onValueChange, value }: { onValueChange: (v: string) => void; value?: string }) => (
        <div>
            <span data-testid="method">{value ?? 'sin-método'}</span>
            <button type="button" onClick={() => onValueChange('transfer')}>
                método-transferencia
            </button>
        </div>
    ),
}));
vi.mock('@/components/ui/select', () => ({
    Select: ({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children: ReactNode }) => (
        <select value={value} onChange={(e) => onValueChange?.(e.target.value)}>
            {children}
        </select>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));

const clients = [
    { id: 1, name: 'Distribuidora El Dorado', is_wholesale: true },
    { id: 2, name: 'Ana Pérez', is_wholesale: false },
];
const oneBranch = [{ id: 1, name: 'Centro' }];
const twoBranches = [
    { id: 1, name: 'Centro' },
    { id: 2, name: 'Norte' },
];

const text = (node: HTMLElement) => (node.textContent ?? '').replace(/\s/g, ' ');
const descriptions = () => screen.getAllByPlaceholderText('Ej: Manillas negras, pepas color verde a pedido') as HTMLInputElement[];
const quantities = () => screen.getAllByPlaceholderText('1') as HTMLInputElement[];
const unitPrices = () => screen.getAllByPlaceholderText('Precio por unidad') as HTMLInputElement[];
const submit = () => fireEvent.submit(screen.getByRole('button', { name: /Guardar/ }).closest('form') as HTMLFormElement);

beforeAll(() => {
    vi.stubGlobal('route', (name: string, id?: number) => `/${name}${id ? `/${id}` : ''}`);
});

beforeEach(() => vi.clearAllMocks());

describe('New wholesale order', () => {
    function renderCreate(branches: unknown[] = oneBranch, branchId: number | null = 1) {
        return render(<WholesaleCreate clients={clients as never} branches={branches as never} branchId={branchId} />);
    }

    it('starts with the first client, one empty line and today as the date', () => {
        renderCreate();

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nuevo pedido mayorista');
        expect(descriptions()).toHaveLength(1);
        expect(descriptions()[0].value).toBe('');
        expect(quantities()[0].value).toBe('1');
        expect(screen.getByLabelText(/Fecha del pedido/)).toHaveValue(
            new Date().toLocaleString('sv-SE', { timeZone: 'America/Bogota' }).slice(0, 10),
        );
        expect(screen.getByTestId('method')).toHaveTextContent('sin-método');
    });

    it('shows the branch selector only when there is more than one branch', () => {
        const { unmount } = renderCreate(oneBranch);
        expect(screen.queryByText(/Sucursal/)).not.toBeInTheDocument();
        unmount();

        renderCreate(twoBranches);
        expect(screen.getByText(/Sucursal/)).toBeInTheDocument();
    });

    it('refuses to save without a described line and says why', () => {
        renderCreate();

        submit();

        expect(toast.error).toHaveBeenCalledWith('Agrega al menos una línea con descripción y cantidad válidas.');
        expect(router.post).not.toHaveBeenCalled();
    });

    it('adds and removes lines, and cannot remove the last one', () => {
        renderCreate();
        expect(screen.getByRole('button', { name: 'Quitar este artículo' })).toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: /Agregar artículo/ }));
        expect(descriptions()).toHaveLength(2);

        fireEvent.click(screen.getAllByRole('button', { name: 'Quitar este artículo' })[0]);
        expect(descriptions()).toHaveLength(1);
    });

    it('adds up the order total from quantity × unit price of every line', () => {
        renderCreate();
        fireEvent.click(screen.getByRole('button', { name: /Agregar artículo/ }));

        fireEvent.change(quantities()[0], { target: { value: '10' } });
        fireEvent.change(unitPrices()[0], { target: { value: '12000' } });
        fireEvent.change(quantities()[1], { target: { value: '30' } });
        fireEvent.change(unitPrices()[1], { target: { value: '3000' } });

        expect(text(screen.getByText('Total del pedido').parentElement as HTMLElement)).toContain('$ 210.000');
    });

    it('posts the order with every field the server expects', () => {
        renderCreate();
        fireEvent.change(descriptions()[0], { target: { value: 'Manillas negras' } });
        fireEvent.change(quantities()[0], { target: { value: '10' } });
        fireEvent.change(unitPrices()[0], { target: { value: '12000' } });
        fireEvent.click(screen.getByRole('button', { name: 'método-transferencia' }));
        fireEvent.change(screen.getByPlaceholderText(/fecha de entrega acordada/), { target: { value: 'Entrega en 8 días' } });

        submit();

        expect(router.post).toHaveBeenCalledWith(
            '/wholesale.store',
            {
                branch_id: '1',
                client_id: '1',
                payment_method: 'transfer',
                date: new Date().toLocaleString('sv-SE', { timeZone: 'America/Bogota' }).slice(0, 10),
                notes: 'Entrega en 8 días',
                estimated_cost: null,
                items: [{ description: 'Manillas negras', quantity: 10, unit_price: 12000 }],
            },
            expect.any(Object),
        );
    });

    it('sends the material cost when one is typed', () => {
        renderCreate();
        fireEvent.change(descriptions()[0], { target: { value: 'Pepas' } });
        fireEvent.change(screen.getByLabelText(/Costo de materiales/), { target: { value: '90000' } });

        submit();

        expect(vi.mocked(router.post).mock.calls[0][1]).toMatchObject({ estimated_cost: 90000 });
    });

    it('reports each server error and enables the button again when the request finishes', () => {
        renderCreate();
        fireEvent.change(descriptions()[0], { target: { value: 'Pepas' } });
        submit();

        const options = vi.mocked(router.post).mock.calls[0][2] as { onError: (e: Record<string, string>) => void; onFinish: () => void };
        expect(screen.getByRole('button', { name: /Guardar pedido/ })).toBeDisabled();
        options.onError({ a: 'Cliente inválido.', b: 'Fecha inválida.' });
        options.onFinish();

        expect(toast.error).toHaveBeenCalledWith('Cliente inválido.');
        expect(toast.error).toHaveBeenCalledWith('Fecha inválida.');
    });

    it('opens the new client dialog (wholesale variant) from the plus button', () => {
        renderCreate();

        fireEvent.click(screen.getByRole('button', { name: 'Crear cliente' }));

        expect(screen.getByText('crear-cliente')).toBeInTheDocument();
    });

    it('marks wholesale clients in the client list', () => {
        renderCreate();

        expect(screen.getByRole('option', { name: 'Distribuidora El Dorado · Mayorista' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Ana Pérez' })).toBeInTheDocument();
    });
});

describe('Edit wholesale order', () => {
    const order = {
        id: 9,
        code: 'M-209',
        branch_id: 1,
        client_id: 2,
        payment_method: 'transfer',
        date: '2026-10-05T10:00:00Z',
        notes: 'Nota previa',
        estimated_cost: 90000,
        items: [
            { id: 1, description: 'Manillas negras', quantity: 10, unit_price: '12000.00', subtotal: 120000 },
            { id: 2, description: 'Pepas verdes', quantity: 30, unit_price: '3000.00', subtotal: 90000 },
        ],
    };

    function renderEdit() {
        return render(<WholesaleEdit wholesaleSale={order as never} clients={clients as never} branches={oneBranch as never} />);
    }

    it('is prefilled with the order data', () => {
        renderEdit();

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Editar pedido M-209');
        expect(descriptions().map((input) => input.value)).toEqual(['Manillas negras', 'Pepas verdes']);
        expect(quantities().map((input) => input.value)).toEqual(['10', '30']);
        expect(screen.getByLabelText(/Fecha del pedido/)).toHaveValue('2026-10-05');
        expect(screen.getByTestId('method')).toHaveTextContent('transfer');
        expect(screen.getByPlaceholderText(/fecha de entrega acordada/)).toHaveValue('Nota previa');
        expect(text(screen.getByText('Total del pedido').parentElement as HTMLElement)).toContain('$ 210.000');
    });

    it('saves the changes with a PUT to the update route', () => {
        renderEdit();
        fireEvent.change(quantities()[0], { target: { value: '12' } });

        fireEvent.submit(screen.getByRole('button', { name: 'Guardar cambios' }).closest('form') as HTMLFormElement);

        expect(router.put).toHaveBeenCalledWith(
            '/wholesale.update/9',
            expect.objectContaining({
                client_id: '2',
                estimated_cost: 90000,
                items: [
                    { description: 'Manillas negras', quantity: 12, unit_price: 12000 },
                    { description: 'Pepas verdes', quantity: 30, unit_price: 3000 },
                ],
            }),
            expect.any(Object),
        );
        expect(within(document.body).queryByText('Guardar pedido')).not.toBeInTheDocument();
    });
});
