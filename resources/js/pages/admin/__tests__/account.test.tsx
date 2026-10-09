import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminAccount from '../account';

const mocks = vi.hoisted(() => ({
    put: vi.fn(),
    reset: vi.fn(),
    errors: {} as Record<string, string>,
    recentlySuccessful: false,
}));

vi.mock('@inertiajs/react', async () => {
    const { useState } = await import('react');

    return {
        Head: () => null,
        usePage: vi.fn(() => ({ props: {} })),
        useForm: (initial: Record<string, unknown>) => {
            const [data, setState] = useState(initial);

            return {
                data,
                setData: (key: string, value: unknown) => setState((current) => ({ ...current, [key]: value })),
                put: mocks.put,
                reset: mocks.reset,
                processing: false,
                errors: mocks.errors,
                recentlySuccessful: mocks.recentlySuccessful,
            };
        },
    };
});

vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

beforeEach(() => {
    vi.clearAllMocks();
    mocks.errors = {};
    mocks.recentlySuccessful = false;
});

describe('Platform owner account', () => {
    it('uses password-manager friendly hints', () => {
        render(<AdminAccount />);

        expect(screen.getByLabelText('Contraseña actual')).toHaveAttribute('autocomplete', 'current-password');
        expect(screen.getByLabelText('Nueva contraseña')).toHaveAttribute('autocomplete', 'new-password');
        expect(screen.getByLabelText('Confirmar contraseña')).toHaveAttribute('autocomplete', 'new-password');
    });

    it('sends the new password to the account route', () => {
        render(<AdminAccount />);

        fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'vieja-123' } });
        fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'nueva-456' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

        expect(mocks.put).toHaveBeenCalledWith('/admin/account/password', expect.objectContaining({ preserveScroll: true }));
    });

    it('clears the new password and focuses it when the server rejects it', () => {
        mocks.put.mockImplementation((_url: string, options: { onError: (errors: Record<string, string>) => void }) =>
            options.onError({ password: 'Muy corta.' }),
        );
        render(<AdminAccount />);

        fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

        expect(mocks.reset).toHaveBeenCalledWith('password', 'password_confirmation');
        expect(screen.getByLabelText('Nueva contraseña')).toHaveFocus();
    });

    it('clears and focuses the current password when it is wrong', () => {
        mocks.put.mockImplementation((_url: string, options: { onError: (errors: Record<string, string>) => void }) =>
            options.onError({ current_password: 'Incorrecta.' }),
        );
        render(<AdminAccount />);

        fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

        expect(mocks.reset).toHaveBeenCalledWith('current_password');
        expect(screen.getByLabelText('Contraseña actual')).toHaveFocus();
    });

    it('confirms a successful save', () => {
        mocks.recentlySuccessful = true;
        render(<AdminAccount />);

        expect(screen.getByRole('status')).toHaveTextContent('Guardado');
    });

    it('shows validation errors next to their fields', () => {
        mocks.errors = { password_confirmation: 'No coincide.' };
        render(<AdminAccount />);

        expect(screen.getByLabelText('Confirmar contraseña')).toHaveAccessibleDescription('No coincide.');
    });
});
