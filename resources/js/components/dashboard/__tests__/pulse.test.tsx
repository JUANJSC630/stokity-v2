import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AttentionPanel } from '../attention-panel';
import { CashStatus } from '../cash-status';
import { MonthPace } from '../month-pace';
import { OverdueCreditsAlert } from '../overdue-credits-alert';
import { PaymentMix } from '../payment-mix';

vi.mock('@inertiajs/react', () => ({ Link: 'a' }));

const text = (node: HTMLElement) => (node.textContent ?? '').replace(/\s/g, ' ');

describe('PaymentMix', () => {
    const rows = [
        { method: 'cash', group: 'cash' as const, count: 5, total: 500000 },
        { method: 'efectivo', group: 'cash' as const, count: 1, total: 100000 },
        { method: 'credit_card', group: 'card' as const, count: 2, total: 300000 },
        { method: 'cheque', group: 'other' as const, count: 1, total: 100000 },
    ];

    it('adds up the methods of one family and shows each share and amount', () => {
        render(<PaymentMix rows={rows} />);

        expect(screen.getByRole('img', { name: 'Formas de pago de hoy: Efectivo 60 %, Tarjeta 30 %, Otros 10 %' })).toBeInTheDocument();
        expect(text(screen.getByText('Efectivo').closest('div') as HTMLElement)).toContain('60 %');
        expect(text(screen.getByText('Efectivo').closest('div') as HTMLElement)).toContain('$ 600.000');
        expect(screen.queryByText('Transferencia')).not.toBeInTheDocument();
    });

    it('renders nothing on a day without money', () => {
        const { container } = render(<PaymentMix rows={[]} />);
        expect(container).toBeEmptyDOMElement();

        const zero = render(<PaymentMix rows={[{ method: 'cash', group: 'cash', count: 0, total: 0 }]} />);
        expect(zero.container).toBeEmptyDOMElement();
    });
});

describe('CashStatus', () => {
    it('says the till is open and since when', () => {
        render(<CashStatus cashSession={{ required: false, open: { id: 4, opened_at: '2026-10-13T08:02:00' } }} />);

        expect(screen.getByText(/Caja abierta · desde 8:02/)).toBeInTheDocument();
    });

    it('warns, with a way to open it, when a required session is closed', () => {
        render(<CashStatus cashSession={{ required: true, open: null }} openHref="/pos" />);

        expect(screen.getByRole('link', { name: /Caja cerrada · Abrir en el POS/ })).toHaveAttribute('href', '/pos');
    });

    it('only informs when the user has no way to open it', () => {
        render(<CashStatus cashSession={{ required: true, open: null }} />);

        expect(screen.getByText('Caja cerrada')).toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it.each([
        ['no data', null],
        ['not required and not open', { required: false, open: null }],
    ])('is hidden with %s', (_name, cashSession) => {
        const { container } = render(<CashStatus cashSession={cashSession} openHref="/pos" />);

        expect(container).toBeEmptyDOMElement();
    });
});

describe('OverdueCreditsAlert', () => {
    it('says how many are overdue and how much is owed, linking to them', () => {
        render(<OverdueCreditsAlert overdue={{ count: 2, balance: 120000 }} href="/credits?tab=overdue" />);

        const link = screen.getByRole('link', { name: /2 créditos vencidos/ });
        expect(link).toHaveAttribute('href', '/credits?tab=overdue');
        expect(text(link)).toContain('$ 120.000 por cobrar');
    });

    it('uses the singular for one credit', () => {
        render(<OverdueCreditsAlert overdue={{ count: 1, balance: 5000 }} href="/c" />);

        expect(screen.getByRole('link', { name: /1 crédito vencido/ })).toBeInTheDocument();
    });

    it.each([null, undefined, { count: 0, balance: 0 }])('shows nothing for %j', (overdue) => {
        const { container } = render(<OverdueCreditsAlert overdue={overdue} href="/c" />);

        expect(container).toBeEmptyDOMElement();
    });
});

describe('AttentionPanel', () => {
    it('shows what was given to it, with how many things need attention', () => {
        render(
            <AttentionPanel count={2}>
                <p>detalle</p>
            </AttentionPanel>,
        );

        const panel = screen.getByRole('region', { name: 'Para atender' });
        expect(within(panel).getByText('2')).toBeInTheDocument();
        expect(within(panel).getByText('detalle')).toBeInTheDocument();
    });

    it('celebrates an empty list instead of showing an empty box', () => {
        render(
            <AttentionPanel count={0}>
                <p>detalle</p>
            </AttentionPanel>,
        );

        expect(screen.getByText('Todo al día')).toBeInTheDocument();
        expect(screen.queryByText('detalle')).not.toBeInTheDocument();
    });
});

describe('MonthPace', () => {
    it('compares the month with the same point of last month and with the whole of it', () => {
        render(<MonthPace revenue={9000000} sales={90} averageSale={100000} previous={{ revenue: 20000000, revenue_same_period: 6000000 }} />);

        const month = screen.getByRole('region', { name: 'Este mes' });
        expect(month).toHaveTextContent('+50%');
        expect(screen.getByRole('img', { name: 'Llevas el 45 % de lo que vendiste todo el mes pasado' })).toBeInTheDocument();
        expect(text(month)).toContain('$ 20.000.000 que vendiste todo el mes pasado');
        expect(text(month)).toContain('90 transacciones · ticket promedio $ 100.000');
    });

    it('never fills the bar past the whole of last month', () => {
        render(<MonthPace revenue={30000000} sales={1} averageSale={1} previous={{ revenue: 20000000, revenue_same_period: 10000000 }} />);

        expect(screen.getByRole('img', { name: 'Llevas el 100 % de lo que vendiste todo el mes pasado' })).toBeInTheDocument();
    });

    it('says there is nothing to compare when last month had no sales', () => {
        render(<MonthPace revenue={500000} sales={3} averageSale={166666} previous={{ revenue: 0, revenue_same_period: 0 }} />);

        expect(screen.getByText('Aún no hay un mes anterior con ventas para comparar.')).toBeInTheDocument();
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(screen.queryByText(/vs mismo punto/)).not.toBeInTheDocument();
    });

    it('works without the comparison data and offers finances only when given a link', () => {
        const { unmount } = render(<MonthPace revenue={500000} sales={1} averageSale={500000} />);
        expect(screen.getByText('1 transacción · ticket promedio $ 500.000 · bruto antes de devoluciones', { exact: false })).toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        unmount();

        render(<MonthPace revenue={1} sales={1} averageSale={1} financesHref="/finanzas" />);
        expect(screen.getByRole('link', { name: 'Ver en Finanzas' })).toHaveAttribute('href', '/finanzas');
    });
});
