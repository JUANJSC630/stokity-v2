import CashSessionClose from '@/pages/cash-sessions/close';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { post: vi.fn() },
    useForm: () => ({ data: { closing_amount_declared: '', closing_notes: '' }, setData: vi.fn(), post: vi.fn(), processing: false, errors: {} }),
}));

const session = { id: 7, opened_at: new Date().toISOString(), opening_amount: 100000 } as never;

const blindProps = {
    session,
    isBlind: true,
    expectedCash: null,
    totalSales: null,
    creditPaymentsTotal: null,
    creditPaymentsCount: 2,
    salesSummary: [{ method: 'cash', name: 'Efectivo', count: 2 }],
    movements: [{ id: 1, type: 'cash_out', concept: 'Domicilio', notes: null, created_at: '', session_id: 7, user_id: 1 }] as never,
};

const fullProps = {
    ...blindProps,
    isBlind: false,
    expectedCash: 213000,
    totalSales: 100000,
    creditPaymentsTotal: 20000,
    salesSummary: [{ method: 'cash', name: 'Efectivo', count: 2, total: 100000 }],
    movements: [{ ...(blindProps.movements as unknown as object[])[0], amount: 7000 }] as never,
};

describe('cash session close page', () => {
    beforeEach(() => {
        vi.stubGlobal('route', (name: string) => `/${name}`);
    });

    it('shows only counts to a blind user', () => {
        render(<CashSessionClose {...blindProps} />);

        expect(screen.getByText('Efectivo')).toBeInTheDocument();
        expect(screen.getByText('Domicilio')).toBeInTheDocument();
        expect(screen.getByText('2 abonos')).toBeInTheDocument();
        expect(screen.queryByText('Total ventas')).not.toBeInTheDocument();
        expect(screen.queryByText('Ingresos manuales')).not.toBeInTheDocument();
        expect(screen.queryByText('Efectivo esperado en caja:')).not.toBeInTheDocument();
        expect(screen.queryByText(/\$\s?100\.000/)).not.toBeInTheDocument();
        expect(screen.queryByText(/\$\s?7\.000/)).not.toBeInTheDocument();
    });

    it('shows totals, movement amounts and expected cash otherwise', () => {
        render(<CashSessionClose {...fullProps} />);

        expect(screen.getByText('Total ventas')).toBeInTheDocument();
        expect(screen.getByText('Efectivo esperado en caja:')).toBeInTheDocument();
        expect(screen.getAllByText(/100\.000/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/7\.000/).length).toBeGreaterThan(0);
    });
});
