import { router } from '@inertiajs/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PaginationFooter, { type PaginationData } from '../common/PaginationFooter';

const page = (current: number, last: number): PaginationData => ({
    data: [{}],
    current_page: current,
    last_page: last,
    from: (current - 1) * 25 + 1,
    to: current * 25,
    total: last * 25,
    links: [
        { label: '&laquo; Anterior', url: current > 1 ? `/items?page=${current - 1}` : null },
        ...Array.from({ length: last }, (_, i) => ({ label: String(i + 1), url: `/items?page=${i + 1}` })),
        { label: 'Siguiente &raquo;', url: current < last ? `/items?page=${current + 1}` : null },
    ],
    resourceLabel: 'ventas',
});

beforeEach(() => {
    vi.clearAllMocks();
});

describe('PaginationFooter', () => {
    it('renders nothing without rows', () => {
        const { container } = render(<PaginationFooter data={{ ...page(1, 1), data: [] }} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('describes the visible range', () => {
        render(<PaginationFooter data={page(2, 4)} />);

        expect(screen.getByText('Mostrando 26 a 50 de 100 ventas')).toBeInTheDocument();
    });

    it('offers big previous and next buttons with the page position on phones', () => {
        render(<PaginationFooter data={page(2, 7)} />);

        const nav = screen.getAllByRole('navigation', { name: 'Paginación' })[0];
        expect(within(nav).getByText('2 / 7')).toBeInTheDocument();

        fireEvent.click(within(nav).getByRole('button', { name: 'Siguiente' }));
        expect(router.visit).toHaveBeenCalledWith('/items?page=3', { preserveState: true, preserveScroll: true });

        fireEvent.click(within(nav).getByRole('button', { name: 'Anterior' }));
        expect(router.visit).toHaveBeenCalledWith('/items?page=1', { preserveState: true, preserveScroll: true });
    });

    it('disables previous on the first page and next on the last', () => {
        const { rerender } = render(<PaginationFooter data={page(1, 3)} />);
        const phone = () => screen.getAllByRole('navigation', { name: 'Paginación' })[0];

        expect(within(phone()).getByRole('button', { name: 'Anterior' })).toBeDisabled();
        expect(within(phone()).getByRole('button', { name: 'Siguiente' })).toBeEnabled();

        rerender(<PaginationFooter data={page(3, 3)} />);

        expect(within(phone()).getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    });

    it('hides the phone controls when there is a single page', () => {
        render(<PaginationFooter data={page(1, 1)} />);

        expect(screen.getAllByRole('navigation', { name: 'Paginación' })).toHaveLength(1);
    });

    it('keeps every page number and marks the current one for tablets and up', () => {
        render(<PaginationFooter data={page(2, 4)} />);

        const desktop = screen.getAllByRole('navigation', { name: 'Paginación' }).at(-1) as HTMLElement;
        expect(within(desktop).getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page');
        expect(within(desktop).getByRole('button', { name: '4' })).toBeInTheDocument();

        fireEvent.click(within(desktop).getByRole('button', { name: '4' }));
        expect(router.visit).toHaveBeenCalledWith('/items?page=4', { preserveState: true, preserveScroll: true });
    });
});
