import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RevenueHero, type DailySale } from '../revenue-hero';

const week: DailySale[] = [
    { date: '2026-10-02', total_sales: 9, total_amount: 412000 },
    { date: '2026-10-03', total_sales: 13, total_amount: 598000 },
    { date: '2026-10-04', total_sales: 8, total_amount: 351000 },
    { date: '2026-10-05', total_sales: 16, total_amount: 745000 },
    { date: '2026-10-06', total_sales: 1, total_amount: 689000 },
    { date: '2026-10-07', total_sales: 19, total_amount: 902000 },
    { date: '2026-10-08', total_sales: 24, total_amount: 1184500 },
];

const props = { revenueToday: 1184500, revenueGrowth: 31, salesToday: 24, averageSale: 49354, dailySales: week };

beforeAll(() => {
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
});

const hero = () => screen.getByRole('region', { name: 'Ingresos' });

describe('RevenueHero', () => {
    it("shows today's revenue, the trend against yesterday and the day's figures", () => {
        render(<RevenueHero {...props} onRefresh={vi.fn()} />);

        expect(within(hero()).getByText('Ingresos hoy')).toBeInTheDocument();
        expect(within(hero()).getByText('$ 1.184.500', { selector: '.sr-only' })).toBeInTheDocument();
        expect(within(hero()).getByText('+31%')).toBeInTheDocument();
        expect(within(hero()).getByText('frente a ayer')).toBeInTheDocument();
        expect(within(hero()).getByText('Ventas hoy')).toBeInTheDocument();
        expect(within(hero()).getByText('24', { selector: '.sr-only' })).toBeInTheDocument();
        expect(within(hero()).getByText('$ 49.354', { selector: '.sr-only' })).toBeInTheDocument();
    });

    it('shows a falling and a flat trend differently', () => {
        const { rerender } = render(<RevenueHero {...props} revenueGrowth={-12} onRefresh={vi.fn()} />);
        expect(within(hero()).getByText('-12%')).toBeInTheDocument();

        rerender(<RevenueHero {...props} revenueGrowth={0} onRefresh={vi.fn()} />);
        expect(within(hero()).getByText('0%')).toBeInTheDocument();
    });

    it('labels the chart with the initial of each weekday', () => {
        render(<RevenueHero {...props} onRefresh={vi.fn()} />);

        const letters = Array.from(hero().querySelectorAll('[aria-hidden="true"].flex span')).map((el) => el.textContent);
        expect(letters).toEqual(['V', 'S', 'D', 'L', 'M', 'M', 'J']);
    });

    it('describes each day for keyboard and screen reader users', () => {
        render(<RevenueHero {...props} onRefresh={vi.fn()} />);

        const slider = screen.getByRole('slider', { name: 'Ingresos de los últimos 7 días' });
        expect(slider.getAttribute('aria-valuetext')?.replace(/\s/g, ' ')).toBe('Jueves 8 de octubre: $ 1.184.500, 24 ventas');
    });

    it('swaps the headline for the scrubbed day and restores it afterwards', () => {
        render(<RevenueHero {...props} onRefresh={vi.fn()} />);
        const slider = screen.getByRole('slider', { name: 'Ingresos de los últimos 7 días' });

        fireEvent.keyDown(slider, { key: 'ArrowLeft' });
        fireEvent.keyDown(slider, { key: 'ArrowLeft' });

        expect(within(hero()).getByText('Martes 6 de oct')).toBeInTheDocument();
        expect(within(hero()).getByText('$ 689.000')).toBeInTheDocument();
        expect(within(hero()).getByText('1 venta')).toBeInTheDocument();
        expect(within(hero()).queryByText('frente a ayer')).not.toBeInTheDocument();

        fireEvent.keyDown(slider, { key: 'Escape' });

        expect(within(hero()).getByText('Ingresos hoy')).toBeInTheDocument();
        expect(within(hero()).getByText('frente a ayer')).toBeInTheDocument();
    });

    it('refreshes from the visible button', async () => {
        const onRefresh = vi.fn().mockResolvedValue(undefined);
        render(<RevenueHero {...props} onRefresh={onRefresh} />);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Actualizar datos' }));
        });

        expect(onRefresh).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: 'Actualizar datos' })).toBeDisabled();
    });

    it('omits the chart when there is not enough history', () => {
        render(<RevenueHero {...props} dailySales={[week[6]]} onRefresh={vi.fn()} />);

        expect(screen.queryByRole('slider')).not.toBeInTheDocument();
        expect(within(hero()).getByText('Ventas hoy')).toBeInTheDocument();
    });
});
