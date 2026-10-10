/** Characterization tests for the branches list, create, edit, detail and trash pages: pin today's behavior before the redesign. */
import { router } from '@inertiajs/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import CreateBranch from '../create';
import EditBranch from '../edit';
import Branches from '../index';
import BranchDetail from '../show';
import TrashedBranches from '../trashed';

const env = vi.hoisted(() => ({
    post: vi.fn(),
    put: vi.fn(),
    errors: {} as Record<string, string>,
    processing: false,
    permissions: ['branches.create', 'branches.delete'] as string[],
    wide: true,
}));

vi.mock('@inertiajs/react', async () => {
    const React = await import('react');
    return {
        router: { visit: vi.fn(), get: vi.fn(), delete: vi.fn(), put: vi.fn() },
        Head: () => null,
        Link: 'a',
        usePage: () => ({ props: { auth: { permissions: env.permissions }, business: { brand_color: '#C4686F' } } }),
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
                put: (url: string, options?: unknown) => env.put(url, options, snapshot.current),
            };
        },
    };
});
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/hooks/use-polling', () => ({ usePolling: vi.fn() }));
vi.mock('@/hooks/use-scroll-to-error', () => ({ useScrollToError: vi.fn() }));
vi.mock('@/components/ui/select', () => ({
    Select: ({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children: ReactNode }) => (
        <select value={value} onChange={(e) => onValueChange?.(e.target.value)}>
            {children}
        </select>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));

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
    env.permissions = ['branches.create', 'branches.delete'];
    env.wide = true;
    window.history.replaceState({}, '', '/branches');
});

const person = (id: number, role: string, overrides: Record<string, unknown> = {}) => ({
    id,
    name: `Persona ${id}`,
    email: `p${id}@lu.co`,
    role,
    status: true,
    ...overrides,
});

const branch = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    name: `Sucursal ${id}`,
    address: `Calle ${id}`,
    phone: `300000000${id}`,
    email: null,
    business_name: `Negocio ${id}`,
    status: true,
    manager_id: null,
    manager: undefined,
    employees: [],
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    deleted_at: null,
    ...overrides,
});

const page = (data: unknown[]) => ({
    data,
    links: [
        { label: '&laquo; Anterior', url: null },
        { label: '1', url: '/b?page=1' },
        { label: 'Siguiente &raquo;', url: null },
    ],
    current_page: 1,
    from: 1,
    to: data.length,
    total: data.length,
    last_page: 1,
});

const boss = person(10, 'encargado', { name: 'Berta Jefa' });
const rows = [
    branch(1, {
        name: 'Centro',
        manager: boss,
        manager_id: 10,
        employees: [boss, person(11, 'vendedor'), person(12, 'vendedor'), person(13, 'encargado')],
    }),
    branch(2, { name: 'Norte', status: false, employees: [] }),
];

