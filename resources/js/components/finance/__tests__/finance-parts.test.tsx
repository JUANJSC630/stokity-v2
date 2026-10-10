import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { colorHex } from '../expense-colors';
import { DueStatusPill, ExpenseCards, ExpenseTable, OriginPill, PeriodChips, ProfitSplit } from '../finance-parts';

const text = (node: HTMLElement) => (node.textContent ?? '').replace(/\s/g, ' ');

const expense = (id: number, overrides: Record<string, unknown> = {}) =>
    ({
        id,
        amount: 800000,
        description: 'Arriendo local',
        expense_date: '2026-10-05T12:00:00',
        category: { id: 1, name: 'Arriendo', color: '#ef4444' },
        ...overrides,
    }) as never;

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
});

describe('period chips', () => {
    it('shows the five periods, marks the chosen one and reports a change', () => {
        const onChange = vi.fn();
        render(<PeriodChips value="this_month" onChange={onChange} />);

        expect(screen.getAllByRole('button')).toHaveLength(5);
        expect(screen.getByRole('button', { name: 'Este mes' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Este año' })).toHaveAttribute('aria-pressed', 'false');

        fireEvent.click(screen.getByRole('button', { name: 'Este año' }));
        expect(onChange).toHaveBeenCalledWith('this_year');
    });
});

describe('profit split', () => {
    it('splits the net revenue into cost, expenses and profit that add up to the whole', () => {
        render(<ProfitSplit netRevenue={5000000} cogs={2000000} expenses={1200000} netProfit={1800000} />);

        const legend = screen.getByRole('list');
        expect(text(legend)).toContain('Costo de lo vendido 40%');
        expect(text(legend)).toContain('Gastos 24%');
        expect(text(legend)).toContain('Ganancia 36%');
        expect(screen.getByRole('img', { name: 'Reparto de los ingresos netos' })).toBeInTheDocument();
    });

    it('shows only cost and expenses, with a warning, when the business lost money', () => {
        render(<ProfitSplit netRevenue={1000000} cogs={900000} expenses={300000} netProfit={-200000} />);

        const legend = text(screen.getByRole('list'));
        expect(legend).not.toContain('Ganancia');
        expect(legend).toContain('Costo de lo vendido 75%');
        expect(legend).toContain('Gastos 25%');
        expect(screen.getByText('Los costos y gastos superan a los ingresos del periodo.')).toBeInTheDocument();
    });

    it('shows nothing without revenue', () => {
        const { container } = render(<ProfitSplit netRevenue={0} cogs={0} expenses={0} netProfit={0} />);

        expect(container).toBeEmptyDOMElement();
    });
});

describe('expense rows', () => {
    it('lists the table with date, description, category and amount, and runs edit and delete', () => {
        const onEdit = vi.fn();
        const onDelete = vi.fn();
        render(<ExpenseTable expenses={[expense(1), expense(2, { description: null, category: null })]} onEdit={onEdit} onDelete={onDelete} />);

        const rows = within(screen.getByRole('table')).getAllByRole('row');
        expect(text(rows[1])).toContain('05 oct');
        expect(text(rows[1])).toContain('Arriendo local');
        expect(text(rows[1])).toContain('$ 800.000');
        expect(text(rows[2])).toContain('Sin descripción');
        expect(text(rows[2])).toContain('—');

        fireEvent.click(within(rows[1]).getByRole('button', { name: 'Editar' }));
        fireEvent.click(within(rows[1]).getByRole('button', { name: 'Eliminar' }));
        expect(onEdit).toHaveBeenCalledTimes(1);
        expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('falls back to the category name when there is no description, on phone cards', () => {
        render(<ExpenseCards expenses={[expense(1, { description: null })]} onEdit={vi.fn()} onDelete={vi.fn()} />);

        const list = screen.getByRole('list', { name: '1 gasto(s)' });
        expect(text(list)).toContain('Arriendo');
        expect(text(list)).toContain('05 oct · Arriendo');
    });
});

describe('detailed expense rows', () => {
    it('shows the full date and the origin of each expense in the table', () => {
        render(<ExpenseTable expenses={[expense(1), expense(2, { template: { id: 3 } })]} onEdit={vi.fn()} onDelete={vi.fn()} detailed />);

        const rows = within(screen.getByRole('table')).getAllByRole('row');
        expect(text(rows[0])).toContain('Origen');
        expect(text(rows[1])).toContain('05/10/2026');
        expect(text(rows[1])).toContain('Puntual');
        expect(text(rows[2])).toContain('Recurrente');
    });

    it('does the same on phone cards', () => {
        render(<ExpenseCards expenses={[expense(1, { template: { id: 3 } })]} onEdit={vi.fn()} onDelete={vi.fn()} detailed />);

        expect(text(screen.getByRole('list'))).toContain('05/10/2026 · Arriendo');
        expect(screen.getByText('Recurrente')).toBeInTheDocument();
    });

    it('names the origin of an expense', () => {
        const { rerender } = render(<OriginPill recurring />);
        expect(screen.getByText('Recurrente')).toBeInTheDocument();
        rerender(<OriginPill recurring={false} />);
        expect(screen.getByText('Puntual')).toBeInTheDocument();
    });
});

describe('due status and colors', () => {
    it.each([
        ['registered', 'Registrado'],
        ['overdue', 'Vencido'],
        ['due_soon', 'Vence pronto'],
        ['inactive', 'Pausada'],
        ['pending', 'Pendiente'],
        [undefined, 'Pendiente'],
    ])('names %s as %s', (status, label) => {
        render(<DueStatusPill status={status as never} />);

        expect(screen.getByText(label)).toBeInTheDocument();
    });

    it('turns a stored color name into its hex, keeps a hex and falls back to a neutral gray', () => {
        expect(colorHex('red')).toBe('#ef4444');
        expect(colorHex('slate')).toBe('#64748b');
        expect(colorHex('#123456')).toBe('#123456');
        expect(colorHex('nope')).toBe('#94a3b8');
        expect(colorHex(null)).toBe('#94a3b8');
    });
});
