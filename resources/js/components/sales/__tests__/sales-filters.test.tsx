import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { SalesFilters, toDateParam, type DateSpan } from '../sales-filters';

vi.mock('@inertiajs/react', () => ({ usePage: () => ({ props: { business: { brand_color: '#C4686F' } } }) }));

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
});

function setup(overrides: Partial<{ search: string; status: string; range: DateSpan }> = {}) {
    const handlers = {
        onSearchChange: vi.fn(),
        onSearchSubmit: vi.fn(),
        onStatusChange: vi.fn(),
        onRangeChange: vi.fn(),
        onClear: vi.fn(),
    };
    render(<SalesFilters search={overrides.search ?? ''} status={overrides.status ?? 'all'} range={overrides.range ?? {}} {...handlers} />);
    return handlers;
}

describe('toDateParam', () => {
    it('formats the local calendar day without a time zone shift', () => {
        expect(toDateParam(new Date(2026, 9, 8, 23, 59))).toBe('2026-10-08');
        expect(toDateParam(undefined)).toBe('');
    });
});

describe('SalesFilters', () => {
    it('marks the current status and reports a new one', () => {
        const { onStatusChange } = setup({ status: 'pending' });

        expect(screen.getByRole('button', { name: 'Pendientes' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'false');

        fireEvent.click(screen.getByRole('button', { name: 'Canceladas' }));
        expect(onStatusChange).toHaveBeenCalledWith('cancelled');
    });

    it('searches on submit and clears the box with the inline button', () => {
        const { onSearchSubmit, onSearchChange } = setup({ search: 'maria' });

        fireEvent.submit(screen.getByRole('search'));
        expect(onSearchSubmit).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: 'Borrar búsqueda' }));
        expect(onSearchChange).toHaveBeenCalledWith('');
    });

    it('applies a quick date preset for today', () => {
        const { onRangeChange } = setup();

        fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));

        const span = onRangeChange.mock.calls[0][0] as Required<DateSpan>;
        expect(toDateParam(span.startDate)).toBe(toDateParam(new Date()));
        expect(toDateParam(span.endDate)).toBe(toDateParam(new Date()));
    });

    it('toggles the active preset off when it is pressed again', () => {
        const today = new Date();
        const { onRangeChange } = setup({ range: { startDate: today, endDate: today } });

        expect(screen.getByRole('button', { name: 'Hoy' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));

        expect(onRangeChange).toHaveBeenCalledWith({});
    });

    it('only offers to clear when something is filtered', () => {
        const idle = setup();
        expect(screen.queryByRole('button', { name: 'Limpiar' })).not.toBeInTheDocument();
        expect(idle.onClear).not.toHaveBeenCalled();
    });

    it('clears everything from the filtered state', () => {
        const { onClear } = setup({ status: 'completed' });

        fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
        expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('opens the custom range dialog and applies the chosen span', () => {
        const { onRangeChange } = setup();

        fireEvent.click(screen.getByRole('button', { name: 'Personalizado' }));
        expect(screen.getByRole('dialog', { name: 'Rango de fechas' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
        expect(onRangeChange).toHaveBeenCalledTimes(1);
    });
});