describe('Branches list', () => {
    it('lists the branches with state, manager and how many sellers they have in the table on a wide screen', () => {
        render(<Branches branches={page(rows) as never} />);

        const table = screen.getByRole('table', { name: 'Sucursales' });
        expect(within(table).getByText('Centro')).toBeInTheDocument();
        expect(within(table).getByText('Activa')).toBeInTheDocument();
        expect(within(table).getByText('Inactiva')).toBeInTheDocument();
        expect(within(table).getByText('Berta Jefa')).toBeInTheDocument();
        expect(within(table).getByText('2 vendedor(es)')).toBeInTheDocument();
        expect(within(table).getByText('Sin vendedores')).toBeInTheDocument();
    });

    it('lists them as rows on a phone, marking only the inactive ones', () => {
        env.wide = false;
        render(<Branches branches={page(rows) as never} />);

        expect(screen.queryByRole('table')).not.toBeInTheDocument();
        expect(screen.getByText('Centro')).toBeInTheDocument();
        expect(screen.getByText(/Berta Jefa · 2 vendedor\(es\)/)).toBeInTheDocument();
        expect(screen.getAllByText('Inactiva').length).toBe(1);
        expect(screen.queryByText('Activa')).not.toBeInTheDocument();
    });

    it('counts only sellers other than the manager', () => {
        const sameAsManager = branch(3, { manager: person(20, 'vendedor'), employees: [person(20, 'vendedor')] });
        render(<Branches branches={page([sameAsManager]) as never} />);

        expect(screen.getByText('Sin vendedores')).toBeInTheDocument();
    });

    it('says so when there are no branches', () => {
        render(<Branches branches={page([]) as never} />);

        expect(screen.getByText('No se encontraron sucursales')).toBeInTheDocument();
    });

    it('offers to create and to see the trash only with those permissions', () => {
        const { unmount } = render(<Branches branches={page(rows) as never} />);
        expect(screen.getByText('Nueva Sucursal').closest('a')).toHaveAttribute('href', '/branches/create');
        expect(screen.getByText('Sucursales Eliminadas').closest('a')).toHaveAttribute('href', '/branches/trashed');
        unmount();

        env.permissions = [];
        render(<Branches branches={page(rows) as never} />);
        expect(screen.queryByText('Nueva Sucursal')).not.toBeInTheDocument();
        expect(screen.queryByText('Sucursales Eliminadas')).not.toBeInTheDocument();
    });

    it('links each branch to its detail', () => {
        render(<Branches branches={page(rows) as never} />);

        expect(screen.getByLabelText('Ver sucursal Norte')).toHaveAttribute('href', '/branches/2');
        expect(screen.getByLabelText('Ver sucursal Centro')).toHaveAttribute('href', '/branches/1');
    });

    it('searches on submit and filters by state keeping the search', () => {
        render(<Branches branches={page(rows) as never} />);

        const input = screen.getByPlaceholderText('Buscar por nombre, dirección o gerente');
        fireEvent.change(input, { target: { value: 'cen' } });
        fireEvent.submit(input.closest('form') as HTMLFormElement);
        expect(router.visit).toHaveBeenCalledWith('/branches?search=cen', expect.objectContaining({ only: ['branches'], preserveState: true }));

        fireEvent.click(screen.getByRole('button', { name: 'Inactivas' }));
        expect(router.visit).toHaveBeenLastCalledWith('/branches?search=cen&status=0', expect.objectContaining({ only: ['branches'] }));
    });

    it('starts from the filters it receives and resets them when the search is emptied', () => {
        window.history.replaceState({}, '', '/branches?search=cen&status=1');
        render(<Branches branches={page(rows) as never} filters={{ search: 'cen', status: '1' }} />);
        expect(screen.getByRole('button', { name: 'Activas' })).toHaveAttribute('aria-pressed', 'true');

        fireEvent.change(screen.getByPlaceholderText('Buscar por nombre, dirección o gerente'), { target: { value: '' } });

        expect(router.visit).toHaveBeenCalledWith('/branches?', expect.objectContaining({ only: ['branches'] }));
        expect(screen.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('no longer has the filter card titled "Filtrar Productos" nor the delete dialog that was never opened', () => {
        render(<Branches branches={page(rows) as never} />);

        expect(screen.queryByText('Filtrar Productos')).not.toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});

describe('Create branch', () => {
    const managers = [person(10, 'encargado', { name: 'Berta Jefa' }), person(11, 'administrador', { name: 'Ada Admin' })];

    it('starts active with no manager', () => {
        render(<CreateBranch managers={managers as never} />);

        expect(screen.getByLabelText('Nombre de la sucursal *')).toHaveValue('');
        expect(screen.getByRole('combobox')).toHaveValue('none');
        expect(screen.getByRole('switch')).toBeChecked();
        expect(screen.getByText('Activa')).toBeInTheDocument();
        expect(screen.getByText(/Solo usuarios con rol de "Encargado"/)).toBeInTheDocument();
    });

    it('warns when there are no managers to choose from', () => {
        render(<CreateBranch managers={[]} />);

        expect(screen.getByText('No hay encargados o administradores registrados aún.')).toBeInTheDocument();
    });

    it('posts what was typed, with "none" when no manager is chosen', () => {
        render(<CreateBranch managers={managers as never} />);

        fireEvent.change(screen.getByLabelText('Nombre de la sucursal *'), { target: { value: 'Sur' } });
        fireEvent.change(screen.getByLabelText('Teléfono *'), { target: { value: '3001112222' } });
        fireEvent.change(screen.getByLabelText('Dirección *'), { target: { value: 'Calle 9' } });
        fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'sur@lu.co' } });
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '10' } });
        fireEvent.click(screen.getByRole('switch'));
        fireEvent.click(screen.getByRole('button', { name: 'Crear sucursal' }));

        expect(env.post).toHaveBeenCalledWith(
            '/branches.store',
            { preserveScroll: true },
            { name: 'Sur', address: 'Calle 9', phone: '3001112222', email: 'sur@lu.co', status: false, manager_id: '10' },
        );
    });

    it('shows the server errors and the saving label', () => {
        env.errors = { name: 'Nombre en uso', phone: 'Teléfono inválido', address: 'Dirección requerida', manager_id: 'Gerente inválido' };
        env.processing = true;
        render(<CreateBranch managers={managers as never} />);

        for (const message of ['Nombre en uso', 'Teléfono inválido', 'Dirección requerida', 'Gerente inválido']) {
            expect(screen.getByText(message)).toBeInTheDocument();
        }
        expect(screen.getByRole('button', { name: 'Creando...' })).toBeDisabled();
    });

    it('goes back to the list', () => {
        render(<CreateBranch managers={managers as never} />);

        expect(screen.getByLabelText('Volver').closest('a')).toHaveAttribute('href', '/branches');
        expect(screen.getByRole('button', { name: 'Cancelar' }).closest('a')).toHaveAttribute('href', '/branches');
    });
});

