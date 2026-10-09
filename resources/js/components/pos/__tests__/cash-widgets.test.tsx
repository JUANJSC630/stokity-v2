import { router } from '@inertiajs/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CashMovementDialog, OpenSessionDialog, VariablePriceDialog } from '../cash-dialogs';
import { CashSessionWidget } from '../cash-session-widget';

vi.mock('@inertiajs/react', () => ({
    router: { visit: vi.fn() },
    usePage: vi.fn(() => ({ props: { business: { brand_color: '#C4686F' } } })),
}));

const session = { id: 5, opened_at: '2026-10-09T08:30:00' } as never;

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
    vi.stubGlobal('route', (name: string, id?: number) => `/${name}${id ? `/${id}` : ''}`);
});

beforeEach(() => vi.clearAllMocks());

describe('CashSessionWidget', () => {
    it('offers to open the register when there is no session', () => {
        const onOpen = vi.fn();
        render(<CashSessionWidget session={null} requireCashSession={false} onOpen={onOpen} onMovement={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: 'Caja cerrada' }));

        expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('says "Abrir caja" when the business requires an open register', () => {
        render(<CashSessionWidget session={null} requireCashSession onOpen={vi.fn()} onMovement={vi.fn()} />);

        expect(screen.getByRole('button', { name: 'Abrir caja' })).toBeInTheDocument();
    });

    it('shows when the register was opened and lists its actions', () => {
        render(<CashSessionWidget session={session} requireCashSession={false} onOpen={vi.fn()} onMovement={vi.fn()} />);

        const pill = screen.getByRole('button', { name: /^Caja ·/ });
        expect(pill).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(pill);

        expect(pill).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('button', { name: 'Ingreso de efectivo' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Egreso de efectivo' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cerrar caja' })).toBeInTheDocument();
    });

    it('reports the movement type and closes the menu', () => {
        const onMovement = vi.fn();
        render(<CashSessionWidget session={session} requireCashSession={false} onOpen={vi.fn()} onMovement={onMovement} />);
        fireEvent.click(screen.getByRole('button', { name: /^Caja ·/ }));

        fireEvent.click(screen.getByRole('button', { name: 'Egreso de efectivo' }));

        expect(onMovement).toHaveBeenCalledWith('cash_out');
        expect(screen.queryByRole('button', { name: 'Cerrar caja' })).not.toBeInTheDocument();
    });

    it('goes to the closing form for this session', () => {
        render(<CashSessionWidget session={session} requireCashSession={false} onOpen={vi.fn()} onMovement={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /^Caja ·/ }));

        fireEvent.click(screen.getByRole('button', { name: 'Cerrar caja' }));

        expect(router.visit).toHaveBeenCalledWith('/cash-sessions.close.form/5');
    });

    it('closes the menu with Escape and when clicking elsewhere', () => {
        render(<CashSessionWidget session={session} requireCashSession={false} onOpen={vi.fn()} onMovement={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /^Caja ·/ }));
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('button', { name: 'Cerrar caja' })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /^Caja ·/ }));
        fireEvent.mouseDown(document.body);
        expect(screen.queryByRole('button', { name: 'Cerrar caja' })).not.toBeInTheDocument();
    });
});

const openProps = {
    amount: '',
    notes: '',
    submitting: false,
    onAmountChange: vi.fn(),
    onNotesChange: vi.fn(),
    onSubmit: vi.fn((event: { preventDefault: () => void }) => event.preventDefault()),
    onClose: vi.fn(),
};

