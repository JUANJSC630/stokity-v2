/** Characterization tests for the categories list, the standalone create page and the trash: pin today's behavior before the redesign. */
import { router } from '@inertiajs/react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import CreateCategory from '../create';
import Categories from '../index';
import TrashedCategories from '../trashed';

const env = vi.hoisted(() => ({
    granted: [] as string[],
    post: vi.fn(),
    put: vi.fn(),
    errors: {} as Record<string, string>,
}));

vi.mock('@inertiajs/react', async () => {
    const React = await import('react');
    return {
        router: { visit: vi.fn(), delete: vi.fn(), put: vi.fn(), reload: vi.fn() },
        Head: () => null,
        Link: 'a',
        usePage: () => ({ props: { business: { brand_color: '#C4686F' } } }),
        useForm: (initial: Record<string, unknown>) => {
            const [data, setAll] = React.useState(initial);
            const snapshot = React.useRef(data);
            snapshot.current = data;
            return {
                data,
                errors: env.errors,
                processing: false,
                setData: (key: string, value: unknown) => setAll((previous) => ({ ...previous, [key]: value })),
                reset: () => setAll(initial),
                post: (url: string, options: unknown) => env.post(url, options, snapshot.current),
                put: (url: string, options: unknown) => env.put(url, options, snapshot.current),
            };
        },
    };
});
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/hooks/use-permissions', () => ({ usePermissions: () => ({ can: (permission: string) => env.granted.includes(permission) }) }));
vi.mock('@/hooks/use-polling', () => ({ usePolling: vi.fn() }));

const category = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    name: `Categoría ${id}`,
    description: null,
    status: true,
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-02T10:00:00Z',
    deleted_at: null,
    ...overrides,
});

const paginated = (data: unknown[]) => ({ data, links: [], current_page: 1, from: 1, to: data.length, total: data.length, last_page: 1 }) as never;

const text = (node: HTMLElement) => (node.textContent ?? '').replace(/\s/g, ' ');
const buttonsNamed = (name: string) => screen.getAllByRole('button', { name });
const searchBox = () => screen.getByRole('searchbox') as HTMLInputElement;

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
    vi.stubGlobal('route', (name: string, id?: number) => `/${name}${id ? `/${id}` : ''}`);
});

beforeEach(() => {
    vi.clearAllMocks();
    env.granted = [];
    env.errors = {};
    window.history.replaceState({}, '', '/categories');
});