describe('Edit branch', () => {
    const target = branch(4, { name: 'Oeste', email: 'oeste@lu.co', manager_id: 10, status: false });
    const managers = [person(10, 'encargado', { name: 'Berta Jefa' })];

    it('loads the branch with its business name and manager', () => {
        render(<EditBranch branch={target as never} managers={managers as never} />);

        expect(screen.getByLabelText('Nombre de la sucursal *')).toHaveValue('Oeste');
        expect(screen.getByLabelText('Nombre comercial')).toHaveValue('Negocio 4');
        expect(screen.getByRole('combobox')).toHaveValue('10');
        expect(screen.getByRole('switch')).not.toBeChecked();
        expect(screen.getByText(/"Encargado" o "Administrador"/)).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Editar Sucursal: Oeste' })).toBeInTheDocument();
    });

    it('puts the changes to the update route', () => {
        render(<EditBranch branch={target as never} managers={managers as never} />);

        fireEvent.change(screen.getByLabelText('Nombre comercial'), { target: { value: 'Oeste SAS' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

        expect(env.put).toHaveBeenCalledWith(
            '/branches.update/4',
            { preserveScroll: true },
            {
                name: 'Oeste',
                address: 'Calle 4',
                phone: '3000000004',
                email: 'oeste@lu.co',
                business_name: 'Oeste SAS',
                status: false,
                manager_id: '10',
            },
        );
    });

    it('sends "none" for a branch without manager and shows the saving label', () => {
        env.processing = true;
        render(<EditBranch branch={branch(5) as never} managers={[]} />);

        expect(screen.getByRole('combobox')).toHaveValue('none');
        expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled();
    });
});

describe('Branch detail', () => {
    const full = branch(1, {
        name: 'Centro',
        email: 'centro@lu.co',
        status: true,
        manager: boss,
        employees: [person(11, 'vendedor', { name: 'Vera Vende' }), person(12, 'vendedor', { name: 'Vito Vende', status: false }), boss],
    });

    it('shows the contact data, the manager and only the sellers', () => {
        render(<BranchDetail branch={full as never} />);

        expect(screen.getByRole('heading', { name: 'Centro' })).toBeInTheDocument();
        expect(screen.getByText('Activa')).toBeInTheDocument();
        expect(screen.getByText('Calle 1')).toBeInTheDocument();
        expect(screen.getByText('centro@lu.co')).toBeInTheDocument();
        expect(screen.getByText('Negocio 1')).toBeInTheDocument();
        expect(screen.getByText('Berta Jefa').closest('a')).toHaveAttribute('href', '/users/10');
        expect(screen.getByText('Vera Vende').closest('a')).toHaveAttribute('href', '/users/11');
        expect(screen.getByText('2 vendedores')).toBeInTheDocument();
        expect(screen.getAllByText('Activo').length).toBe(1);
        expect(screen.getAllByText('Inactivo').length).toBe(1);
    });

    it('explains the empty manager and the empty team', () => {
        render(<BranchDetail branch={branch(2, { status: false }) as never} />);

        expect(screen.getByText('Inactiva')).toBeInTheDocument();
        expect(screen.getByText('No hay encargado asignado a esta sucursal')).toBeInTheDocument();
        expect(screen.getByText('No hay vendedores asignados a esta sucursal')).toBeInTheDocument();
        expect(screen.getByText('0 vendedores')).toBeInTheDocument();
    });

    it('hides the email when there is none', () => {
        render(<BranchDetail branch={branch(2) as never} />);

        expect(screen.queryByText('Email')).not.toBeInTheDocument();
    });

    it('always offers edit and delete (not gated by permissions) and deletes only after confirming', () => {
        env.permissions = [];
        render(<BranchDetail branch={full as never} />);

        expect(screen.getByText('Editar').closest('a')).toHaveAttribute('href', '/branches/1/edit');
        fireEvent.click(screen.getByRole('button', { name: /Eliminar/ }));
        const dialog = screen.getByRole('dialog');
        expect(router.delete).not.toHaveBeenCalled();
        fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

        expect(router.delete).toHaveBeenCalledWith('/branches/1', expect.any(Object));
    });

    it('closes the dialog on cancel', () => {
        render(<BranchDetail branch={full as never} />);

        fireEvent.click(screen.getByRole('button', { name: /Eliminar/ }));
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

        expect(router.delete).not.toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});

describe('Deleted branches', () => {
    const trashed = [
        branch(7, { name: 'Vieja', manager: boss, deleted_at: '2026-09-01T10:30:00Z' }),
        branch(8, { name: 'Antigua', deleted_at: '2026-08-01T10:30:00Z' }),
    ];

    it('lists the deleted branches with their manager and date in the table on a wide screen', () => {
        render(<TrashedBranches branches={page(trashed) as never} />);

        const table = screen.getByRole('table', { name: 'Sucursales eliminadas' });
        expect(within(table).getByText('Vieja')).toBeInTheDocument();
        expect(within(table).getByText('Berta Jefa')).toBeInTheDocument();
        expect(within(table).getAllByText(/09\/2026|01\/09\/2026|1\/9\/2026/).length).toBeGreaterThan(0);
    });

    it('lists them as cards on a phone, with the "Eliminada" tag', () => {
        env.wide = false;
        render(<TrashedBranches branches={page(trashed) as never} />);

        expect(screen.queryByRole('table')).not.toBeInTheDocument();
        expect(screen.getAllByText('Eliminada').length).toBe(2);
        expect(screen.getAllByLabelText('Restaurar').length).toBe(2);
    });

    it('says so when nothing is deleted', () => {
        render(<TrashedBranches branches={page([]) as never} />);

        expect(screen.getByText('No hay sucursales eliminadas')).toBeInTheDocument();
    });

    it('goes back to the branches', () => {
        render(<TrashedBranches branches={page(trashed) as never} />);

        expect(screen.getByText('Volver a Sucursales').closest('a')).toHaveAttribute('href', '/branches');
    });

    it('searches on submit and clears itself when the box is emptied', () => {
        window.history.replaceState({}, '', '/branches/trashed?search=vie');
        render(<TrashedBranches branches={page(trashed) as never} filters={{ search: 'vie' }} />);

        const input = screen.getByPlaceholderText('Buscar por nombre, dirección o gerente');
        fireEvent.change(input, { target: { value: 'ant' } });
        fireEvent.submit(input.closest('form') as HTMLFormElement);
        expect(router.visit).toHaveBeenCalledWith('/branches/trashed?search=ant', expect.objectContaining({ only: ['branches'] }));

        fireEvent.change(input, { target: { value: '' } });
        expect(router.visit).toHaveBeenLastCalledWith('/branches/trashed?', expect.objectContaining({ only: ['branches'] }));
    });

    it('restores a branch only after confirming', () => {
        render(<TrashedBranches branches={page(trashed) as never} />);

        fireEvent.click(screen.getAllByLabelText('Restaurar')[0]);
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByText('Confirmar restauración')).toBeInTheDocument();
        expect(router.put).not.toHaveBeenCalled();
        fireEvent.click(within(dialog).getByRole('button', { name: 'Restaurar' }));

        expect(router.put).toHaveBeenCalledWith('/branches/7/restore', {}, { preserveScroll: true });
    });

    it('deletes permanently only after confirming', () => {
        render(<TrashedBranches branches={page(trashed) as never} />);

        fireEvent.click(screen.getAllByLabelText('Eliminar permanentemente')[1]);
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByText(/no puede ser revertida/)).toBeInTheDocument();
        expect(router.delete).not.toHaveBeenCalled();
        fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar permanentemente' }));

        expect(router.delete).toHaveBeenCalledWith('/branches/8/force-delete', { preserveScroll: true });
    });

    it('does nothing when the dialogs are cancelled', () => {
        render(<TrashedBranches branches={page(trashed) as never} />);

        fireEvent.click(screen.getAllByLabelText('Restaurar')[0]);
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

        expect(router.put).not.toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
