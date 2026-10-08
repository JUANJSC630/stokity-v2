import { router } from '@inertiajs/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TenantsArchived from '../archived';

vi.mock('@inertiajs/react', () => ({
    router: { post: vi.fn(), visit: vi.fn() },
    Head: () => null,
    Link: 'a',
    usePage: vi.fn(() => ({ props: {} })),
}));

vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

const tenants = [
    { id: 4, name: 'Moda Express', slug: 'moda-express', deleted_at: '2026-10-08' },
    { id: 9, name: 'Ferretería El Tornillo', slug: 'ferreteria-el-tornillo', deleted_at: null },
];

beforeEach(() => {
    vi.clearAllMocks();
});

describe('Archived tenants', () => {
    it('lists the archived businesses with the day they were archived', () => {
        render(<TenantsArchived tenants={tenants} />);

        const list = screen.getByRole('list', { name: '2 negocio(s) archivado(s)' });
        expect(within(list).getByText('Moda Express')).toBeInTheDocument();
        expect(within(list).getByText(/Archivado el 8 de oct/)).toBeInTheDocument();
        expect(within(list).getByText(/Archivado el —/)).toBeInTheDocument();
    });

    it('shows a helpful empty state when nothing is archived', () => {
        render(<TenantsArchived tenants={[]} />);

        expect(screen.getByText('No hay negocios archivados.')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('asks for confirmation before restoring and lets the user cancel', () => {
        render(<TenantsArchived tenants={tenants} />);

        fireEvent.click(screen.getAllByRole('button', { name: 'Restaurar Moda Express' })[0]);
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveTextContent('«Moda Express»');
        expect(router.post).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(router.post).not.toHaveBeenCalled();
    });

    it('restores the chosen business once confirmed', () => {
        render(<TenantsArchived tenants={tenants} />);

        fireEvent.click(screen.getAllByRole('button', { name: 'Restaurar Ferretería El Tornillo' })[0]);
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restaurar' }));

        expect(router.post).toHaveBeenCalledWith('/admin/tenants/9/restore', {}, expect.objectContaining({ preserveScroll: true }));
    });
});
