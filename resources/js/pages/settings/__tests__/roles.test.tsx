/** Characterization tests for the roles list, create and edit pages: pin today's behavior before the redesign. */
import { router } from '@inertiajs/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import CreateRole from '../roles/create';
import EditRole from '../roles/edit';
import RolesIndex from '../roles/index';

const env = vi.hoisted(() => ({
    post: vi.fn(),
    transform: vi.fn(),
    errors: {} as Record<string, string>,
    processing: false,
    wide: true,
}));

vi.mock('@inertiajs/react', async () => {
    const React = await import('react');
    return {
        router: { get: vi.fn(), visit: vi.fn(), delete: vi.fn() },
        Head: () => null,
        Link: 'a',
        usePage: () => ({ props: { auth: { user: { id: 1 }, permissions: [] }, business: { brand_color: '#C4686F' } } }),
        useForm: (initial: Record<string, unknown>) => {
            const [data, setAll] = React.useState(initial);
            const snapshot = React.useRef(data);
            const transformer = React.useRef<((d: Record<string, unknown>) => Record<string, unknown>) | null>(null);
            snapshot.current = data;
            return {
                data,
                errors: env.errors,
                processing: env.processing,
                setData: (key: string, value: unknown) => setAll((previous) => ({ ...previous, [key]: value })),
                transform: (fn: (d: Record<string, unknown>) => Record<string, unknown>) => {
                    env.transform();
                    transformer.current = fn;
                },
                post: (url: string) => env.post(url, transformer.current ? transformer.current(snapshot.current) : snapshot.current),
            };
        },
    };
});
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/layouts/settings/layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

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
            matches: env.wide,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
        })),
    );
    vi.stubGlobal('route', (name: string, id?: number) => `/${name}${id ? `/${id}` : ''}`);
});

beforeEach(() => {
    vi.clearAllMocks();
    env.errors = {};
    env.processing = false;
    env.wide = true;
});

const role = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    name: `Rol ${id}`,
    description: null,
    data_scope: 'branch',
    is_system: false,
    is_default: false,
    permissions_count: 3,
    users_count: 0,
    ...overrides,
});

const catalog = {
    sales: {
        'sales.view': { module: 'sales', label: 'Ver ventas' },
        'sales.delete': { module: 'sales', label: 'Eliminar ventas', requires: ['sales.view'] },
    },
    reports: { 'reports.view': { module: 'reports', label: 'Ver reportes' } },
};

describe('Roles list', () => {
    const roles = [
        role(1, { name: 'Administrador', is_system: true, data_scope: 'all', description: 'Acceso total', permissions_count: 40, users_count: 2 }),
        role(2, { name: 'Cajero', data_scope: 'own', users_count: 3, description: 'Cobra en el POS' }),
        role(3, { name: 'Supervisor', data_scope: 'branch' }),
    ];

    it('lists each role with its scope, permission count and users', () => {
        render(<RolesIndex roles={roles as never} />);

        const rows = screen.getAllByRole('row').slice(1);
        expect(within(rows[0]).getByText('Administrador')).toBeInTheDocument();
        expect(within(rows[0]).getByText('del sistema')).toBeInTheDocument();
        expect(within(rows[0]).getByText('Todas las sucursales')).toBeInTheDocument();
        expect(within(rows[0]).getByText('40')).toBeInTheDocument();
        expect(within(rows[1]).getByText('Solo lo suyo')).toBeInTheDocument();
        expect(within(rows[1]).getByText('Cobra en el POS')).toBeInTheDocument();
        expect(within(rows[2]).getByText('Su sucursal')).toBeInTheDocument();
        expect(within(rows[2]).queryByText('del sistema')).not.toBeInTheDocument();
    });

    it('lists the roles as cards on a phone, with the same actions', () => {
        env.wide = false;
        render(<RolesIndex roles={roles as never} />);

        expect(screen.queryByRole('table')).not.toBeInTheDocument();
        expect(screen.getByText(/Todas las sucursales · 40 permisos/)).toBeInTheDocument();
        expect(screen.getAllByLabelText('Editar').length).toBe(3);
        expect(screen.getAllByLabelText('Eliminar').length).toBe(2);
    });

    it('links to the create page and to each role', () => {
        render(<RolesIndex roles={roles as never} />);

        expect(screen.getByText('Nuevo rol').closest('a')).toHaveAttribute('href', '/settings.roles.create');
        expect(screen.getAllByLabelText('Editar')[1].closest('a')).toHaveAttribute('href', '/settings.roles.edit/2');
    });

    it('never offers to delete a system role', () => {
        render(<RolesIndex roles={roles as never} />);

        expect(screen.getAllByLabelText('Editar').length).toBe(3);
        expect(screen.getAllByLabelText('Eliminar').length).toBe(2);
    });

    it('deletes a role without users after confirming', () => {
        render(<RolesIndex roles={roles as never} />);

        fireEvent.click(screen.getAllByLabelText('Eliminar')[1]);
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByText('Supervisor')).toBeInTheDocument();
        expect(router.delete).not.toHaveBeenCalled();
        fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

        expect(router.delete).toHaveBeenCalledWith('/settings.roles.destroy/3', expect.any(Object));
    });

    it('blocks deleting a role that still has users and says how many', () => {
        render(<RolesIndex roles={roles as never} />);

        fireEvent.click(screen.getAllByLabelText('Eliminar')[0]);
        const dialog = screen.getByRole('dialog');

        expect(within(dialog).getByText(/Tiene 3 usuario\(s\) asignado\(s\)/)).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Eliminar' })).toBeDisabled();
    });

    it('closes the dialog on success and reports a failure', () => {
        vi.mocked(router.delete).mockImplementation(((
            _url: string,
            options: { onSuccess?: () => void; onError?: (e: Record<string, string>) => void },
        ) => {
            options.onError?.({ role: 'El rol está en uso.' });
        }) as never);
        render(<RolesIndex roles={roles as never} />);

        fireEvent.click(screen.getAllByLabelText('Eliminar')[1]);
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));

        expect(toast.error).toHaveBeenCalledWith('El rol está en uso.');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('falls back to a generic message when the failure has none', () => {
        vi.mocked(router.delete).mockImplementation(((_url: string, options: { onError?: (e: Record<string, string>) => void }) => {
            options.onError?.({});
        }) as never);
        render(<RolesIndex roles={roles as never} />);

        fireEvent.click(screen.getAllByLabelText('Eliminar')[1]);
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));

        expect(toast.error).toHaveBeenCalledWith('No se pudo eliminar el rol.');
    });

    it('cancels without deleting', () => {
        render(<RolesIndex roles={roles as never} />);

        fireEvent.click(screen.getAllByLabelText('Eliminar')[1]);
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

        expect(router.delete).not.toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});