describe('OpenSessionDialog', () => {
    it('cannot be dismissed when the business requires an open register and offers a way out', () => {
        const onClose = vi.fn();
        render(<OpenSessionDialog {...openProps} open blocking onClose={onClose} />);

        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

        expect(screen.getByRole('dialog', { name: 'Abrir caja' })).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByText('Debes abrir la caja antes de realizar ventas.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/dashboard');
    });

    it('can be dismissed when the register is optional', () => {
        const onClose = vi.fn();
        render(<OpenSessionDialog {...openProps} open blocking={false} onClose={onClose} />);

        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('link', { name: 'Ir al inicio' })).not.toBeInTheDocument();
    });

    it('submits the form and shows the progress label', () => {
        const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
        const { rerender } = render(<OpenSessionDialog {...openProps} open blocking={false} onSubmit={onSubmit} />);

        fireEvent.submit(screen.getByRole('button', { name: 'Abrir caja' }).closest('form') as HTMLFormElement);
        expect(onSubmit).toHaveBeenCalledTimes(1);

        rerender(<OpenSessionDialog {...openProps} open blocking={false} submitting />);
        expect(screen.getByRole('button', { name: 'Abriendo...' })).toBeDisabled();
    });

    it('reports the initial float and the notes', () => {
        const onAmountChange = vi.fn();
        const onNotesChange = vi.fn();
        render(<OpenSessionDialog {...openProps} open blocking={false} onAmountChange={onAmountChange} onNotesChange={onNotesChange} />);

        fireEvent.change(screen.getByLabelText('Fondo inicial'), { target: { value: '150000' } });
        fireEvent.change(screen.getByLabelText('Notas (opcional)'), { target: { value: 'Turno de la mañana' } });

        expect(onAmountChange).toHaveBeenCalledWith('150000');
        expect(onNotesChange).toHaveBeenCalledWith('Turno de la mañana');
    });
});

const movementProps = {
    open: true,
    type: 'cash_in' as const,
    amount: '',
    concept: '',
    notes: '',
    submitting: false,
    onTypeChange: vi.fn(),
    onAmountChange: vi.fn(),
    onConceptChange: vi.fn(),
    onNotesChange: vi.fn(),
    onSubmit: vi.fn((event: { preventDefault: () => void }) => event.preventDefault()),
    onClose: vi.fn(),
};

describe('CashMovementDialog', () => {
    it('titles the dialog after the movement type and lets the user switch it', () => {
        const onTypeChange = vi.fn();
        render(<CashMovementDialog {...movementProps} onTypeChange={onTypeChange} />);

        expect(screen.getByRole('dialog', { name: 'Ingreso de efectivo' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Ingreso' })).toHaveAttribute('aria-pressed', 'true');

        fireEvent.click(screen.getByRole('button', { name: 'Egreso' }));
        expect(onTypeChange).toHaveBeenCalledWith('cash_out');
    });

    it('reports amount, concept and notes and submits', () => {
        const props = {
            ...movementProps,
            onAmountChange: vi.fn(),
            onConceptChange: vi.fn(),
            onSubmit: vi.fn((e: { preventDefault: () => void }) => e.preventDefault()),
        };
        render(<CashMovementDialog {...props} type="cash_out" />);

        fireEvent.change(screen.getByLabelText('Monto *'), { target: { value: '25000' } });
        fireEvent.change(screen.getByLabelText('Concepto *'), { target: { value: 'Pago proveedor' } });
        fireEvent.submit(screen.getByRole('button', { name: 'Registrar' }).closest('form') as HTMLFormElement);

        expect(props.onAmountChange).toHaveBeenCalledWith('25000');
        expect(props.onConceptChange).toHaveBeenCalledWith('Pago proveedor');
        expect(props.onSubmit).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('dialog', { name: 'Egreso de efectivo' })).toBeInTheDocument();
    });

    it('is not rendered when closed and disables the button while submitting', () => {
        const { rerender } = render(<CashMovementDialog {...movementProps} open={false} />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        rerender(<CashMovementDialog {...movementProps} submitting />);
        expect(screen.getByRole('button', { name: 'Registrando...' })).toBeDisabled();
    });
});

describe('VariablePriceDialog', () => {
    it('stays closed without a product and names the service when open', () => {
        const { rerender } = render(<VariablePriceDialog productName={null} value={0} onChange={vi.fn()} onConfirm={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        rerender(<VariablePriceDialog productName="Arreglo de joyería" value={20000} onChange={vi.fn()} onConfirm={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByRole('dialog', { name: 'Precio del servicio' })).toBeInTheDocument();
        expect(screen.getByText('Arreglo de joyería')).toBeInTheDocument();
    });

    it('confirms or cancels through its handlers', () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(<VariablePriceDialog productName="Arreglo" value={20000} onChange={vi.fn()} onConfirm={onConfirm} onCancel={onCancel} />);

        fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('reports the typed price', () => {
        const onChange = vi.fn();
        render(<VariablePriceDialog productName="Arreglo" value={0} onChange={onChange} onConfirm={vi.fn()} onCancel={vi.fn()} />);

        fireEvent.change(screen.getByRole('textbox', { name: 'Precio del servicio' }), { target: { value: '35000' } });

        expect(onChange).toHaveBeenCalledWith(35000);
    });
});
