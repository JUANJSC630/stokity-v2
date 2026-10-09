/** Characterization tests for the wholesale order detail: its facts, its items and the cancel / delete actions. */
import { router } from '@inertiajs/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import WholesaleShow from '../show';

vi.mock('@inertiajs/react', () => ({
    router: { post: vi.fn(), delete: vi.fn(), visit: vi.fn() },
    Head: () => null,
    Link: 'a',
    usePage: vi.fn(() => ({ props: {} })),
}));
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const baseOrder = {
    id: 9,
    code: 'M-209',
    total: 210000,
    estimated_cost: 90000,
    status: 'completed',
    payment_method: 'transferencia',
    date: '2026-10-05T10:00:00Z',
    notes: 'Entrega en 8 días',
    client: { name: 'Distribuidora El Dorado' },
    seller: { name: 'Carlos' },
    branch: { name: 'Centro' },
    items: [
        { id: 1, description: 'Manillas negras', quantity: 10, unit_price: 12000, subtotal: 120000 },
        { id: 2, description: 'Pepas verdes a pedido', quantity: 30, unit_price: 3000, subtotal: 90000 },
    ],
};

function renderShow(order: Record<string, unknown> = {}, flags: { canUpdate?: boolean; canDelete?: boolean; deleted?: boolean } = {}) {
    return render(
        <WholesaleShow
            wholesaleSale={{ ...baseOrder, ...order } as never}
            canUpdate={flags.canUpdate ?? true}
            canDelete={flags.canDelete ?? true}
            deleted={flags.deleted}
        />,
    );
}

const text = (node: HTMLElement) => (node.textContent ?? '').replace(/\s/g, ' ');

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
});

beforeEach(() => vi.clearAllMocks());

describe('Wholesale order detail', () => {
    it('shows the code, the status, the client and the facts of the order', () => {
        renderShow();

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('M-209');
        expect(screen.getByText('Completado')).toBeInTheDocument();
        expect(screen.getByText('Distribuidora El Dorado')).toBeInTheDocument();
        expect(screen.getByText('Carlos')).toBeInTheDocument();
        expect(screen.getByText('Centro')).toBeInTheDocument();
        expect(screen.getByText('5 oct 2026')).toBeInTheDocument();
        expect(screen.getByText('transferencia')).toBeInTheDocument();
    });

    it('lists every item with its quantity, unit price and subtotal, and the order total', () => {
        renderShow();

        const table = screen.getByRole('table');
        expect(text(table)).toContain('Manillas negras');
        expect(text(table)).toContain('10');
        expect(text(table)).toContain('$ 12.000');
        expect(text(table)).toContain('$ 120.000');
        expect(text(screen.getByText('Total').parentElement as HTMLElement)).toContain('$ 210.000');
    });

    it('shows the internal material cost only when there is one, and the notes', () => {
        const { unmount } = renderShow();
        expect(text(screen.getByText(/Costo de materiales \(interno\)/))).toContain('$ 90.000');
        expect(screen.getByText('Entrega en 8 días')).toBeInTheDocument();
        unmount();

        renderShow({ estimated_cost: null, notes: null });
        expect(screen.queryByText(/Costo de materiales/)).not.toBeInTheDocument();
        expect(screen.queryByText('Notas')).not.toBeInTheDocument();
    });

    it('says "Sin cliente" when the order has none', () => {
        renderShow({ client: null });

        expect(screen.getByText('Sin cliente')).toBeInTheDocument();
    });
});

describe('Wholesale order detail: actions', () => {
    it('offers edit and cancel on a completed order, each only with its permission', () => {
        const { unmount } = renderShow();
        expect(screen.getByRole('link', { name: /Editar/ })).toHaveAttribute('href', '/wholesale/9/edit');
        expect(screen.getByRole('button', { name: /Cancelar pedido/ })).toBeInTheDocument();
        unmount();

        renderShow({}, { canUpdate: false, canDelete: false });
        expect(screen.queryByRole('link', { name: /Editar/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Cancelar pedido/ })).not.toBeInTheDocument();
    });

    it('offers only delete on a cancelled order', () => {
        renderShow({ status: 'cancelled' });

        expect(screen.getByText('Cancelado')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Editar/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Cancelar pedido/ })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Eliminar/ })).toBeInTheDocument();
    });

    it('explains that cancelling removes the order from the income of Finanzas and posts only on confirm', () => {
        renderShow();
        fireEvent.click(screen.getByRole('button', { name: /Cancelar pedido/ }));

        const dialog = screen.getByRole('dialog', { name: /Cancelar pedido mayorista/ });
        expect(text(dialog)).toContain('dejará de contar en los ingresos de Finanzas');
        expect(router.post).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Sí, cancelar pedido' }));

        expect(router.post).toHaveBeenCalledWith('/wholesale/9/cancel', {}, expect.any(Object));
    });

    it('closes the cancel dialog with "No, volver" without sending anything', () => {
        renderShow();
        fireEvent.click(screen.getByRole('button', { name: /Cancelar pedido/ }));

        fireEvent.click(screen.getByRole('button', { name: 'No, volver' }));

        expect(router.post).not.toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('deletes a cancelled order only after confirming', () => {
        renderShow({ status: 'cancelled' });
        fireEvent.click(screen.getByRole('button', { name: /Eliminar/ }));

        const dialog = screen.getByRole('dialog', { name: /Eliminar pedido mayorista/ });
        expect(text(dialog)).toContain('Pedidos eliminados');
        expect(router.delete).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Sí, eliminar pedido' }));

        expect(router.delete).toHaveBeenCalledWith('/wholesale/9', expect.any(Object));
    });

    it('reports a server error as a notification and lets the user try again', () => {
        renderShow();
        fireEvent.click(screen.getByRole('button', { name: /Cancelar pedido/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar pedido' }));

        const options = vi.mocked(router.post).mock.calls[0][2] as { onError: (errors: Record<string, string>) => void };
        options.onError({ cancel: 'No se pudo cancelar.' });

        expect(toast.error).toHaveBeenCalledWith('No se pudo cancelar.');
    });
});

describe('Wholesale order detail: deleted order', () => {
    it('is read-only and says when it was deleted', () => {
        renderShow({ deleted_at: '2026-10-08T15:00:00Z' }, { deleted: true });

        expect(screen.getByText(/Este pedido fue eliminado el 8 oct 2026/)).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Editar/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Cancelar pedido/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument();
    });
});
