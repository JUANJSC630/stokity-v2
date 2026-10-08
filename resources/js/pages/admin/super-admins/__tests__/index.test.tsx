import { router, usePage } from '@inertiajs/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SuperAdminsIndex from '../index';

vi.mock('@inertiajs/react', () => ({
    router: { post: vi.fn(), visit: vi.fn() },
    Head: () => null,
    Link: 'a',
    usePage: vi.fn(),
}));

vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

const admins = [
    {
        id: 1,
        name: 'Juan Saldarriaga',
        email: 'juan@stokity.test',
        status: true,
        last_login_at: new Date(Date.now() - 2 * 3600000).toISOString(),
        created_at: '2026-03-02T10:00:00Z',
    },
    { id: 2, name: 'Marta Soporte', email: 'marta@stokity.test', status: false, last_login_at: null, created_at: '2026-06-10T10:00:00Z' },
];

function mockPage(errors: { status?: string } = {}) {
    vi.mocked(usePage).mockReturnValue({ props: { auth: { user: { id: 1 } }, errors } } as unknown as ReturnType<typeof usePage>);
}

beforeEach(() => {
    vi.clearAllMocks();
    mockPage();
});

describe('Super admins list', () => {
    it('lists the accounts with their state and last access', () => {
        render(<SuperAdminsIndex superAdmins={admins} />);

        const list = screen.getByRole('list', { name: '2 cuenta(s)' });
        expect(within(list).getByText('Juan Saldarriaga')).toBeInTheDocument();
        expect(within(list).getByText('Último acceso hace 2 h')).toBeInTheDocument();
        expect(within(list).getByText('Nunca ha ingresado')).toBeInTheDocument();
        expect(within(list).getByText('Inactivo')).toBeInTheDocument();
    });

    it('marks the signed-in account and does not let it deactivate itself', () => {
        render(<SuperAdminsIndex superAdmins={admins} />);

        expect(screen.getAllByText('Tú').length).toBeGreaterThan(0);
        screen.getAllByRole('button', { name: 'Desactivar a Juan Saldarriaga' }).forEach((button) => expect(button).toBeDisabled());
        screen.getAllByRole('button', { name: 'Activar a Marta Soporte' }).forEach((button) => expect(button).toBeEnabled());
    });

    it('activates another account only after confirming', () => {
        render(<SuperAdminsIndex superAdmins={admins} />);

        fireEvent.click(screen.getAllByRole('button', { name: 'Activar a Marta Soporte' })[0]);
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveTextContent('«Marta Soporte»');
        expect(router.post).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));

        expect(router.post).toHaveBeenCalledWith('/admin/super-admins/2/toggle-status', {}, expect.objectContaining({ preserveScroll: true }));
    });

    it('warns that a deactivated account cannot sign in', () => {
        mockPage();
        vi.mocked(usePage).mockReturnValue({ props: { auth: { user: { id: 99 } }, errors: {} } } as unknown as ReturnType<typeof usePage>);
        render(<SuperAdminsIndex superAdmins={admins} />);

        fireEvent.click(screen.getAllByRole('button', { name: 'Desactivar a Juan Saldarriaga' })[0]);

        expect(screen.getByRole('dialog')).toHaveTextContent('No podrá iniciar sesión');
    });

    it('shows the server error as a toast', () => {
        mockPage({ status: 'No puedes desactivar al único super admin activo.' });
        render(<SuperAdminsIndex superAdmins={admins} />);

        expect(toast.error).toHaveBeenCalledWith('No puedes desactivar al único super admin activo.');
    });

    it('shows an empty state without accounts', () => {
        render(<SuperAdminsIndex superAdmins={[]} />);

        expect(screen.getByText('Sin super admins todavía.')).toBeInTheDocument();
    });
});