describe('Categories list', () => {
    const renderIndex = (data: unknown[], filters: { search?: string } = {}) => render(<Categories categories={paginated(data)} filters={filters} />);

    it('lists the categories by name', () => {
        renderIndex([category(1), category(2)]);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Gestión de Categorías');
        expect(screen.getAllByText('Categoría 1').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Categoría 2').length).toBeGreaterThan(0);
    });

    it('says so when there are no categories', () => {
        renderIndex([]);

        expect(screen.getByText('No se encontraron categorías')).toBeInTheDocument();
    });

    it('offers create, trash, edit and delete only with their permissions', () => {
        const { unmount } = renderIndex([category(1)]);
        expect(screen.queryByRole('button', { name: /Nueva Categoría/ })).not.toBeInTheDocument();
        expect(document.querySelector('a[href="/categories/trashed"]')).toBeNull();
        expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
        unmount();

        env.granted = ['categories.create', 'categories.delete', 'categories.update'];
        renderIndex([category(1)]);
        expect(screen.getByRole('button', { name: /Nueva Categoría/ })).toBeInTheDocument();
        expect(document.querySelector('a[href="/categories/trashed"]')).not.toBeNull();
        expect(buttonsNamed('Editar').length).toBeGreaterThan(0);
        expect(buttonsNamed('Eliminar').length).toBeGreaterThan(0);
    });

    it('searches by name on submit with a partial reload of the categories only', () => {
        renderIndex([category(1)]);

        fireEvent.change(searchBox(), { target: { value: 'joyas' } });
        fireEvent.submit(searchBox().closest('form') as HTMLFormElement);

        expect(router.visit).toHaveBeenCalledWith(
            '/categories?search=joyas',
            expect.objectContaining({ preserveState: true, preserveScroll: true, only: ['categories'] }),
        );
    });

    it('goes back to the full list when a search that is in the address is cleared', () => {
        window.history.replaceState({}, '', '/categories?search=joyas');
        renderIndex([category(1)], { search: 'joyas' });

        fireEvent.change(searchBox(), { target: { value: '' } });

        expect(router.visit).toHaveBeenCalledWith('/categories?', expect.objectContaining({ only: ['categories'] }));
    });

    it('creates a category from a dialog and closes it when it is saved', () => {
        env.granted = ['categories.create'];
        renderIndex([category(1)]);

        fireEvent.click(screen.getByRole('button', { name: /Nueva Categoría/ }));
        const dialog = screen.getByRole('dialog', { name: 'Crear Nueva Categoría' });
        fireEvent.change(within(dialog).getByLabelText('Nombre'), { target: { value: 'Relojes' } });
        fireEvent.submit(within(dialog).getByRole('button', { name: 'Crear Categoría' }).closest('form') as HTMLFormElement);

        expect(env.post).toHaveBeenCalledWith('/categories', expect.objectContaining({ preserveState: false }), { name: 'Relojes' });

        act(() => (env.post.mock.calls[0][1] as { onSuccess: () => void }).onSuccess());
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows the name error of the server inside the create dialog and can be cancelled', () => {
        env.granted = ['categories.create'];
        env.errors = { name: 'Ya existe una categoría con ese nombre.' };
        renderIndex([category(1)]);

        fireEvent.click(screen.getByRole('button', { name: /Nueva Categoría/ }));
        const dialog = screen.getByRole('dialog');
        expect(text(dialog)).toContain('Ya existe una categoría con ese nombre.');

        fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
        expect(env.post).not.toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('edits a category from a dialog prefilled with its name', () => {
        env.granted = ['categories.update'];
        renderIndex([category(7, { name: 'Collares' })]);

        fireEvent.click(buttonsNamed('Editar')[0]);
        const dialog = screen.getByRole('dialog', { name: 'Editar Categoría' });
        const field = within(dialog).getByLabelText('Nombre') as HTMLInputElement;
        expect(field.value).toBe('Collares');

        fireEvent.change(field, { target: { value: 'Collares largos' } });
        fireEvent.submit(within(dialog).getByRole('button', { name: 'Guardar cambios' }).closest('form') as HTMLFormElement);

        expect(env.put).toHaveBeenCalledWith('/categories/7', expect.any(Object), { name: 'Collares largos' });
        act(() => (env.put.mock.calls[0][1] as { onSuccess: () => void }).onSuccess());
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('deletes a category only after confirming, naming it', () => {
        env.granted = ['categories.delete'];
        renderIndex([category(7, { name: 'Collares' })]);

        fireEvent.click(buttonsNamed('Eliminar')[0]);
        const dialog = screen.getByRole('dialog');
        expect(text(dialog)).toContain('¿Está seguro de eliminar la categoría Collares?');
        expect(router.delete).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

        expect(router.delete).toHaveBeenCalledWith('/categories/7', expect.any(Object));
    });

    it('closes the delete dialog with Cancelar without deleting', () => {
        env.granted = ['categories.delete'];
        renderIndex([category(7)]);
        fireEvent.click(buttonsNamed('Eliminar')[0]);

        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

        expect(router.delete).not.toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});

describe('New category page', () => {
    it('asks for the name and posts it, clearing the form when it is saved', () => {
        render(<CreateCategory />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Crear Categoría');
        fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Relojes' } });
        fireEvent.submit(screen.getByRole('button', { name: 'Crear Categoría' }).closest('form') as HTMLFormElement);

        expect(env.post).toHaveBeenCalledWith('/categories', expect.any(Object), { name: 'Relojes' });
        act(() => (env.post.mock.calls[0][1] as { onSuccess: () => void }).onSuccess());
        expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe('');
    });

    it('shows the server error and links back to the list', () => {
        env.errors = { name: 'El nombre es obligatorio.' };
        render(<CreateCategory />);

        expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Volver/ })).toHaveAttribute('href', '/categories');
    });
});

describe('Deleted categories', () => {
    const renderTrashed = (data: unknown[]) => render(<TrashedCategories categories={paginated(data)} filters={{}} />);

    it('lists deleted categories and links back to the list', () => {
        renderTrashed([category(3, { name: 'Antiguos' })]);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Categorías Eliminadas');
        expect(screen.getAllByText('Antiguos').length).toBeGreaterThan(0);
        expect(screen.getByRole('link', { name: /Volver a Categorías/ })).toHaveAttribute('href', '/categories');
    });

    it('offers restore and permanent delete only with their permissions', () => {
        const { unmount } = renderTrashed([category(3)]);
        expect(screen.queryByRole('button', { name: 'Restaurar' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Eliminar permanentemente' })).not.toBeInTheDocument();
        unmount();

        env.granted = ['categories.restore', 'categories.delete'];
        renderTrashed([category(3)]);
        expect(buttonsNamed('Restaurar').length).toBeGreaterThan(0);
        expect(buttonsNamed('Eliminar permanentemente').length).toBeGreaterThan(0);
    });

    it('restores a category only after confirming', () => {
        env.granted = ['categories.restore'];
        renderTrashed([category(3, { name: 'Antiguos' })]);

        fireEvent.click(buttonsNamed('Restaurar')[0]);
        const dialog = screen.getByRole('dialog', { name: 'Restaurar Categoría' });
        expect(text(dialog)).toContain('¿Desea restaurar la categoría Antiguos?');
        expect(router.put).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Restaurar' }));

        expect(router.put).toHaveBeenCalledWith('/categories/3/restore', {}, expect.any(Object));
    });

    it('deletes forever only after confirming when it has no products', () => {
        env.granted = ['categories.delete'];
        renderTrashed([category(3, { name: 'Antiguos', products_count: 0 })]);

        fireEvent.click(buttonsNamed('Eliminar permanentemente')[0]);
        const dialog = screen.getByRole('dialog');
        expect(text(dialog)).toContain('Confirmar eliminación permanente');
        expect(router.delete).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar Permanentemente' }));

        expect(router.delete).toHaveBeenCalledWith('/categories/3/force-delete', expect.any(Object));
    });

    it('refuses to delete forever a category that still has products, and explains', () => {
        env.granted = ['categories.delete'];
        renderTrashed([category(3, { name: 'Antiguos', products_count: 4 })]);

        fireEvent.click(buttonsNamed('Eliminar permanentemente')[0]);
        const dialog = screen.getByRole('dialog');

        expect(text(dialog)).toContain('No se puede eliminar');
        expect(text(dialog)).toContain('4 producto(s) asociado(s)');
        expect(within(dialog).queryByRole('button', { name: 'Eliminar Permanentemente' })).not.toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    });

    it('searches by name on submit within the trash', () => {
        renderTrashed([category(3)]);

        fireEvent.change(searchBox(), { target: { value: 'anti' } });
        fireEvent.submit(searchBox().closest('form') as HTMLFormElement);

        expect(router.visit).toHaveBeenCalledWith(
            '/categories/trashed?search=anti',
            expect.objectContaining({ preserveState: true, preserveScroll: true, only: ['categories'] }),
        );
    });
});
