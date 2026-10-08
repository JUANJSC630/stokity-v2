import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TenantsCreate from '../create';

const mocks = vi.hoisted(() => ({ post: vi.fn(), errors: {} as Record<string, string>, processing: false }));

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
                processing: mocks.processing,
                errors: mocks.errors,
            };
        },
    };
});

vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

beforeEach(() => {
    vi.clearAllMocks();
    mocks.errors = {};
    mocks.processing = false;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
});

describe('Create tenant form', () => {
    it('keeps the browser from filling the new admin with the platform owner details', () => {
        render(<TenantsCreate />);

        expect(screen.getByLabelText('Nombre')).toHaveAttribute('autocomplete', 'off');
        expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'off');
        expect(screen.getByLabelText('Email')).toHaveAttribute('inputmode', 'email');
        expect(screen.getByLabelText('Contraseña')).toHaveAttribute('autocomplete', 'new-password');
        expect(screen.getByLabelText('Confirmar contraseña')).toHaveAttribute('autocomplete', 'new-password');
    });

    it('does not open the keyboard on phones', () => {
        render(<TenantsCreate />);

        expect(screen.getByLabelText('Nombre del negocio')).not.toHaveFocus();
    });

    it('submits the typed values to the tenants route', () => {
        render(<TenantsCreate />);

        fireEvent.change(screen.getByLabelText('Nombre del negocio'), { target: { value: 'Café Central' } });
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@cafe.test' } });
        fireEvent.click(screen.getByRole('button', { name: 'Crear negocio' }));

        expect(mocks.post).toHaveBeenCalledWith('/admin/tenants');
    });

    it('shows validation errors next to their fields', () => {
        mocks.errors = { business_name: 'El nombre es obligatorio.', admin_email: 'El correo ya está en uso.' };
        render(<TenantsCreate />);

        expect(screen.getByLabelText('Nombre del negocio')).toHaveAccessibleDescription('El nombre es obligatorio.');
        expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('El correo ya está en uso.');
    });

    it('disables the button while saving', () => {
        mocks.processing = true;
        render(<TenantsCreate />);

        expect(screen.getByRole('button', { name: 'Crear negocio' })).toBeDisabled();
    });
});
