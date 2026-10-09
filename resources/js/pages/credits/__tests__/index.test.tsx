/** Characterization tests for the credits list: they pin what it does today before the redesign. */
import { router } from '@inertiajs/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import CreditsIndex from '../index';

vi.mock('@inertiajs/react', () => ({
    router: { get: vi.fn(), visit: vi.fn() },
    Head: () => null,
    Link: 'a',
    usePage: vi.fn(() => ({ props: {} })),
}));
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/hooks/use-polling', () => ({ usePolling: vi.fn() }));
vi.mock('@/components/ui/select', () => ({
    Select: ({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children: ReactNode }) => (
        <select aria-label="Modalidad" value={value} onChange={(e) => onValueChange?.(e.target.value)}>
            {children}
        </select>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));

const daysFromNow = (days: number) => new Date(Date.now() + days * 86400000).toISOString();

const credit = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    code: `CR-${100 + id}`,
    type: 'installments',
    status: 'active',
    client: { name: `Cliente ${id}` },
    seller: { name: 'Carlos' },
    total_amount: 200000,
    amount_paid: 50000,
    balance: 150000,
    due_date: daysFromNow(20),
    created_at: '2026-10-01T10:00:00Z',
    ...overrides,
});

function renderPage(data: ReturnType<typeof credit>[], filters = {}, overdueCount = 0) {
    return render(
        <CreditsIndex
            credits={{ data: data as never, links: [], current_page: 1, from: 1, to: data.length, total: data.length, last_page: 1 } as never}
            filters={filters}
            overdueCount={overdueCount}
        />,
    );
}

const text = (node: HTMLElement) => (node.textContent ?? '').replace(/\s/g, ' ');

beforeAll(() => {
    vi.stubGlobal('route', (name: string) => `/${name}`);
});

beforeEach(() => vi.clearAllMocks());

describe('Credits index', () => {
    it('lists each credit with code, status, type, client, paid amount, total and what is missing', () => {
        renderPage([credit(1)]);

        const row = screen.getByRole('link', { name: /CR-101/ });
        expect(row).toHaveAttribute('href', '/credits/1');
        expect(text(row)).toContain('Activo');
        expect(text(row)).toContain('Cuotas');
        expect(text(row)).toContain('Cliente 1');
        expect(text(row)).toContain('$ 50.000');
        expect(text(row)).toContain('/ $ 200.000');
        expect(text(row)).toContain('Falta: $ 150.000');
        expect(text(row)).toContain('25%');
    });

    it('does not show "Falta" for a credit that is fully paid', () => {
        renderPage([credit(1, { status: 'completed', amount_paid: 200000, balance: 0 })]);

        const row = screen.getByRole('link', { name: /CR-101/ });
        expect(text(row)).toContain('Completado');
        expect(text(row)).not.toContain('Falta');
        expect(text(row)).toContain('100%');
    });

    it('says how late an overdue credit is and warns about one that is about to be due', () => {
        renderPage([credit(1, { status: 'overdue', due_date: daysFromNow(-5) }), credit(2, { due_date: daysFromNow(2) })]);

        expect(screen.getByText(/Venció hace \d+ días?/)).toBeInTheDocument();
        expect(screen.getByText(/Vence en \d+ días?/)).toBeInTheDocument();
    });

    it('shows no due date line for cancelled credits', () => {
        renderPage([credit(1, { status: 'cancelled' })]);

        expect(screen.queryByText(/Vence/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Venció/)).not.toBeInTheDocument();
    });

    it('marks the active tab (Activos by default) and shows the overdue count', () => {
        renderPage([credit(1)], {}, 3);

        expect(screen.getByRole('button', { name: 'Activos' }).className).toContain('bg-primary');
        expect(within(screen.getByRole('button', { name: /Vencidos/ })).getByText('3')).toBeInTheDocument();
    });

    it('switches tab through a replace navigation that clears the search', () => {
        renderPage([credit(1)], { search: 'ana' });

        fireEvent.click(screen.getByRole('button', { name: /Vencidos/ }));

        expect(router.get).toHaveBeenCalledWith('/credits', { search: undefined, tab: 'overdue' }, { preserveState: true, replace: true });
    });

    it('searches when Enter is pressed and keeps the other filters', () => {
        renderPage([credit(1)], { tab: 'all' });

        const box = screen.getByPlaceholderText('Buscar por código o cliente...');
        fireEvent.change(box, { target: { value: 'maria' } });
        fireEvent.keyDown(box, { key: 'Enter' });

        expect(router.get).toHaveBeenCalledWith('/credits', { tab: 'all', search: 'maria' }, { preserveState: true, replace: true });
    });

    it('filters by type and clears the type with "all"', () => {
        renderPage([credit(1)]);

        fireEvent.change(screen.getByLabelText('Modalidad'), { target: { value: 'layaway' } });
        expect(router.get).toHaveBeenLastCalledWith('/credits', { type: 'layaway' }, expect.any(Object));

        fireEvent.change(screen.getByLabelText('Modalidad'), { target: { value: 'all' } });
        expect(router.get).toHaveBeenLastCalledWith('/credits', { type: undefined }, expect.any(Object));
    });

    it('says what is missing when the tab has no credits', () => {
        renderPage([], { tab: 'overdue' });

        expect(screen.getByText('No hay créditos vencidos')).toBeInTheDocument();
    });

    it('links to the new credit form', () => {
        renderPage([credit(1)]);

        expect(screen.getByRole('link', { name: /Nuevo crédito/ })).toHaveAttribute('href', '/credits/create');
    });
});
