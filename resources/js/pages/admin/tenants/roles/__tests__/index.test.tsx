import { router } from '@inertiajs/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminTenantRolesIndex from '../index';

vi.mock('@inertiajs/react', () => ({
    router: { delete: vi.fn(), visit: vi.fn() },
    Head: () => null,
    Link: 'a',
    usePage: vi.fn(() => ({ props: {} })),
}));

vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

const tenant = { id: 7, name: 'Lu Accesorios' };

const roles = [
    {
        id: 1,
        name: 'Administrador',
        description: 'Acceso total',
        data_scope: 'all' as const,
        is_system: true,
        is_default: false,
        permissions_count: 40,
        users_count: 1,
    },
    {
        id: 2,
        name: 'Cajero nocturno',
        description: null,
        data_scope: 'branch' as const,
        is_system: false,
        is_default: false,
        permissions_count: 6,
        users_count: 0,
    },
    {
        id: 3,
        name: 'Contador',
        description: 'Solo reportes',
        data_scope: 'own' as const,
        is_system: false,
        is_default: false,
        permissions_count: 9,
        users_count: 2,
    },
];

beforeEach(() => {
    vi.clearAllMocks();
});

describe('Tenant roles list', () => {
    it('shows each role with its scope, permissions and users', () => {
        render(<AdminTenantRolesIndex tenant={tenant} roles={roles} />);

        const list = screen.getByRole('list', { name: '3 rol(es)' });
        expect(within(list).getByText('Administrador')).toBeInTheDocument();
        expect(within(list).getAllByText('del sistema')).toHaveLength(1);
        expect(within(list).getByText('Todas las sucursales')).toBeInTheDocument();
        expect(within(list).getByText('6 permisos')).toBeInTheDocument();
        expect(within(list).getByText('2 usuario(s)')).toBeInTheDocument();
    });

    it('links to creating a role and to editing each one', () => {
        render(<AdminTenantRolesIndex tenant={tenant} roles={roles} />);

        expect(screen.getByRole('link', { name: 'Nuevo rol' })).toHaveAttribute('href', '/admin/tenants/7/roles/create');
        expect(screen.getAllByRole('link', { name: 'Editar rol Contador' })[0]).toHaveAttribute('href', '/admin/tenants/7/roles/3/edit');
    });

    it('never offers to delete a system role', () => {
        render(<AdminTenantRolesIndex tenant={tenant} roles={roles} />);

        expect(screen.queryByRole('button', { name: 'Eliminar rol Administrador' })).not.toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: 'Eliminar rol Cajero nocturno' }).length).toBeGreaterThan(0);
    });

    it('asks before deleting and then deletes the chosen role', () => {
        render(<AdminTenantRolesIndex tenant={tenant} roles={roles} />);

        fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar rol Cajero nocturno' })[0]);
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveTextContent('«Cajero nocturno»');
        expect(router.delete).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

        expect(router.delete).toHaveBeenCalledWith('/admin/tenants/7/roles/2', expect.any(Object));
    });

    it('blocks deleting a role that still has users and says why', () => {
        render(<AdminTenantRolesIndex tenant={tenant} roles={roles} />);

        fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar rol Contador' })[0]);
        const dialog = screen.getByRole('dialog');

        expect(dialog).toHaveTextContent('Tiene 2 usuario(s) asignado(s)');
        expect(within(dialog).getByRole('button', { name: 'Eliminar' })).toBeDisabled();
    });

    it('shows the server reason when the delete is rejected', () => {
        render(<AdminTenantRolesIndex tenant={tenant} roles={roles} />);
        vi.mocked(router.delete).mockImplementation(((_url: string, options: { onError?: (errors: Record<string, string>) => void }) =>
            options.onError?.({ role: 'Es el rol por defecto.' })) as never);

        fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar rol Cajero nocturno' })[0]);
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));

        expect(toast.error).toHaveBeenCalledWith('Es el rol por defecto.');
    });

    it('shows an empty state without roles', () => {
        render(<AdminTenantRolesIndex tenant={tenant} roles={[]} />);

        expect(screen.getByText('Sin roles todavía.')).toBeInTheDocument();
    });
});
