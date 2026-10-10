/** Characterization tests for the users list, create, edit and detail pages: pin today's behavior before the redesign. */
import { router } from '@inertiajs/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import CreateUser from '../create';
import EditUser from '../edit';
import Users from '../index';
import ShowUser from '../show';

const env = vi.hoisted(() => ({
    post: vi.fn(),
    del: vi.fn(),
    errors: {} as Record<string, string>,
    processing: false,
    authUserId: 1,
    wide: true,
}));

vi.mock('@inertiajs/react', async () => {
    const React = await import('react');
    return {
        router: { visit: vi.fn(), get: vi.fn() },
        Head: () => null,
        Link: 'a',
        usePage: () => ({ props: { auth: { user: { id: env.authUserId } }, business: { brand_color: '#C4686F' } } }),
        useForm: (initial: Record<string, unknown>) => {
            const [data, setAll] = React.useState(initial);
            const snapshot = React.useRef(data);
            snapshot.current = data;
            return {
                data,
                errors: env.errors,
                processing: env.processing,
                setData: (key: string, value: unknown) => setAll((previous) => ({ ...previous, [key]: value })),
                post: (url: string, options?: unknown) => env.post(url, options, snapshot.current),
                delete: (url: string, options?: unknown) => env.del(url, options, snapshot.current),
            };
        },
    };
});
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/hooks/use-polling', () => ({ usePolling: vi.fn() }));
vi.mock('@/hooks/use-scroll-to-error', () => ({ useScrollToError: vi.fn() }));
vi.mock('@/lib/image-upload', () => ({ prepareImageForUpload: vi.fn(async (file: File) => file) }));
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
});

beforeEach(() => {
    vi.clearAllMocks();
    env.errors = {};
    env.processing = false;
    env.authUserId = 1;
    env.wide = true;
    window.history.replaceState({}, '', '/users');
});

const text = (node: HTMLElement) => (node.textContent ?? '').replace(/\s/g, ' ');

const user = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    name: `Usuario ${id}`,
    email: `u${id}@lu.co`,
    role: 'vendedor',
    status: true,
    branch: { id: 1, name: 'Centro' },
    branch_id: 1,
    email_verified_at: null,
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-02-01T10:00:00Z',
    ...overrides,
});

const page = (data: unknown[]) => ({
    data,
    links: [
        { label: '&laquo; Anterior', url: null },
        { label: '1', url: '/users?page=1' },
        { label: 'Siguiente &raquo;', url: null },
    ],
    current_page: 1,
    from: 1,
    to: data.length,
    total: data.length,
    last_page: 1,
});

const roles = [
    { id: 1, name: 'Administrador', is_system: true, data_scope: 'all' },
    { id: 2, name: 'Encargado', is_system: true, data_scope: 'branch' },
    { id: 3, name: 'Vendedor', is_system: true, data_scope: 'own' },
];
const branches = [
    { id: 1, name: 'Centro' },
    { id: 2, name: 'Norte' },
];

