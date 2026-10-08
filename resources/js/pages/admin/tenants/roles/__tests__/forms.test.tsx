import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminTenantRoleCreate from '../create';
import AdminTenantRoleEdit from '../edit';

const mocks = vi.hoisted(() => ({ post: vi.fn(), transform: vi.fn(), errors: {} as Record<string, string>, processing: false }));

vi.mock('@inertiajs/react', async () => {
    const { useState } = await import('react');

    return {
        Head: () => null,
        Link: 'a',
        usePage: vi.fn(() => ({ props: {} })),
        useForm: (initial: Record<string, unknown>) => {
            const [data, setState] = useState(initial);

            return {
                data,
                setData: (patch: unknown) =>
                    setState((current) =>
                        typeof patch === 'function'
                            ? (patch as (c: typeof current) => typeof current)(current)
                            : { ...current, ...(patch as object) },
                    ),
                post: mocks.post,
                transform: mocks.transform,
                processing: mocks.processing,
                errors: mocks.errors,
            };
        },
    };
});

vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

const tenant = { id: 7, name: 'Lu Accesorios' };

const catalog = {
    sales: {
        'sales.view': { module: 'sales', label: 'Ver ventas' },
        'sales.delete': { module: 'sales', label: 'Eliminar ventas', requires: ['sales.view'] },
    },
};

const role = (overrides: Record<string, unknown> = {}) => ({
    id: 3,
    name: 'Contador',
    description: 'Solo reportes',
    data_scope: 'own' as const,
    is_system: false,
    permissions: ['sales.view'],
    ...overrides,
});

beforeAll(() => {
    vi.stubGlobal(
        'ResizeObserver',
        class {
            observe() {}
            unobserve() {}
            disconnect() {}
        },
    );
});

beforeEach(() => {
    vi.clearAllMocks();
    mocks.errors = {};
    mocks.processing = false;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
});

describe('Create role', () => {
    it('submits to the tenant roles route with the selected permissions', () => {
        render(<AdminTenantRoleCreate tenant={tenant} permissionsByModule={catalog} />);

        fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Cajero' } });
        fireEvent.click(screen.getByLabelText('Eliminar ventas'));
        fireEvent.click(screen.getByRole('button', { name: 'Crear rol' }));

        expect(mocks.post).toHaveBeenCalledWith('/admin/tenants/7/roles');
        const transform = mocks.transform.mock.calls[0][0] as (data: Record<string, unknown>) => Record<string, unknown>;
        expect(transform({ name: 'Cajero' }).permissions).toEqual(expect.arrayContaining(['sales.view', 'sales.delete']));
    });

    it('defaults to the branch scope and offers both scopes', () => {
        render(<AdminTenantRoleCreate tenant={tenant} permissionsByModule={catalog} />);

        const scope = screen.getByLabelText('Alcance de datos') as HTMLSelectElement;
        expect(scope.value).toBe('branch');
        expect(Array.from(scope.options).map((option) => option.value)).toEqual(['branch', 'all']);
    });

    it('shows validation errors and a busy label while saving', () => {
        mocks.errors = { name: 'El nombre es obligatorio.', permissions: 'Elige al menos un permiso.' };
        mocks.processing = true;
        render(<AdminTenantRoleCreate tenant={tenant} permissionsByModule={catalog} />);

        expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument();
        expect(screen.getByText('Elige al menos un permiso.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Creando...' })).toBeDisabled();
    });
});

describe('Edit role', () => {
    it('starts from the saved values and maps the own scope to branch', () => {
        render(<AdminTenantRoleEdit tenant={tenant} role={role()} permissionsByModule={catalog} />);

        expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe('Contador');
        expect((screen.getByLabelText('Alcance de datos') as HTMLSelectElement).value).toBe('branch');
        expect((screen.getByLabelText('Ver ventas') as HTMLInputElement).getAttribute('data-state')).toBe('checked');
    });

    it('submits the update with the edited permissions', () => {
        render(<AdminTenantRoleEdit tenant={tenant} role={role()} permissionsByModule={catalog} />);

        fireEvent.click(screen.getByLabelText('Eliminar ventas'));
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

        expect(mocks.post).toHaveBeenCalledWith('/admin/tenants/7/roles/3');
    });

    it('locks the name of a system role and says so', () => {
        render(<AdminTenantRoleEdit tenant={tenant} role={role({ is_system: true })} permissionsByModule={catalog} />);

        expect(screen.getByLabelText('Nombre')).toBeDisabled();
        expect(screen.getByText('El nombre de un rol del sistema no se puede cambiar.')).toBeInTheDocument();
        expect(screen.getByText('del sistema')).toBeInTheDocument();
    });
});
