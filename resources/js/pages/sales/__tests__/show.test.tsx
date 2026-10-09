import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Show from '../show';

vi.mock('@inertiajs/react', () => ({
    router: { reload: vi.fn(), visit: vi.fn() },
    Head: () => null,
    Link: 'a',
    usePage: vi.fn(() => ({ props: { business: { brand_color: '#C4686F' } } })),
}));
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/SaleTicket', () => ({ default: () => <div>ticket</div> }));
vi.mock('@/components/SaleReturnTicket', () => ({ default: () => <div>return-ticket</div> }));
vi.mock('@/components/sales/SaleReturnForm', () => ({ default: () => null }));
vi.mock('react-qr-code', () => ({ default: () => <svg data-testid="qr" /> }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/hooks/use-printer', () => ({
    usePrinter: () => ({ status: 'disconnected', selectedPrinter: null, printReceipt: vi.fn(), printReturn: vi.fn() }),
}));

const permissions = vi.hoisted(() => ({ granted: [] as string[] }));
vi.mock('@/hooks/use-permissions', () => ({ usePermissions: () => ({ can: (permission: string) => permissions.granted.includes(permission) }) }));

const products = [
    { id: 1, product_id: 11, quantity: 2, price: 45000, product: { name: 'Collar de perlas Luna', tax: 0 } },
    { id: 2, product_id: 12, quantity: 1, price: 38500, product: { name: 'Aretes dorados', tax: 19 } },
];

const baseSale = {
    id: 5,
    code: 'V-1005',
    total: 136300,
    discount_type: 'percentage',
    discount_value: 5,
    discount_amount: 6800,
    amount_paid: 150000,
    change_amount: 13700,
    payment_method: 'cash',
    date: '2026-10-08T10:00:00Z',
    status: 'completed',
    notes: 'Empaque de regalo',
    branch: { name: 'Centro' },
    client_id: 3,
    client: { name: 'María Gómez' },
    seller: { name: 'Carlos' },
    saleProducts: products,
    saleReturns: [],
};

function renderShow(sale: Record<string, unknown> = {}, props: Record<string, unknown> = {}) {
    return render(<Show sale={{ ...baseSale, ...sale } as never} {...(props as object)} />);
}

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
});

beforeEach(() => {
    vi.clearAllMocks();
    permissions.granted = ['sales.update'];
});

describe('Sales show', () => {
    it('leads with the total, the status and the payment method', () => {
        renderShow();

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('V-1005');
        expect(screen.getByText('Completada')).toBeInTheDocument();
        expect(screen.getAllByText('$ 136.300', { selector: '.sr-only' }).length).toBeGreaterThan(0);
        expect(screen.getByText('Efectivo · 2 productos')).toBeInTheDocument();
    });

    it('lists the products with quantity and subtotal', () => {
        renderShow();

        expect(screen.getAllByText('Collar de perlas Luna').length).toBeGreaterThan(0);
        expect(screen.getAllByText('$ 90.000').length).toBeGreaterThan(0);
        expect(screen.getAllByText('2 × $ 45.000').length).toBeGreaterThan(0);
    });

    it('breaks the amount down with discount, cash paid and change', () => {
        renderShow();

        const summary = screen.getByRole('heading', { name: 'Resumen' }).closest('section') as HTMLElement;
        expect(within(summary).getByText('Descuento (5%)')).toBeInTheDocument();
        expect(within(summary).getByText('−$ 6.800')).toBeInTheDocument();
        expect(within(summary).getByText('Pagó con')).toBeInTheDocument();
        expect(within(summary).getByText('$ 13.700')).toBeInTheDocument();
    });

    it('links the client to its page and shows notes', () => {
        renderShow();

        expect(screen.getByRole('link', { name: 'María Gómez' })).toHaveAttribute('href', '/clients.show/3?fromSale=5');
        expect(screen.getByText('Empaque de regalo')).toBeInTheDocument();
    });

    it('lets users with permission edit and disables it otherwise', () => {
        renderShow();
        expect(screen.getByRole('link', { name: 'Editar' })).toHaveAttribute('href', '/sales.edit/5');

        permissions.granted = [];
        renderShow();
        expect(screen.getByRole('button', { name: 'Editar' })).toBeDisabled();
    });

    it('explains that the printer is missing instead of failing silently', () => {
        renderShow();
        expect(screen.getByRole('button', { name: 'Imprimir' })).toBeDisabled();
    });

    it('opens the invoice preview', () => {
        renderShow();

        fireEvent.click(screen.getByRole('button', { name: 'Ver factura' }));

        expect(screen.getByRole('dialog', { name: 'Vista previa de la factura' })).toBeInTheDocument();
    });

    it('summarises returns with the net value and marks returned items', () => {
        renderShow({
            saleReturns: [
                {
                    id: 1,
                    reason: 'Talla incorrecta',
                    created_at: '2026-10-08T12:00:00Z',
                    products: [{ id: 11, name: 'Collar de perlas Luna', pivot: { quantity: 1, effective_price: 45000 } }],
                },
            ],
        });

        const returns = screen.getByRole('heading', { name: 'Devoluciones' }).closest('section') as HTMLElement;
        expect(within(returns).getByText('−$ 45.000')).toBeInTheDocument();
        expect(within(returns).getByText('Talla incorrecta')).toBeInTheDocument();
        expect(screen.getAllByText('Devuelto: 1 uds').length).toBeGreaterThan(0);
    });

    it('disables the return button when everything was already returned', () => {
        renderShow({
            saleReturns: [
                {
                    id: 1,
                    reason: null,
                    created_at: '2026-10-08T12:00:00Z',
                    products: [
                        { id: 11, name: 'Collar', pivot: { quantity: 2 } },
                        { id: 12, name: 'Aretes', pivot: { quantity: 1 } },
                    ],
                },
            ],
        });

        expect(screen.getByRole('button', { name: 'Devolución' })).toBeDisabled();
        expect(screen.getByText('Sin motivo')).toBeInTheDocument();
    });

    it('shows no actions and flags a deleted sale', () => {
        renderShow({ status: 'cancelled' }, { deleted: true });

        expect(screen.getByText('Eliminada')).toBeInTheDocument();
        expect(screen.getByText('Cancelada')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Devolución' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Ver factura' })).not.toBeInTheDocument();
    });

    it('shows the audit trail only with permission', () => {
        const logs = [
            {
                id: 1,
                action: 'updated',
                field_changed: 'status',
                old_value: 'pending',
                new_value: 'completed',
                created_at: '2026-10-08T12:00:00Z',
                user: { name: 'Ana' },
            },
        ];

        renderShow({}, { auditLogs: logs });
        expect(screen.queryByRole('heading', { name: 'Auditoría' })).not.toBeInTheDocument();

        permissions.granted = ['sales.view_audit'];
        renderShow({}, { auditLogs: logs });
        expect(screen.getByRole('heading', { name: 'Auditoría' })).toBeInTheDocument();
        expect(toast.error).not.toHaveBeenCalled();
    });

    it('survives a sale without products or client', () => {
        renderShow({ saleProducts: [], client: null, client_id: 0, seller: null, notes: null });

        expect(screen.getAllByText('Sin productos registrados').length).toBeGreaterThan(0);
        expect(screen.getByText('Cliente')).toBeInTheDocument();
    });
});