describe('Users list', () => {
    const rows = [
        user(1, { name: 'Ana Admin', role: 'administrador', branch: null }),
        user(2, { name: 'Beto Encargado', role: 'encargado' }),
        user(3, { name: 'Carla Vendedora', status: false }),
    ];

    it('lists the users with role, state and branch in the table on a wide screen', () => {
        render(<Users users={page(rows) as never} />);

        const table = screen.getByRole('table', { name: 'Usuarios' });
        expect(within(table).getByText('Ana Admin')).toBeInTheDocument();
        expect(within(table).getByText('Administrador')).toBeInTheDocument();
        expect(within(table).getByText('Encargado')).toBeInTheDocument();
        expect(within(table).getByText('Vendedor')).toBeInTheDocument();
        expect(within(table).getAllByText('Activo').length).toBe(2);
        expect(within(table).getByText('Inactivo')).toBeInTheDocument();
        expect(within(table).getAllByText('-').length).toBe(1);
    });

    it('lists them as rows on a phone, marking only the inactive ones and the missing branch', () => {
        env.wide = false;
        render(<Users users={page(rows) as never} />);

        expect(screen.queryByRole('table')).not.toBeInTheDocument();
        expect(screen.getByText('Ana Admin')).toBeInTheDocument();
        expect(screen.getByText('Sin sucursal')).toBeInTheDocument();
        expect(screen.getAllByText('Inactivo').length).toBe(1);
        expect(screen.queryByText('Activo')).not.toBeInTheDocument();
    });

    it('shows a role that it does not know as it comes', () => {
        render(<Users users={page([user(9, { role: 'contador' })]) as never} />);

        expect(screen.getAllByText('contador').length).toBeGreaterThan(0);
    });

    it('says so when there are no users', () => {
        render(<Users users={page([]) as never} />);

        expect(screen.getByText('No se encontraron usuarios')).toBeInTheDocument();
    });

    it('links to the create page and to each user', () => {
        render(<Users users={page(rows) as never} />);

        expect(screen.getByText('Nuevo Usuario').closest('a')).toHaveAttribute('href', '/users/create');
        expect(screen.getByLabelText('Ver usuario Beto Encargado')).toHaveAttribute('href', '/users/2');
        expect(screen.getByLabelText('Ver usuario Ana Admin')).toHaveAttribute('href', '/users/1');
    });

    it('searches on submit with the term and without the "all" state', () => {
        render(<Users users={page(rows) as never} />);

        const input = screen.getByPlaceholderText('Buscar por nombre, email o sucursal');
        fireEvent.change(input, { target: { value: 'ana' } });
        fireEvent.submit(input.closest('form') as HTMLFormElement);

        expect(router.visit).toHaveBeenCalledWith(
            '/users?search=ana',
            expect.objectContaining({ preserveState: true, preserveScroll: true, only: ['users'] }),
        );
    });

    it('filters by state right away with the chips, keeping the search', () => {
        render(<Users users={page(rows) as never} filters={{ search: 'ana', status: 'all' }} />);

        fireEvent.click(screen.getByRole('button', { name: 'Inactivos' }));

        expect(router.visit).toHaveBeenCalledWith('/users?search=ana&status=0', expect.objectContaining({ only: ['users'] }));
    });

    it('starts from the filters it receives', () => {
        render(<Users users={page(rows) as never} filters={{ search: 'beto', status: '1' }} />);

        expect(screen.getByPlaceholderText('Buscar por nombre, email o sucursal')).toHaveValue('beto');
        expect(screen.getByRole('button', { name: 'Activos' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('clears the filters by itself when the search box is emptied while the url still has filters', () => {
        window.history.replaceState({}, '', '/users?search=ana&status=1');
        render(<Users users={page(rows) as never} filters={{ search: 'ana', status: '1' }} />);

        fireEvent.change(screen.getByPlaceholderText('Buscar por nombre, email o sucursal'), { target: { value: '' } });

        expect(router.visit).toHaveBeenCalledWith('/users?', expect.objectContaining({ only: ['users'] }));
        expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true');
    });
});

describe('Create user', () => {
    const renderCreate = () => render(<CreateUser branches={branches} roles={roles as never} />);

    it('starts as an active seller, with the branch field visible', () => {
        renderCreate();

        expect(screen.getByLabelText('Rol')).toHaveValue('3');
        expect(screen.getByLabelText('Sucursal')).toBeInTheDocument();
        expect(screen.getByRole('switch')).toBeChecked();
        expect(screen.getByText('Activo')).toBeInTheDocument();
    });

    it('hides and clears the branch when the role sees every branch, and brings it back for the others', () => {
        renderCreate();
        fireEvent.change(screen.getByLabelText('Sucursal'), { target: { value: '2' } });

        fireEvent.change(screen.getByLabelText('Rol'), { target: { value: '1' } });
        expect(screen.queryByLabelText('Sucursal')).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Rol'), { target: { value: '2' } });
        expect(screen.getByLabelText('Sucursal')).toHaveValue('');
    });

    it('posts what was typed as form data', () => {
        renderCreate();

        fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Nuevo Usuario' } });
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nuevo@lu.co' } });
        fireEvent.change(screen.getByLabelText('Sucursal'), { target: { value: '2' } });
        fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreto123' } });
        fireEvent.change(screen.getByLabelText('Confirmar Contraseña'), { target: { value: 'secreto123' } });
        fireEvent.click(screen.getByRole('switch'));
        fireEvent.click(screen.getByRole('button', { name: /Crear Usuario/ }));

        expect(env.post).toHaveBeenCalledTimes(1);
        const [url, options, data] = env.post.mock.calls[0];
        expect(url).toBe('/users');
        expect(options).toMatchObject({ forceFormData: true });
        expect(data).toEqual({
            name: 'Nuevo Usuario',
            email: 'nuevo@lu.co',
            role_id: 3,
            branch_id: '2',
            password: 'secreto123',
            password_confirmation: 'secreto123',
            status: false,
            photo: null,
        });
    });

    it('previews the chosen photo and sends it', async () => {
        renderCreate();
        const file = new File(['x'], 'foto.png', { type: 'image/png' });

        fireEvent.change(screen.getByLabelText('Subir foto'), { target: { files: [file] } });

        await waitFor(() => expect(screen.getByAltText('Preview')).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: /Crear Usuario/ }));
        expect(env.post.mock.calls[0][2].photo).toBe(file);
    });

    it('shows the server errors and locks the form while saving', () => {
        env.errors = { name: 'Nombre requerido', email: 'Email en uso', password: 'Contraseña corta', role_id: 'Rol inválido' };
        env.processing = true;
        renderCreate();

        for (const message of ['Nombre requerido', 'Email en uso', 'Contraseña corta', 'Rol inválido']) {
            expect(screen.getByText(message)).toBeInTheDocument();
        }
        expect(screen.getByRole('button', { name: /Creando/ })).toBeDisabled();
        expect(screen.getByLabelText('Nombre')).toBeDisabled();
    });
});

describe('Edit user', () => {
    const target = user(5, { name: 'Edith', email: 'edith@lu.co', branch_id: 2, status: false, photo_url: '/storage/e.png' });
    const renderEdit = (props: Record<string, unknown> = {}) =>
        render(<EditUser user={target as never} branches={branches} roles={roles as never} currentRoleId={2} {...(props as object)} />);

    it('loads the user, with the branch always visible and the photo as preview', () => {
        renderEdit();

        expect(screen.getByLabelText('Nombre')).toHaveValue('Edith');
        expect(screen.getByLabelText('Email')).toHaveValue('edith@lu.co');
        expect(screen.getByLabelText('Rol')).toHaveValue('2');
        expect(screen.getByLabelText('Sucursal')).toHaveValue('2');
        expect(screen.getByRole('switch')).not.toBeChecked();
        expect(screen.getByAltText('Preview')).toHaveAttribute('src', '/storage/e.png');
    });

    it('keeps the branch visible even for a role that sees every branch', () => {
        renderEdit();

        fireEvent.change(screen.getByLabelText('Rol'), { target: { value: '1' } });

        expect(screen.getByLabelText('Sucursal')).toHaveValue('2');
    });

    it('never preselects a role for a user without one', () => {
        renderEdit({ currentRoleId: null });

        expect(screen.getByLabelText('Rol')).toHaveValue('');
        expect(screen.getByRole('option', { name: 'Selecciona un rol' })).toBeDisabled();
    });

    it('posts the changes with the PUT override, leaving the password empty to keep it', () => {
        renderEdit();

        fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Edith Nueva' } });
        fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/ }));

        const [url, options, data] = env.post.mock.calls[0];
        expect(url).toBe('/users/5');
        expect(options).toMatchObject({ forceFormData: true });
        expect(data).toMatchObject({
            name: 'Edith Nueva',
            role_id: 2,
            branch_id: '2',
            password: '',
            password_confirmation: '',
            status: false,
            _method: 'PUT',
        });
        expect(screen.getByText('Dejar en blanco para mantener la contraseña actual')).toBeInTheDocument();
    });

    it('thanks the user once it is saved', () => {
        env.post.mockImplementation((_url, options) => (options as { onSuccess: () => void }).onSuccess());
        renderEdit();

        fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/ }));

        expect(toast.success).toHaveBeenCalledWith('Usuario actualizado correctamente.');
    });

    it('goes back to the user it was editing', () => {
        renderEdit();

        expect(screen.getByText('Volver').closest('a')).toHaveAttribute('href', '/users/5');
    });
});

