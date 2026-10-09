import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { RecentSales } from '../recent-sales';

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

beforeAll(() => {
    vi.stubGlobal('route', (name: string, id?: number) => `/${name}/${id}`);
    vi.stubGlobal(
        'matchMedia',
        vi
            .fn()
            .mockImplementation((query: string) => ({
                matches: false,
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                addListener: vi.fn(),
                removeListener: vi.fn(),
            })),
    );
});

const sale = {
    id: 7,
    code: 'V-7',
    total: 89000,
    date: '2026-10-08T21:13:00',
    status: 'completed',
    client: { name: 'María Gómez' },
    seller: { name: 'Carlos' },
};

describe('RecentSales', () => {
    it('links each sale to its detail with client, seller, amount and status', () => {
        render(<RecentSales sales={[sale]} />);

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/sales.show/7');
        expect(link).toHaveTextContent('María Gómez');
        expect(link).toHaveTextContent('Carlos');
        expect(link).toHaveTextContent('Completada');
    });

    it('falls back to the generic customer and keeps unknown statuses readable', () => {
        render(<RecentSales sales={[{ ...sale, client: undefined, status: 'archivada' }]} />);

        expect(screen.getByText('Consumidor Final')).toBeInTheDocument();
        expect(screen.getByText('archivada')).toBeInTheDocument();
    });

    it('shows an empty state', () => {
        render(<RecentSales sales={[]} />);
        expect(screen.getByText('No hay ventas recientes')).toBeInTheDocument();
    });
});
