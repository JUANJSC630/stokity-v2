import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreditSaleDialog } from '../credit-sale-dialog';
import { PendingQuotesSheet, type PendingQuote } from '../pending-quotes-sheet';

vi.mock('@inertiajs/react', () => ({
    usePage: vi.fn(() => ({ props: { business: { brand_color: '#C4686F' } } })),
    Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));
vi.mock('@/components/PaymentMethodSelect', () => ({ default: () => <div data-testid="abono-method" /> }));

const quote = (id: number, overrides: Partial<PendingQuote> = {}): PendingQuote => ({
    id,
    code: `20261009000012345${id}`,
    client_name: `Cliente ${id}`,
    product_count: id,
    total: 40000 * id,
    created_at: '2026-10-09T10:00:00',
    ...overrides,
});

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
    vi.stubGlobal('route', (name: string, id: number) => `/${name}/${id}`);
});

beforeEach(() => vi.clearAllMocks());

function sheet(overrides: Partial<React.ComponentProps<typeof PendingQuotesSheet>> = {}) {
    const props = { open: true, loading: false, quotes: [quote(1), quote(2)], onClose: vi.fn(), onLoad: vi.fn(), onDelete: vi.fn(), ...overrides };
    render(<PendingQuotesSheet {...props} />);
    return props;
}

describe('PendingQuotesSheet', () => {
    it('lists each quote with client, short code, total and product count', () => {
        sheet();

        expect(screen.getByRole('dialog', { name: 'Cotizaciones pendientes' })).toBeInTheDocument();
        const first = screen.getByText('Cliente 1').closest('li') as HTMLElement;
        expect(first.textContent?.replace(/\s/g, ' ')).toContain('$ 40.000');
        expect(within(first).getByText(/1 producto ·/)).toBeInTheDocument();
        expect(screen.getByText(/2 productos ·/)).toBeInTheDocument();
        expect(within(first).getByText(/^#/)).toBeInTheDocument();
    });

    it('reports which quote to load or delete', () => {
        const props = sheet();

        fireEvent.click(screen.getAllByRole('button', { name: 'Cargar' })[1]);
        fireEvent.click(screen.getAllByRole('button', { name: /Eliminar cotización/ })[0]);

        expect(props.onLoad).toHaveBeenCalledWith(props.quotes[1]);
        expect(props.onDelete).toHaveBeenCalledWith(props.quotes[0]);
    });

    it('explains and links to the sale instead of offering deletion when the quote has audit history', () => {
        const props = sheet({ quotes: [{ ...quote(1), has_audit_history: true }, quote(2)] });

        const [locked, free] = screen.getAllByRole('listitem');
        expect(within(locked).getByText(/historial de auditoría/)).toBeInTheDocument();
        expect(within(locked).getByRole('link', { name: 'Ver venta' })).toHaveAttribute('href', '/sales.show/1');
        expect(within(locked).queryByRole('button', { name: /Eliminar cotización/ })).not.toBeInTheDocument();
        expect(within(free).getByRole('button', { name: /Eliminar cotización/ })).toBeEnabled();
        expect(props.onDelete).not.toHaveBeenCalled();
    });

    it('shows a loading hint instead of the list', () => {
        sheet({ loading: true });

        expect(screen.getByText('Cargando...')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Cargar' })).not.toBeInTheDocument();
    });

    it('says when there are no quotes', () => {
        sheet({ quotes: [] });

        expect(screen.getByText('No hay cotizaciones pendientes')).toBeInTheDocument();
    });

    it('is not rendered when closed', () => {
        sheet({ open: false });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes with Escape', () => {
        const props = sheet();

        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

        expect(props.onClose).toHaveBeenCalledTimes(1);
    });
});

function credit(overrides: Partial<React.ComponentProps<typeof CreditSaleDialog>> = {}) {
    const props: React.ComponentProps<typeof CreditSaleDialog> = {
        open: true,
        onClose: vi.fn(),
        type: 'layaway',
        onSelectType: vi.fn(),
        installments: 3,
        onInstallmentsChange: vi.fn(),
        dueDate: '',
        onDueDateChange: vi.fn(),
        initialPayment: 0,
        onInitialPaymentChange: vi.fn(),
        initialMethod: 'efectivo',
        onInitialMethodChange: vi.fn(),
        notes: '',
        onNotesChange: vi.fn(),
        total: 90000,
        submitting: false,
        onConfirm: vi.fn(),
        ...overrides,
    };
    render(<CreditSaleDialog {...props} />);
    return props;
}

describe('CreditSaleDialog', () => {
    it('offers the four credit types and marks the selected one', () => {
        const props = credit({ type: 'installments' });

        expect(screen.getByRole('button', { name: /Cuotas/ })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: /Separado/ })).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(screen.getByRole('button', { name: /Reservado/ }));

        expect(props.onSelectType).toHaveBeenCalledWith('hold');
    });

    it('asks for the number of installments and the last due date only for installments', () => {
        credit({ type: 'installments' });

        expect(screen.getByLabelText('Número de cuotas')).toBeInTheDocument();
        expect(screen.getByLabelText('Fecha última cuota')).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /3 cuotas — \$\s30\.000 c\/u/ })).toBeInTheDocument();
    });

    it('asks for a payment deadline for an agreed date and nothing extra for a layaway', () => {
        const { unmount } = render(<div />);
        unmount();
        credit({ type: 'due_date' });
        expect(screen.getByLabelText('Fecha límite de pago')).toBeInTheDocument();
        expect(screen.queryByLabelText('Número de cuotas')).not.toBeInTheDocument();
    });

    it('hides the initial payment for a reservation', () => {
        credit({ type: 'hold' });

        expect(screen.queryByText('Abono inicial (opcional)')).not.toBeInTheDocument();
    });

    it('shows the balance and the method of the initial payment once there is one', () => {
        credit({ initialPayment: 30000 });

        expect(screen.getByTestId('abono-method')).toBeInTheDocument();
        const balance = screen.getByText('Saldo pendiente').parentElement as HTMLElement;
        expect(balance.textContent?.replace(/\s/g, ' ')).toContain('$ 60.000');
    });

    it('blocks the confirmation when the initial payment is above the total and says why', () => {
        credit({ initialPayment: 100000 });

        expect(screen.getByRole('button', { name: 'Confirmar crédito' })).toBeDisabled();
        expect(screen.getByText('El abono no puede ser mayor al total del crédito.')).toBeInTheDocument();
    });

    it('blocks the confirmation while submitting and shows the progress label', () => {
        credit({ submitting: true });

        expect(screen.getByRole('button', { name: 'Registrando...' })).toBeDisabled();
    });

    it('confirms and cancels through its handlers', () => {
        const props = credit();

        fireEvent.click(screen.getByRole('button', { name: 'Confirmar crédito' }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(props.onConfirm).toHaveBeenCalledTimes(1);
        expect(props.onClose).toHaveBeenCalledTimes(1);
    });
});
