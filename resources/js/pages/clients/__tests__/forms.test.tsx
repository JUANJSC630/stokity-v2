import { router } from '@inertiajs/react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Create, { CardCreateClient } from '../create';
import Edit from '../edit';

const form = vi.hoisted(() => ({
    data: {} as Record<string, string | boolean>,
    errors: {} as Record<string, string>,
    post: vi.fn(),
    put: vi.fn(),
    setData: vi.fn(),
    processing: false,
}));
const permissions = vi.hoisted(() => ({ granted: [] as string[] }));

vi.mock('@inertiajs/react', () => ({
    router: { visit: vi.fn(), delete: vi.fn() },
    Head: () => null,
    Link: 'a',
    useForm: () => form,
    usePage: vi.fn(() => ({ props: { business: { brand_color: '#C4686F' } } })),
}));
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/hooks/use-permissions', () => ({ usePermissions: () => ({ can: (permission: string) => permissions.granted.includes(permission) }) }));
vi.mock('@/hooks/use-scroll-to-error', () => ({ useScrollToError: vi.fn() }));

const client = {
    id: 3,
    name: 'María Gómez',
    document: '1000200300',
    phone: '3005551234',
    address: 'Cra 15',
    email: 'maria@correo.co',
    birthdate: '1991-04-12T00:00:00.000000Z',
    is_wholesale: false,
    wholesale_discount_pct: null,
};

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
    vi.stubGlobal('route', (name: string, id?: number) => `/${name}${id ? `/${id}` : ''}`);
    vi.stubGlobal(
        'matchMedia',
        vi.fn().mockImplementation((query: string) => ({
            matches: false,
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
    permissions.granted = [];
    form.errors = {};
    form.processing = false;
    form.data = { name: '', document: '', phone: '', address: '', email: '', birthdate: '', is_wholesale: false, wholesale_discount_pct: '' };
});

describe('Client create', () => {
    it('shows every field with its label and a way back', () => {
        render(<Create />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nuevo cliente');
        for (const label of [/Nombre/, /Documento/, /Teléfono/, /Correo electrónico/, /Dirección/, /Fecha de nacimiento/]) {
            expect(screen.getByLabelText(label)).toBeInTheDocument();
        }
        expect(screen.getByRole('link', { name: 'Volver a clientes' })).toHaveAttribute('href', '/clients.index');
    });

    it('writes what the user types into the form', () => {
        render(<Create />);

        fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Ana' } });

        expect(form.setData).toHaveBeenCalledWith('name', 'Ana');
    });

    it('posts to the store route on submit', () => {
        render(<Create />);

        fireEvent.submit(screen.getByRole('button', { name: 'Guardar cliente' }).closest('form') as HTMLFormElement);

        expect(form.post).toHaveBeenCalledWith('/clients.store', expect.any(Object));
    });

    it('shows validation messages under their field', () => {
        form.errors = { document: 'El documento ya existe.' };
        render(<Create />);

        expect(screen.getByText('El documento ya existe.')).toBeInTheDocument();
    });

    it('offers the wholesale switch only with permission', () => {
        const { unmount } = render(<Create />);
        expect(screen.queryByLabelText('Cliente mayorista')).not.toBeInTheDocument();
        unmount();

        permissions.granted = ['clients.wholesale.manage'];
        render(<Create />);
        expect(screen.getByLabelText('Cliente mayorista')).toBeInTheDocument();
    });

    it('asks for the discount once the client is wholesale', () => {
        permissions.granted = ['clients.wholesale.manage'];
        form.data = { ...form.data, is_wholesale: true };
        render(<Create />);

        expect(screen.getByLabelText(/Descuento \(%\)/)).toBeInTheDocument();
    });

    it('in the wholesale dialog asks for the city instead of the address and hides the email', () => {
        permissions.granted = ['clients.wholesale.manage'];
        render(<CardCreateClient variant="wholesale" onCancel={vi.fn()} />);

        expect(screen.getByLabelText('Ciudad')).toBeInTheDocument();
        expect(screen.queryByLabelText(/Correo electrónico/)).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Cliente mayorista')).not.toBeInTheDocument();
    });

    it('cancels through the given handler inside a dialog', () => {
        const onCancel = vi.fn();
        render(<CardCreateClient onCancel={onCancel} />);

        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(router.visit).not.toHaveBeenCalled();
    });
});

describe('Client edit', () => {
    beforeEach(() => {
        form.data = {
            name: client.name,
            document: client.document,
            phone: client.phone,
            address: client.address,
            email: client.email,
            birthdate: client.birthdate,
            is_wholesale: false,
            wholesale_discount_pct: '',
        };
    });

    it('is prefilled with the client data and trims the birth date to a day', () => {
        render(<Edit client={client} />);

        expect(screen.getByLabelText(/Nombre/)).toHaveValue('María Gómez');
        expect(screen.getByLabelText(/Fecha de nacimiento/)).toHaveValue('1991-04-12');
        expect(screen.getByRole('link', { name: 'Volver al cliente' })).toHaveAttribute('href', '/clients.show/3');
    });

    it('updates the client on submit', () => {
        render(<Edit client={client} />);

        fireEvent.submit(screen.getByRole('button', { name: 'Actualizar cliente' }).closest('form') as HTMLFormElement);

        expect(form.put).toHaveBeenCalledWith('/clients.update/3');
    });

    it('asks for a long press before deleting', () => {
        render(<Edit client={client} />);

        fireEvent.click(screen.getByRole('button', { name: 'Eliminar cliente' }));

        expect(screen.getByRole('dialog', { name: 'Eliminar cliente' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Mantén para eliminar/ })).toBeInTheDocument();
        expect(router.delete).not.toHaveBeenCalled();
    });
});
