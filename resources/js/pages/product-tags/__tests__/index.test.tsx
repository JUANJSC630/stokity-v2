/** The tags page: list, create, rename and delete (with a confirmation dialog, never a native one). */
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductTags from '../index';

const env = vi.hoisted(() => ({
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    lastData: {} as Record<string, unknown>,
}));

vi.mock('@inertiajs/react', async () => {
    const React = await import('react');
    return {
        router: { delete: (...args: unknown[]) => env.delete(...args) },
        Head: () => null,
        usePage: () => ({ props: { business: { brand_color: '#C4686F' } } }),
        useForm: (initial: Record<string, unknown>) => {
            const [data, setAll] = React.useState(initial);
            env.lastData = data;
            return {
                data,
                errors: {} as Record<string, string>,
                processing: false,
                setData: (key: string, value: unknown) => setAll((previous) => ({ ...previous, [key]: value })),
                reset: () => setAll(initial),
                clearErrors: () => undefined,
                post: (url: string) => env.post(url, env.lastData),
                put: (url: string) => env.put(url, env.lastData),
            };
        },
    };
});
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

const tags = [
    { id: 1, name: 'Artesanal', slug: 'artesanal', products_count: 3 },
    { id: 2, name: 'Hecho a mano', slug: 'hecho-a-mano', products_count: 1 },
];

describe('Product tags page', () => {
    beforeEach(() => vi.clearAllMocks());

    it('lists the tags with their product counts and slugs', () => {
        render(<ProductTags tags={tags} maxPerProduct={10} />);

        expect(screen.getByText('Artesanal')).toBeInTheDocument();
        expect(screen.getByText(/3 productos/)).toBeInTheDocument();
        expect(screen.getByText(/1 producto ·/)).toBeInTheDocument();
        expect(screen.getByText('hecho-a-mano')).toBeInTheDocument();
    });

    it('invites to create the first tag when there are none', () => {
        render(<ProductTags tags={[]} maxPerProduct={10} />);

        expect(screen.getByText('Aún no hay etiquetas')).toBeInTheDocument();
    });

    it('creates a tag with a POST of its name', () => {
        render(<ProductTags tags={tags} maxPerProduct={10} />);

        fireEvent.click(screen.getByRole('button', { name: /Nueva etiqueta/ }));
        fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Oro' } });
        fireEvent.click(screen.getByRole('button', { name: 'Crear etiqueta' }));

        expect(env.post).toHaveBeenCalledWith('/product-tags', { name: 'Oro' });
    });

    it('renames a tag with a PUT to its id', () => {
        render(<ProductTags tags={tags} maxPerProduct={10} />);

        fireEvent.click(screen.getByRole('button', { name: 'Renombrar Artesanal' }));
        fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Artesanía' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

        expect(env.put).toHaveBeenCalledWith('/product-tags/1', { name: 'Artesanía' });
    });

    it('asks before deleting and says the products are kept', () => {
        render(<ProductTags tags={tags} maxPerProduct={10} />);

        fireEvent.click(screen.getByRole('button', { name: 'Eliminar Artesanal' }));
        expect(screen.getByText(/Los productos no se borran/)).toBeInTheDocument();
        expect(env.delete).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
        expect(env.delete).toHaveBeenCalledWith('/product-tags/1', expect.objectContaining({ preserveScroll: true }));
    });
});
