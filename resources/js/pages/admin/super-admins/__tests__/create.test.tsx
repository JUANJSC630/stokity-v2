import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SuperAdminCreate from '../create';

const mocks = vi.hoisted(() => ({ post: vi.fn(), errors: {} as Record<string, string> }));

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
                setData: (key: string, value: unknown) => setState((current) => ({ ...current, [key]: value })),
                post: mocks.post,
                processing: false,
                errors: mocks.errors,
            };
        },
    };
});

vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

beforeEach(() => {
    vi.clearAllMocks();
    mocks.errors = {};
});

describe('New super admin form', () => {
    it("uses the right keyboard hints and keeps the browser from filling in the creator's own details", () => {
        render(<SuperAdminCreate />);

        expect(screen.getByLabelText('Correo')).toHaveAttribute('inputmode', 'email');
        expect(screen.getByLabelText('Correo')).toHaveAttribute('autocomplete', 'off');
        expect(screen.getByLabelText('Nombre')).toHaveAttribute('autocomplete', 'off');
        expect(screen.getByLabelText('Contraseña')).toHaveAttribute('autocomplete', 'new-password');
        expect(screen.getByLabelText('Confirmar contraseña')).toHaveAttribute('autocomplete', 'new-password');
    });

    it('submits the typed values to the platform route', () => {
        render(<SuperAdminCreate />);

        fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Marta Soporte' } });
        fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'marta@stokity.test' } });
        fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreto-123' } });
        fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'secreto-123' } });
        fireEvent.click(screen.getByRole('button', { name: 'Crear super admin' }));

        expect(mocks.post).toHaveBeenCalledWith('/admin/super-admins');
    });

    it('shows the validation errors next to their fields', () => {
        mocks.errors = { email: 'El correo ya está en uso.', password: 'La contraseña es muy corta.' };
        render(<SuperAdminCreate />);

        expect(screen.getByText('El correo ya está en uso.')).toBeInTheDocument();
        expect(screen.getByText('La contraseña es muy corta.')).toBeInTheDocument();
    });
});
