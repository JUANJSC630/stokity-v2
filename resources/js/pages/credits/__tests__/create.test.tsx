/** Characterization tests for the new credit wizard: client + products, conditions, confirmation and the payload sent. */
import { router } from '@inertiajs/react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import CreditCreate from '../create';

vi.mock('@inertiajs/react', () => ({
    router: { post: vi.fn(), visit: vi.fn() },
    Head: () => null,
    usePage: vi.fn(() => ({ props: {} })),
}));
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/components/PaymentMethodSelect', () => ({
    default: ({ value, onValueChange }: { value?: string; onValueChange: (v: string) => void }) => (
        <div>
            <span data-testid="method-value">{value}</span>
            <button type="button" onClick={() => onValueChange('transfer')}>
                método-transferencia
            </button>
        </div>
    ),
}));
vi.mock('@/components/ui/select', () => ({
    Select: ({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children: ReactNode }) => (
        <select aria-label="Número de cuotas" value={value} onChange={(e) => onValueChange?.(e.target.value)}>
            {children}
        </select>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));

const clients = [
    { id: 1, name: 'Ana Pérez', document: '1000200300' },
    { id: 2, name: 'Luis Torres', document: '900100200' },
];

const products = [
    {
        id: 11,
        name: 'Collar Luna',
        code: 'COL-001',
        sale_price: 100000,
        stock: 10,
        reserved_stock: 2,
        available_stock: 8,
        image_url: '',
        type: 'producto',
        tax: 0,
        variable_price: false,
    },
    {
        id: 12,
        name: 'Arreglo de joyería',
        code: 'SRV-001',
        sale_price: 20000,
        stock: 0,
        reserved_stock: 0,
        available_stock: 0,
        image_url: '',
        type: 'servicio',
        tax: 0,
        variable_price: true,
    },
];

function renderWizard(branchId: number | null = 1) {
    return render(<CreditCreate clients={clients as never} products={products as never} branchId={branchId} />);
}

const text = (node: HTMLElement) => (node.textContent ?? '').replace(/\s/g, ' ');
const dateInput = () => document.querySelector('input[type="date"]') as HTMLInputElement;
const next = () => screen.getByRole('button', { name: /Siguiente/ });

function pickClient(name = 'Ana Pérez') {
    fireEvent.click(screen.getByRole('button', { name: new RegExp(name) }));
}

function addProduct(term: string, name: string) {
    fireEvent.change(screen.getByPlaceholderText('Buscar producto por nombre o código...'), { target: { value: term } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}`) }));
}

function toConditions(credit: 'layaway' | 'installments' | 'due_date' | 'hold') {
    pickClient();
    addProduct('collar', 'Collar Luna');
    fireEvent.click(next());
    const label = { layaway: /Separado/, installments: /^Cuotas/, due_date: /Fecha acordada/, hold: /Reservado/ }[credit];
    fireEvent.click(screen.getByRole('button', { name: label }));
}

beforeAll(() => {
    vi.stubGlobal('route', (name: string) => `/${name}`);
});

beforeEach(() => vi.clearAllMocks());

describe('New credit: step 1 (client and products)', () => {
    it('cannot continue without a client and at least one product', () => {
        renderWizard();
        expect(next()).toBeDisabled();

        pickClient();
        expect(next()).toBeDisabled();

        addProduct('collar', 'Collar Luna');
        expect(next()).toBeEnabled();
    });

    it('lists the first clients and filters by name or document', () => {
        renderWizard();

        expect(screen.getByRole('button', { name: /Ana Pérez/ })).toBeInTheDocument();
        fireEvent.change(screen.getByPlaceholderText('Buscar cliente por nombre o documento...'), { target: { value: '9001' } });

        expect(screen.queryByRole('button', { name: /Ana Pérez/ })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Luis Torres/ })).toBeInTheDocument();
    });

    it('shows the chosen client with its document and lets the user change it', () => {
        renderWizard();
        pickClient();

        expect(screen.getByText('1000200300')).toBeInTheDocument();
        fireEvent.click(screen.getAllByRole('button').find((b) => b.querySelector('svg.lucide-x')) as HTMLElement);

        expect(screen.getByRole('button', { name: /Luis Torres/ })).toBeInTheDocument();
    });

    it('shows available stock (not total) for products and none for services', () => {
        renderWizard();

        fireEvent.change(screen.getByPlaceholderText('Buscar producto por nombre o código...'), { target: { value: 'a' } });

        expect(screen.getByRole('button', { name: /^Collar Luna/ })).toHaveTextContent('Disp: 8');
        expect(screen.getByRole('button', { name: /^Arreglo de joyería/ })).not.toHaveTextContent('Disp:');
    });

    it('disables products without available stock', () => {
        render(
            <CreditCreate
                clients={clients as never}
                products={[{ ...products[0], id: 13, name: 'Anillo Sol', code: 'ANI-001', stock: 3, reserved_stock: 3, available_stock: 0 }] as never}
                branchId={1}
            />,
        );

        fireEvent.change(screen.getByPlaceholderText('Buscar producto por nombre o código...'), { target: { value: 'anillo' } });
        const button = screen.getByRole('button', { name: /^Anillo Sol/ });

        expect(button).toBeDisabled();
        expect(button).toHaveTextContent('Sin stock');
    });

    it('caps the cart quantity at the available stock', () => {
        renderWizard();
        pickClient();
        addProduct('collar', 'Collar Luna');

        fireEvent.change(screen.getAllByLabelText('Cantidad de Collar Luna')[0], { target: { value: '50' } });

        screen.getAllByLabelText('Cantidad de Collar Luna').forEach((input) => expect(input).toHaveValue(8));
    });

    it('does not add more units than the available stock when the product is picked again', () => {
        renderWizard();
        pickClient();
        addProduct('collar', 'Collar Luna');
        fireEvent.change(screen.getAllByLabelText('Cantidad de Collar Luna')[0], { target: { value: '8' } });

        addProduct('collar', 'Collar Luna');

        screen.getAllByLabelText('Cantidad de Collar Luna').forEach((input) => expect(input).toHaveValue(8));
        expect(toast.error).toHaveBeenCalled();
    });

    it('says when no product matches', () => {
        renderWizard();

        fireEvent.change(screen.getByPlaceholderText('Buscar producto por nombre o código...'), { target: { value: 'zzz' } });

        expect(screen.getByText('No se encontraron productos')).toBeInTheDocument();
    });

    it('adds the product to the cart and increments its quantity when it is added again', () => {
        renderWizard();
        addProduct('collar', 'Collar Luna');
        addProduct('collar', 'Collar Luna');

        const quantity = screen.getAllByRole('spinbutton')[0] as HTMLInputElement;
        expect(quantity.value).toBe('2');
        expect(text(screen.getByText(/^Total:/))).toContain('Total: $ 200.000');
    });

    it('removes a line when its quantity is set to zero', () => {
        renderWizard();
        addProduct('collar', 'Collar Luna');

        fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '0' } });

        expect(screen.queryByText(/^Total:/)).not.toBeInTheDocument();
    });

    it('lets the price of a variable-price service be edited', () => {
        renderWizard();
        addProduct('arreglo', 'Arreglo de joyería');

        const price = screen.getAllByRole('textbox').find((i) => (i as HTMLInputElement).value.replace(/\D/g, '') === '20000') as HTMLInputElement;
        fireEvent.change(price, { target: { value: '35000' } });

        expect(text(screen.getByText(/^Total:/))).toContain('Total: $ 35.000');
    });

    it('goes back to the credits list from step 1', () => {
        renderWizard();

        fireEvent.click(screen.getByRole('button', { name: /Cancelar/ }));

        expect(router.visit).toHaveBeenCalledWith('/credits');
    });
});

describe('New credit: step 2 (conditions)', () => {
    it('cannot continue until a type is chosen', () => {
        renderWizard();
        pickClient();
        addProduct('collar', 'Collar Luna');
        fireEvent.click(next());

        expect(next()).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: /Separado/ }));
        expect(next()).toBeEnabled();
    });

    it('fills the last installment date from the number of installments and updates it when that changes', () => {
        renderWizard();
        toConditions('installments');

        const due = dateInput();
        expect(due.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        const before = due.value;

        fireEvent.change(screen.getByLabelText('Número de cuotas'), { target: { value: '12' } });

        expect(dateInput().value).not.toBe(before);
        expect(screen.getByRole('option', { name: /3 cuotas — \$\s33\.333 c\/u/ })).toBeInTheDocument();
    });

    it('asks for a deadline on an agreed date and blocks Next until it is set', () => {
        renderWizard();
        toConditions('due_date');

        expect(dateInput()).toBeInTheDocument();
        expect(screen.getByText('Fecha límite de pago')).toBeInTheDocument();
        expect(screen.queryByLabelText('Número de cuotas')).not.toBeInTheDocument();
        expect(next()).toBeDisabled();

        fireEvent.change(dateInput(), { target: { value: '2027-01-15' } });
        expect(next()).toBeEnabled();
    });

    it('does not ask for an initial payment on a reservation', () => {
        renderWizard();
        toConditions('hold');

        expect(screen.queryByText('Abono inicial (opcional)')).not.toBeInTheDocument();
    });

    it('starts the initial payment method as "efectivo" and blocks an initial payment above the total', () => {
        renderWizard();
        toConditions('layaway');

        const initial = screen.getAllByRole('textbox')[0];
        fireEvent.change(initial, { target: { value: '300000' } });

        expect(screen.getByTestId('method-value')).toHaveTextContent('efectivo');
        expect(text(screen.getByText(/El abono no puede superar el total/))).toContain('$ 100.000');
        expect(next()).toBeDisabled();
    });
});

describe('New credit: step 3 (confirmation)', () => {
    function toSummary(type: 'layaway' | 'installments' | 'due_date' | 'hold', initial = 0) {
        renderWizard();
        toConditions(type);
        if (initial > 0) fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: String(initial) } });
        fireEvent.click(next());
    }

    it('summarises client, type, total and the products', () => {
        toSummary('layaway');

        const summary = screen.getByText('Resumen del crédito').closest('div') as HTMLElement;
        expect(text(summary)).toContain('Ana Pérez');
        expect(text(summary)).toContain('Separado');
        expect(text(summary)).toContain('$ 100.000');
        expect(text(summary)).toContain('Collar Luna x1');
        expect(text(summary)).toContain('1 producto');
    });

    it('shows the initial payment, the remaining balance and the installments on what is left', () => {
        toSummary('installments', 40000);

        const summary = screen.getByText('Resumen del crédito').closest('div') as HTMLElement;
        expect(text(summary)).toContain('Abono inicial$ 40.000');
        expect(text(summary)).toContain('Saldo restante$ 60.000');
        expect(text(summary)).toContain('3 x $ 20.000');
    });

    it('warns that layaway and hold products stay reserved, and that installment and due-date ones leave now', () => {
        toSummary('hold');
        expect(screen.getByText('Los productos quedarán reservados')).toBeInTheDocument();
    });

    it('explains that an agreed-date credit delivers now and creates a sale', () => {
        renderWizard();
        toConditions('due_date');
        fireEvent.change(dateInput(), { target: { value: '2027-01-15' } });
        fireEvent.click(next());

        expect(screen.getByText('Los productos se entregarán de inmediato')).toBeInTheDocument();
        expect(text(screen.getByText('Fecha límite').parentElement as HTMLElement)).toContain('15/01/2027');
    });

    it('goes back one step with "Atrás"', () => {
        toSummary('layaway');

        fireEvent.click(screen.getByRole('button', { name: /Atrás/ }));

        expect(screen.getByText('Modalidad del crédito')).toBeInTheDocument();
    });

    it('posts the credit with every field the server expects', () => {
        toSummary('installments', 40000);

        fireEvent.click(screen.getByRole('button', { name: /Confirmar crédito/ }));

        const [url, data] = vi.mocked(router.post).mock.calls[0] as unknown as [string, Record<string, unknown>];
        expect(url).toBe('/credits');
        expect(data).toMatchObject({
            type: 'installments',
            client_id: 1,
            branch_id: 1,
            installments_count: 3,
            initial_payment: 40000,
            initial_payment_method: 'efectivo',
            notes: null,
            items: [{ product_id: 11, quantity: 1, unit_price: 100000, subtotal: 100000 }],
        });
        expect(String(data.due_date)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('sends null for the optional fields of a plain layaway', () => {
        toSummary('layaway');

        fireEvent.click(screen.getByRole('button', { name: /Confirmar crédito/ }));

        expect(vi.mocked(router.post).mock.calls[0][1]).toMatchObject({
            type: 'layaway',
            due_date: null,
            installments_count: null,
            initial_payment: null,
            initial_payment_method: null,
        });
    });

    it('does not post when the branch is unknown', () => {
        renderWizard(null);
        toConditions('layaway');
        fireEvent.click(next());

        fireEvent.click(screen.getByRole('button', { name: /Confirmar crédito/ }));

        expect(router.post).not.toHaveBeenCalled();
    });

    it('reports each server error and lets the user try again', () => {
        toSummary('layaway');
        fireEvent.click(screen.getByRole('button', { name: /Confirmar crédito/ }));

        const options = vi.mocked(router.post).mock.calls[0][2] as { onError: (e: Record<string, string>) => void };
        act(() => options.onError({ a: 'Sin stock disponible.', b: 'Cliente inválido.' }));

        expect(toast.error).toHaveBeenCalledWith('Sin stock disponible.');
        expect(toast.error).toHaveBeenCalledWith('Cliente inválido.');
        expect(screen.getByRole('button', { name: /Confirmar crédito/ })).toBeEnabled();
    });
});

describe('New credit: live summary and stepper', () => {
    it('keeps the summary on the side up to date as the user chooses', () => {
        renderWizard();
        const aside = screen.getByLabelText('Resumen en vivo');
        expect(text(aside)).toContain('Sin elegir');
        expect(text(aside)).toContain('Ninguno');

        pickClient();
        addProduct('collar', 'Collar Luna');
        addProduct('collar', 'Collar Luna');

        expect(text(aside)).toContain('Ana Pérez');
        expect(text(aside)).toContain('1 · 2 uds');
        expect(text(aside)).toContain('$ 200.000');
    });

    it('shows the modality, the initial payment and the resulting balance in the summary', () => {
        renderWizard();
        toConditions('layaway');
        fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: '40000' } });

        const aside = screen.getByLabelText('Resumen en vivo');
        expect(text(aside)).toContain('Separado');
        expect(text(aside)).toContain('Con abono de$ 40.000');
        expect(text(aside)).toContain('Quedaría un saldo de$ 60.000');
    });

    it('marks the current step in the stepper', () => {
        renderWizard();

        expect(screen.getByRole('list', { name: 'Pasos del crédito' }).querySelector('[aria-current="step"]')).toHaveTextContent('1');
        pickClient();
        addProduct('collar', 'Collar Luna');
        fireEvent.click(next());

        expect(screen.getByRole('list', { name: 'Pasos del crédito' }).querySelector('[aria-current="step"]')).toHaveTextContent('2');
    });

    it('goes back to the list with the arrow at the top', () => {
        renderWizard();

        fireEvent.click(screen.getByRole('button', { name: 'Volver a créditos' }));

        expect(router.visit).toHaveBeenCalledWith('/credits');
    });
});
