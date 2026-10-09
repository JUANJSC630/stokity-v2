/** Characterization tests for the credit detail: abonos, cancelling and editing the installment plan. */
import { router } from '@inertiajs/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import CreditShow from '../show';

vi.mock('@inertiajs/react', () => ({
    router: { post: vi.fn(), patch: vi.fn(), visit: vi.fn() },
    Head: () => null,
    Link: 'a',
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
        <select aria-label="Cuotas" value={value} onChange={(e) => onValueChange?.(e.target.value)}>
            {children}
        </select>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));

const baseCredit = {
    id: 7,
    code: 'CR-107',
    type: 'installments',
    status: 'active',
    client: { name: 'Ana Pérez' },
    seller: { name: 'Carlos' },
    branch: { name: 'Centro' },
    total_amount: 200000,
    amount_paid: 50000,
    balance: 150000,
    installments_count: 4,
    installment_amount: 50000,
    due_date: '2026-12-15T00:00:00Z',
    created_at: '2026-10-01T15:30:00Z',
    notes: 'Entrega en diciembre',
    sale: { id: 5, code: 'V-1005' },
    items: [{ id: 1, product_name: 'Collar Luna', quantity: 2, unit_price: 100000, subtotal: 200000, product: { code: 'COL-1' } }],
    payments: [
        {
            id: 1,
            amount: 50000,
            payment_method: 'cash',
            payment_date: '2026-10-02T10:00:00Z',
            registered_by_user: { name: 'Carlos' },
            notes: 'Abono inicial',
        },
    ],
};

function renderShow(credit: Record<string, unknown> = {}, flags: { canCancel?: boolean; canUpdateInstallments?: boolean } = {}) {
    return render(
        <CreditShow
            credit={{ ...baseCredit, ...credit } as never}
            paymentMethods={[]}
            canCancel={flags.canCancel ?? true}
            canUpdateInstallments={flags.canUpdateInstallments ?? true}
        />,
    );
}

const text = (node: HTMLElement) => (node.textContent ?? '').replace(/\s/g, ' ');

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
    vi.stubGlobal('route', (name: string) => `/${name}`);
});

beforeEach(() => vi.clearAllMocks());

describe('Credit detail', () => {
    it('shows the code, the status, the type, the progress and the key facts', () => {
        renderShow();

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('CR-107');
        expect(screen.getByText('Activo')).toBeInTheDocument();
        expect(screen.getAllByText('Cuotas').length).toBeGreaterThan(0);
        expect(screen.getByText('25% pagado')).toBeInTheDocument();
        expect(text(screen.getByText(/^Falta:/))).toContain('$ 150.000');
        expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
        expect(text(screen.getByText(/4 x/))).toContain('4 x $ 50.000');
        expect(screen.getByRole('link', { name: '#V-1005' })).toHaveAttribute('href', '/sales/5');
        expect(screen.getByText('Entrega en diciembre')).toBeInTheDocument();
    });

    it('lists the products and the payment history', () => {
        renderShow();

        expect(screen.getByText('Productos (1)')).toBeInTheDocument();
        expect(screen.getAllByText('Collar Luna').length).toBeGreaterThan(0);
        expect(screen.getByText('Historial de abonos (1)')).toBeInTheDocument();
        expect(screen.getByText('Abono inicial')).toBeInTheDocument();
    });

    it('says so when there are no abonos yet', () => {
        renderShow({ payments: [], amount_paid: 0, balance: 200000 });

        expect(screen.getByText('No hay abonos registrados aún')).toBeInTheDocument();
    });

    it('offers abono and cancel only on active or overdue credits, cancel only with permission', () => {
        const { unmount } = renderShow({}, { canCancel: false });
        expect(screen.getByRole('button', { name: /Registrar abono/ })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^Cancelar$/ })).not.toBeInTheDocument();
        unmount();

        renderShow({ status: 'completed' });
        expect(screen.queryByRole('button', { name: /Registrar abono/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Cancelar/ })).not.toBeInTheDocument();
    });

    it('treats an overdue credit as open for abonos', () => {
        renderShow({ status: 'overdue' });

        expect(screen.getByText('Vencido')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Registrar abono/ })).toBeInTheDocument();
    });
});

