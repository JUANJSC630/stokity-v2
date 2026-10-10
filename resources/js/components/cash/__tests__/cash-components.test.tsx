import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
    MovementKind,
    SessionStatusPill,
    differenceText,
    differenceTone,
    differenceWord,
    formatCOP,
    formatDifference,
    formatDuration,
} from '../cash-meta';
import { ManualMovements, SalesByMethod } from '../cash-sections';

vi.mock('@inertiajs/react', () => ({ router: { visit: vi.fn() } }));

const text = (node: HTMLElement) => (node.textContent ?? '').replace(/\s/g, ' ');

describe('cash meta', () => {
    it('writes money that may arrive as text, and zero for anything unreadable', () => {
        expect(formatCOP('1500.00').replace(/\s/g, ' ')).toBe('$ 1.500');
        expect(formatCOP(null)).toBe('$ 0'.replace(' ', ' '));
        expect(formatCOP('abc')).toBe('$0');
    });

    it('signs the difference and names its tone', () => {
        expect(formatDifference(3000).replace(/\s/g, ' ')).toBe('+$ 3.000');
        expect(formatDifference(-5000).replace(/\s/g, ' ')).toBe('-$ 5.000');
        expect(differenceTone(0)).toBe('balanced');
        expect(differenceTone(-1)).toBe('short');
        expect(differenceTone(1)).toBe('over');
        expect(differenceWord(0)).toBe('Cuadra');
        expect(differenceWord(-1)).toBe('Faltante');
        expect(differenceWord(1)).toBe('Sobrante');
        expect(differenceText(-1)).toContain('red');
        expect(differenceText(1)).toContain('amber');
        expect(differenceText(0)).toContain('green');
    });

    it('measures a shift in hours and minutes, with a dash while it is open', () => {
        expect(formatDuration('2026-10-05T13:00:00Z', '2026-10-05T21:30:00Z')).toBe('8h 30m');
        expect(formatDuration('2026-10-05T13:00:00Z', '2026-10-05T13:45:00Z')).toBe('45m');
        expect(formatDuration('2026-10-05T13:00:00Z', null)).toBe('—');
    });

    it('names the state and the kind of movement', () => {
        const { rerender } = render(<SessionStatusPill open />);
        expect(screen.getByText('Abierta')).toBeInTheDocument();
        rerender(<SessionStatusPill open={false} />);
        expect(screen.getByText('Cerrada')).toBeInTheDocument();

        rerender(<MovementKind type="cash_in" />);
        expect(screen.getByText('INGRESO')).toBeInTheDocument();
        rerender(<MovementKind type="cash_out" />);
        expect(screen.getByText('EGRESO')).toBeInTheDocument();
    });
});

describe('cash sections', () => {
    const rows = [
        { method: 'cash', name: 'Efectivo', count: 5, total: 250000 },
        { method: 'card', name: 'Tarjeta', count: 2, total: 120000 },
    ];

    it('lists the sales by method with the grand total, or only counts for a blind cashier', () => {
        const { rerender } = render(<SalesByMethod title="Ventas del turno" rows={rows} isBlind={false} totalLabel="Total ventas" total={370000} />);
        expect(text(screen.getByRole('table'))).toContain('$ 250.000');
        expect(text(screen.getByRole('table'))).toContain('Total ventas');
        expect(text(screen.getByRole('table'))).toContain('$ 370.000');

        rerender(
            <SalesByMethod
                title="Ventas del turno"
                rows={rows.map(({ method, name, count }) => ({ method, name, count }))}
                isBlind
                totalLabel="Total ventas"
                total={0}
            />,
        );
        expect(screen.queryByRole('columnheader', { name: 'Total' })).not.toBeInTheDocument();
        expect(text(screen.getByRole('table'))).not.toContain('$');
    });

    it('says so when there were no sales', () => {
        render(<SalesByMethod title="Ventas del turno" rows={[]} isBlind={false} totalLabel="Total" total={0} />);

        expect(screen.getByText('Sin ventas en este turno')).toBeInTheDocument();
    });

    it('lists manual movements with the cashier or the note, and hides amounts when blind', () => {
        const movements = [
            { id: 1, type: 'cash_in', concept: 'Abono', amount: 20000, notes: 'Ana', user: { id: 2, name: 'Carlos' } },
            { id: 2, type: 'cash_out', concept: 'Domicilio', amount: 7000, notes: null, user: { id: 2, name: 'Carlos' } },
        ];
        const { rerender, container } = render(<ManualMovements movements={movements} isBlind={false} detail="user" footer={<p>pie</p>} />);
        expect(text(container)).toContain('· Carlos');
        expect(text(container)).toContain('+$ 20.000');
        expect(text(container)).toContain('-$ 7.000');
        expect(screen.getByText('pie')).toBeInTheDocument();

        rerender(<ManualMovements movements={movements} isBlind={false} detail="notes" />);
        expect(text(container)).toContain('· Ana');
        expect(text(container)).not.toContain('· Carlos');

        rerender(<ManualMovements movements={movements} isBlind detail="notes" />);
        expect(text(container)).not.toMatch(/\$\s?\d/);
    });
});
