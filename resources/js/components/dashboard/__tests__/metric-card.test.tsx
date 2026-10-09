import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { MetricCard } from '../metric-card';

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

describe('MetricCard', () => {
    it('rolls numeric values through the formatter and keeps the full text for screen readers', () => {
        render(<MetricCard title="Clientes" value={128} format={(n) => `${n} clientes`} />);
        expect(screen.getByText('128 clientes', { selector: '.sr-only' })).toBeInTheDocument();
    });

    it('prints plain values untouched', () => {
        render(<MetricCard title="Estado" value="Al día" description="Todo en orden" />);
        expect(screen.getByText('Al día')).toBeInTheDocument();
        expect(screen.getByText('Todo en orden')).toBeInTheDocument();
    });

    it('does not roll a number that has no formatter', () => {
        render(<MetricCard title="Productos" value={312} />);
        expect(screen.getByText('312')).toBeInTheDocument();
    });

    it('shows the trend with its sign', () => {
        render(<MetricCard title="Ventas" value="24" trend={{ value: 12, isPositive: true }} />);
        expect(screen.getByText('+12%')).toBeInTheDocument();
    });
});
