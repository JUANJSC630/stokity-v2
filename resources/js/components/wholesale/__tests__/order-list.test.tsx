import { router } from '@inertiajs/react';
import { render, screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderCards, OrderTable } from '../order-list';
import { OrderMarker, OrderStatusPill } from '../wholesale-meta';

vi.mock('@inertiajs/react', () => ({
    router: { visit: vi.fn() },
    Link: 'a',
}));

const order = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    code: `M-${200 + id}`,
    total: 150000,
    status: 'completed',
    payment_method: 'transferencia',
    date: '2026-10-05T10:00:00Z',
    client: { name: `Cliente ${id}` },
    seller: { name: 'Carlos' },
    items: [],
    ...overrides,
});

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
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

beforeEach(() => vi.clearAllMocks());

describe('wholesale meta', () => {
    it('labels each status and falls back to completed for an unknown one', () => {
        const { rerender } = render(<OrderStatusPill status="completed" />);
        expect(screen.getByText('Completado')).toBeInTheDocument();
        rerender(<OrderStatusPill status="cancelled" />);
        expect(screen.getByText('Cancelado')).toBeInTheDocument();
        rerender(<OrderStatusPill status="raro" />);
        expect(screen.getByText('Completado')).toBeInTheDocument();
    });

    it('hides the marker from assistive technology', () => {
        const { container } = render(<OrderMarker status="cancelled" />);

        expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    });
});

describe('OrderCards', () => {
    it('lists each order as a link with its data', () => {
        render(<OrderCards orders={[order(1), order(2, { status: 'cancelled', client: null })] as never} canUpdate />);

        expect(screen.getByRole('list', { name: '2 pedido(s) mayorista(s)' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /M-201/ })).toHaveAttribute('href', '/wholesale/1');
        expect(screen.getByRole('link', { name: /M-202/ })).toHaveTextContent('Sin cliente');
    });
});

describe('OrderTable', () => {
    it('shows every column and links to the order', () => {
        render(<OrderTable orders={[order(1)] as never} canUpdate />);

        expect(screen.getByRole('table', { name: 'Pedidos mayoristas' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Ver pedido M-201' })).toHaveAttribute('href', '/wholesale/1');
        expect(screen.getByText('Completado')).toBeInTheDocument();
    });

    it('offers edit only for completed orders and only with permission', () => {
        const { unmount } = render(<OrderTable orders={[order(1), order(2, { status: 'cancelled' })] as never} canUpdate />);
        expect(screen.getByRole('link', { name: 'Editar pedido M-201' })).toHaveAttribute('href', '/wholesale/1/edit');
        expect(screen.queryByRole('link', { name: 'Editar pedido M-202' })).not.toBeInTheDocument();
        unmount();

        render(<OrderTable orders={[order(1)] as never} canUpdate={false} />);
        expect(screen.queryByRole('link', { name: /Editar pedido/ })).not.toBeInTheDocument();
    });

    it('opens the order when its row is clicked', () => {
        render(<OrderTable orders={[order(3)] as never} canUpdate={false} />);

        screen.getByText('M-203').closest('tr')?.click();

        expect(router.visit).toHaveBeenCalledWith('/wholesale/3');
    });
});