describe('Create role', () => {
    it('starts empty with the branch scope', () => {
        render(<CreateRole permissionsByModule={catalog} />);

        expect(screen.getByLabelText('Nombre')).toHaveValue('');
        expect(screen.getByLabelText('Alcance de datos')).toHaveValue('branch');
        expect(screen.getByLabelText('Descripción (opcional)')).toHaveValue('');
        expect(screen.getByText('Ventas')).toBeInTheDocument();
    });

    it('posts the name, scope and the checked permissions with their dependencies', () => {
        render(<CreateRole permissionsByModule={catalog} />);

        fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Contador' } });
        fireEvent.change(screen.getByLabelText('Alcance de datos'), { target: { value: 'all' } });
        fireEvent.change(screen.getByLabelText('Descripción (opcional)'), { target: { value: 'Revisa cifras' } });
        fireEvent.click(screen.getByRole('checkbox', { name: 'Eliminar ventas' }));
        fireEvent.click(screen.getByRole('button', { name: /Crear rol/ }));

        expect(env.post).toHaveBeenCalledWith('/settings.roles.store', {
            name: 'Contador',
            description: 'Revisa cifras',
            data_scope: 'all',
            permissions: ['sales.delete', 'sales.view'],
        });
    });

    it('shows the server errors and the saving label', () => {
        env.errors = { name: 'Nombre en uso', data_scope: 'Alcance inválido', description: 'Muy larga', permissions: 'Elige al menos uno' };
        env.processing = true;
        render(<CreateRole permissionsByModule={catalog} />);

        for (const message of ['Nombre en uso', 'Alcance inválido', 'Muy larga', 'Elige al menos uno']) {
            expect(screen.getByText(message)).toBeInTheDocument();
        }
        expect(screen.getByRole('button', { name: /Creando/ })).toBeDisabled();
        expect(screen.getByLabelText('Nombre')).toBeDisabled();
    });

    it('goes back to the list', () => {
        render(<CreateRole permissionsByModule={catalog} />);

        expect(screen.getByText('Volver').closest('a')).toHaveAttribute('href', '/settings.roles.index');
    });
});

describe('Edit role', () => {
    const data = (overrides: Record<string, unknown> = {}) => ({
        id: 9,
        name: 'Cajero',
        description: 'Cobra',
        data_scope: 'branch',
        is_system: false,
        permissions: ['sales.view'],
        ...overrides,
    });

    it('loads the role with its permissions checked', () => {
        render(<EditRole role={data() as never} permissionsByModule={catalog} />);

        expect(screen.getByLabelText('Nombre')).toHaveValue('Cajero');
        expect(screen.getByLabelText('Descripción (opcional)')).toHaveValue('Cobra');
        expect(screen.getByRole('checkbox', { name: 'Ver ventas' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Eliminar ventas' })).not.toBeChecked();
    });

    it('posts the changes with the PUT override to the update route', () => {
        render(<EditRole role={data() as never} permissionsByModule={catalog} />);

        fireEvent.click(screen.getByRole('checkbox', { name: 'Ver reportes' }));
        fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/ }));

        expect(env.post).toHaveBeenCalledWith(
            '/settings.roles.update/9',
            expect.objectContaining({ name: 'Cajero', _method: 'PUT', permissions: expect.arrayContaining(['sales.view', 'reports.view']) }),
        );
    });

    it('turns the "own" scope into "branch" when it is saved (a finding)', () => {
        render(<EditRole role={data({ data_scope: 'own' }) as never} permissionsByModule={catalog} />);

        expect(screen.getByLabelText('Alcance de datos')).toHaveValue('branch');
        fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/ }));

        expect(env.post.mock.calls[0][1]).toMatchObject({ data_scope: 'branch' });
    });

    it('keeps "all" as it is', () => {
        render(<EditRole role={data({ data_scope: 'all' }) as never} permissionsByModule={catalog} />);

        expect(screen.getByLabelText('Alcance de datos')).toHaveValue('all');
    });

    it('does not let a system role be renamed and tags it', () => {
        render(<EditRole role={data({ is_system: true }) as never} permissionsByModule={catalog} />);

        expect(screen.getByLabelText('Nombre')).toBeDisabled();
        expect(screen.getByText('El nombre de un rol del sistema no se puede cambiar.')).toBeInTheDocument();
        expect(screen.getByText('del sistema')).toBeInTheDocument();
    });

    it('shows the saving label', () => {
        env.processing = true;
        render(<EditRole role={data() as never} permissionsByModule={catalog} />);

        expect(screen.getByRole('button', { name: /Guardando/ })).toBeDisabled();
    });
});