describe('User detail', () => {
    const shown = user(7, { name: 'Gabriela Soto', role: 'encargado', last_login_at: '2026-10-09T08:00:00Z', uploaded_photo_url: null });

    it('shows who the user is, the role and the state', () => {
        render(<ShowUser user={shown as never} />);

        expect(screen.getByRole('heading', { name: 'Gabriela Soto' })).toBeInTheDocument();
        expect(screen.getByText('Encargado')).toBeInTheDocument();
        expect(screen.getByText('Activo')).toBeInTheDocument();
        expect(screen.getByText('GS')).toBeInTheDocument();
        expect(screen.getByText('Centro')).toBeInTheDocument();
        expect(screen.getByText('Editar usuario').closest('a')).toHaveAttribute('href', '/users/7/edit');
    });

    it('shows a dash when the user never logged in', () => {
        render(<ShowUser user={user(8, { last_login_at: undefined }) as never} />);

        expect(text(screen.getByText('Último acceso').parentElement as HTMLElement)).toContain('—');
    });

    it('shows the uploaded photo and falls back to the initials when it fails', () => {
        render(<ShowUser user={user(9, { name: 'Pedro Gil', uploaded_photo_url: '/p.png' }) as never} />);

        const photo = screen.getByAltText('Pedro Gil');
        fireEvent.error(photo);

        expect(screen.getByText('PG')).toBeInTheDocument();
    });

    it('does not offer to delete yourself', () => {
        env.authUserId = 7;
        render(<ShowUser user={shown as never} />);

        expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument();
    });

    it('asks for an optional reason and deletes only after confirming', () => {
        render(<ShowUser user={shown as never} />);

        fireEvent.click(screen.getByRole('button', { name: /Eliminar/ }));
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByText('¿Eliminar este usuario?')).toBeInTheDocument();
        expect(env.del).not.toHaveBeenCalled();
        fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Ya no trabaja aquí' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar usuario' }));

        expect(env.del).toHaveBeenCalledWith('/users/7', expect.any(Object), { reason: 'Ya no trabaja aquí' });
    });

    it('closes the dialog on cancel without deleting', () => {
        render(<ShowUser user={shown as never} />);

        fireEvent.click(screen.getByRole('button', { name: /Eliminar/ }));
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

        expect(env.del).not.toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