describe('Credit detail: abono dialog', () => {
    function openAbono() {
        renderShow();
        fireEvent.click(screen.getByRole('button', { name: /Registrar abono/ }));
        return screen.getByRole('dialog', { name: 'Registrar abono' });
    }

    it('shows the pending balance and starts with the register button disabled', () => {
        const dialog = openAbono();

        expect(text(dialog)).toContain('Saldo pendiente: $ 150.000');
        expect(within(dialog).getByRole('button', { name: /^Registrar/ })).toBeDisabled();
    });

    it('starts with the "efectivo" method that the form has always used', () => {
        const dialog = openAbono();

        expect(within(dialog).getByTestId('method-value')).toHaveTextContent('efectivo');
    });

    it('offers only the quick amounts that fit in the balance, plus "Pagar todo"', () => {
        const dialog = openAbono();

        expect(within(dialog).getByRole('button', { name: /^\$\s10\.000$/ })).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: /^\$\s50\.000$/ })).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Pagar todo' })).toBeInTheDocument();
    });

    it('fills the whole balance with "Pagar todo"', () => {
        const dialog = openAbono();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Pagar todo' }));

        expect(text(within(dialog).getByRole('button', { name: /^Registrar/ }))).toContain('Registrar $ 150.000');
        expect(within(dialog).getByRole('button', { name: /^Registrar/ })).toBeEnabled();
    });

    it('refuses an abono above the balance and says why', () => {
        const dialog = openAbono();

        fireEvent.change(within(dialog).getAllByRole('textbox')[0], { target: { value: '999999' } });

        expect(text(dialog)).toContain('El abono no puede ser mayor al saldo restante de $ 150.000');
        expect(within(dialog).getByRole('button', { name: /^Registrar/ })).toBeDisabled();
    });

    it('posts the abono with the amount, the method and the notes', () => {
        const dialog = openAbono();
        fireEvent.click(within(dialog).getByRole('button', { name: /^\$\s50\.000$/ }));
        fireEvent.click(within(dialog).getByRole('button', { name: 'método-transferencia' }));
        fireEvent.change(within(dialog).getByPlaceholderText('Observaciones...'), { target: { value: 'Pagó en la tarde' } });

        fireEvent.click(within(dialog).getByRole('button', { name: /^Registrar/ }));

        expect(router.post).toHaveBeenCalledWith(
            '/credits/7/payments',
            { amount: 50000, payment_method: 'transfer', notes: 'Pagó en la tarde' },
            expect.any(Object),
        );
    });

    it('sends null notes when none were written', () => {
        const dialog = openAbono();
        fireEvent.click(within(dialog).getByRole('button', { name: /^\$\s10\.000$/ }));

        fireEvent.click(within(dialog).getByRole('button', { name: /^Registrar/ }));

        expect(vi.mocked(router.post).mock.calls[0][1]).toMatchObject({ amount: 10000, payment_method: 'efectivo', notes: null });
    });
});

describe('Credit detail: cancel dialog', () => {
    it('explains that the abonos stay in the cash register and that reserved stock is released', () => {
        renderShow({ type: 'layaway' });
        fireEvent.click(screen.getByRole('button', { name: /^Cancelar$/ }));

        const dialog = screen.getByRole('dialog', { name: /Cancelar crédito/ });
        expect(text(dialog)).toContain('abonos registrados por $ 50.000');
        expect(text(dialog)).toContain('El stock reservado se liberará.');
    });

    it('does not mention stock for installment credits and names the credit when there are no abonos', () => {
        renderShow({ amount_paid: 0, balance: 200000 });
        fireEvent.click(screen.getByRole('button', { name: /^Cancelar$/ }));

        const dialog = screen.getByRole('dialog', { name: /Cancelar crédito/ });
        expect(text(dialog)).toContain('Se cancelará el crédito CR-107.');
        expect(text(dialog)).not.toContain('stock');
    });

    it('posts the cancellation only from the confirm button', () => {
        renderShow();
        fireEvent.click(screen.getByRole('button', { name: /^Cancelar$/ }));
        expect(router.post).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar crédito' }));

        expect(router.post).toHaveBeenCalledWith('/credits/7/cancel', {}, expect.any(Object));
    });
});

describe('Credit detail: installment plan', () => {
    it('shows the edit pencil only with permission', () => {
        const { unmount } = renderShow({}, { canUpdateInstallments: false });
        expect(screen.queryByTitle('Editar plan de cuotas')).not.toBeInTheDocument();
        unmount();

        renderShow();
        expect(screen.getByTitle('Editar plan de cuotas')).toBeInTheDocument();
    });

    it('previews the installment amount and saves count and due date', () => {
        renderShow();
        fireEvent.click(screen.getByTitle('Editar plan de cuotas'));
        const dialog = screen.getByRole('dialog', { name: 'Editar plan de cuotas' });

        fireEvent.change(within(dialog).getByLabelText('Cuotas'), { target: { value: '8' } });
        expect(text(dialog)).toContain('8 cuotas de $ 25.000 cada una');

        fireEvent.change(within(dialog).getByLabelText('Fecha límite'), { target: { value: '2027-03-01' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar plan' }));

        expect(router.patch).toHaveBeenCalledWith('/credits/7/installments', { installments_count: 8, due_date: '2027-03-01' }, expect.any(Object));
    });

    it('cannot save without a due date', () => {
        renderShow({ due_date: null });
        fireEvent.click(screen.getByTitle('Editar plan de cuotas'));

        expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar plan' })).toBeDisabled();
    });
});
