import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import ConfirmPassword from '../confirm-password';
import VerifyEmail from '../verify-email';

const env = vi.hoisted(() => ({
    post: vi.fn(),
    reset: vi.fn(),
    errors: {} as Record<string, string>,
    processing: false,
}));

vi.mock('@inertiajs/react', async () => {
    const React = await import('react');
    return {
        Head: () => null,
        Link: ({ children, href, method }: { children: ReactNode; href: string; method?: string }) => (
            <a href={href} data-method={method}>
                {children}
            </a>
        ),
        useForm: (initial: Record<string, unknown>) => {
            const [data, setAll] = React.useState(initial);
            return {
                data,
                errors: env.errors,
                processing: env.processing,
                setData: (key: string, value: unknown) => setAll((previous) => ({ ...previous, [key]: value })),
                reset: env.reset,
                post: (url: string, options?: unknown) => env.post(url, options, data),
            };
        },
    };
});
vi.mock('@/layouts/auth-layout', () => ({
    default: ({ children, description }: { children: ReactNode; description?: string }) => (
        <div>
            <p>{description}</p>
            {children}
        </div>
    ),
}));

beforeAll(() => {
    vi.stubGlobal('route', (name: string) => `/${name}`);
});

beforeEach(() => {
    vi.clearAllMocks();
    env.post.mockReset();
    env.errors = {};
    env.processing = false;
});

describe('Confirm password', () => {
    it('asks for the password in Spanish and posts it to the confirm route', () => {
        render(<ConfirmPassword />);

        expect(screen.getByText('Esta es un área segura. Confirma tu contraseña antes de continuar.')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreto' } });
        fireEvent.click(screen.getByRole('button', { name: /Confirmar contraseña/ }));

        expect(env.post).toHaveBeenCalledWith('/password.confirm', expect.any(Object), { password: 'secreto' });
    });

    it('clears the password once the request finishes', () => {
        env.post.mockImplementation((_url, options) => (options as { onFinish: () => void }).onFinish());
        render(<ConfirmPassword />);

        fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreto' } });
        fireEvent.click(screen.getByRole('button', { name: /Confirmar contraseña/ }));

        expect(env.reset).toHaveBeenCalledWith('password');
    });

    it('can show and hide the password', () => {
        render(<ConfirmPassword />);

        expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password');
        fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
        expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'text');
        fireEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
        expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password');
    });

    it('shows the error and disables the button while sending', () => {
        env.errors = { password: 'Contraseña incorrecta' };
        env.processing = true;
        render(<ConfirmPassword />);

        expect(screen.getByText('Contraseña incorrecta')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Confirmar contraseña/ })).toBeDisabled();
    });
});

describe('Verify email', () => {
    it('explains what to do and offers to resend', () => {
        render(<VerifyEmail />);

        expect(screen.getByText('Verifica tu correo haciendo clic en el enlace que acabamos de enviarte.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Reenviar correo de verificación/ }));

        expect(env.post).toHaveBeenCalledWith('/verification.send', undefined, {});
    });

    it('says a new link was sent', () => {
        render(<VerifyEmail status="verification-link-sent" />);

        expect(screen.getByText('Enviamos un nuevo enlace de verificación al correo con el que te registraste.')).toBeInTheDocument();
    });

    it('does not say that for any other status', () => {
        render(<VerifyEmail status="otro" />);

        expect(screen.queryByText(/Enviamos un nuevo enlace/)).not.toBeInTheDocument();
    });

    it('lets the user log out with a POST', () => {
        render(<VerifyEmail />);

        const logout = screen.getByText('Cerrar sesión').closest('a');
        expect(logout).toHaveAttribute('href', '/logout');
        expect(logout).toHaveAttribute('data-method', 'post');
    });

    it('disables the resend button while sending', () => {
        env.processing = true;
        render(<VerifyEmail />);

        expect(screen.getByRole('button', { name: /Reenviar correo de verificación/ })).toBeDisabled();
    });
});
