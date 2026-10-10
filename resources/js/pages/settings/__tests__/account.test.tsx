/** Characterization tests for the settings layout and the profile, password, appearance and modules pages: pin today's behavior before the redesign. */
import SettingsLayout from '@/layouts/settings/layout';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Appearance from '../appearance';
import ModuleSettings from '../modules';
import Password from '../password';
import Profile from '../profile';

const env = vi.hoisted(() => ({
    post: vi.fn(),
    put: vi.fn(),
    reset: vi.fn(),
    setError: vi.fn(),
    clearErrors: vi.fn(),
    errors: {} as Record<string, string>,
    processing: false,
    recentlySuccessful: false,
    permissions: [] as string[],
    user: { id: 1, name: 'Juan Pérez', email: 'juan@lu.co', photo_url: '/storage/j.png', email_verified_at: '2026-01-01' } as Record<string, unknown>,
    business: { brand_color: '#C4686F', brand_color_secondary: '#112233', default_product_image_url: null } as Record<string, unknown>,
}));

vi.mock('@inertiajs/react', async () => {
    const React = await import('react');
    return {
        router: { get: vi.fn(), visit: vi.fn() },
        Head: () => null,
        Link: ({ children, href, ...rest }: { children: ReactNode; href: string }) => (
            <a href={href} {...(rest as object)}>
                {children}
            </a>
        ),
        usePage: () => ({ props: { auth: { user: env.user, permissions: env.permissions }, business: env.business } }),
        useForm: (initial: Record<string, unknown>) => {
            const [data, setAll] = React.useState(initial);
            const snapshot = React.useRef(data);
            snapshot.current = data;
            return {
                data,
                errors: env.errors,
                processing: env.processing,
                recentlySuccessful: env.recentlySuccessful,
                setData: (key: string, value: unknown) => setAll((previous) => ({ ...previous, [key]: value })),
                setError: env.setError,
                clearErrors: env.clearErrors,
                reset: (...fields: string[]) => env.reset(...fields),
                post: (url: string, options?: unknown) => env.post(url, options, snapshot.current),
                put: (url: string, options?: unknown) => env.put(url, options, snapshot.current),
            };
        },
    };
});
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/lib/image-upload', () => ({ prepareImageForUpload: vi.fn(async (file: File) => file) }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
    vi.stubGlobal('route', (name: string) => `/${name}`);
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
    env.errors = {};
    env.processing = false;
    env.recentlySuccessful = false;
    env.permissions = [];
    env.user = { id: 1, name: 'Juan Pérez', email: 'juan@lu.co', photo_url: '/storage/j.png', email_verified_at: '2026-01-01' };
    env.business = { brand_color: '#C4686F', brand_color_secondary: '#112233', default_product_image_url: null };
    window.history.replaceState({}, '', '/settings/profile');
});

const navLabels = () => screen.getAllByRole('link').map((link) => link.textContent);

describe('Settings layout', () => {
    it('always offers profile, password and appearance', () => {
        render(<SettingsLayout>contenido</SettingsLayout>);

        expect(navLabels()).toEqual(['Perfil', 'Contraseña', 'Apariencia']);
        expect(screen.getByText('contenido')).toBeInTheDocument();
        expect(screen.getByText('Configuración')).toBeInTheDocument();
    });

    it('adds the business group, roles and modules only with their permissions', () => {
        env.permissions = ['settings.business.view', 'settings.roles.manage', 'settings.modules.manage'];
        render(<SettingsLayout>x</SettingsLayout>);

        expect(navLabels()).toEqual(['Perfil', 'Contraseña', 'Apariencia', 'Negocio', 'Impresora', 'Ticket', 'Roles', 'Módulos']);
    });

    it('links each entry to its settings page and marks the current one', () => {
        env.permissions = ['settings.business.view'];
        window.history.replaceState({}, '', '/settings/printer');
        render(<SettingsLayout>x</SettingsLayout>);

        expect(screen.getByText('Impresora').closest('a')).toHaveAttribute('href', '/settings/printer');
        expect(screen.getByText('Impresora').closest('a')?.className).toContain('bg-muted');
        expect(screen.getByText('Perfil').closest('a')?.className).not.toContain('bg-muted');
    });
});

describe('Settings layout navigation (redesign)', () => {
    it('is a labelled navigation that marks the current page for assistive tech', () => {
        window.history.replaceState({}, '', '/settings/password');
        render(<SettingsLayout>x</SettingsLayout>);

        const nav = screen.getByRole('navigation', { name: 'Secciones de configuración' });
        expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe('Contraseña');
        expect(nav.querySelectorAll('[aria-current]').length).toBe(1);
    });
});

describe('Profile', () => {
    it('loads the user, with the current photo', () => {
        render(<Profile mustVerifyEmail={false} />);

        expect(screen.getByLabelText('Nombre')).toHaveValue('Juan Pérez');
        expect(screen.getByLabelText('Correo electrónico')).toHaveValue('juan@lu.co');
        expect(screen.getByAltText('Juan Pérez')).toHaveAttribute('src', '/storage/j.png');
    });

    it('falls back to the app icon when the user has no photo', () => {
        env.user = { ...env.user, photo_url: undefined };
        render(<Profile mustVerifyEmail={false} />);

        expect(screen.getByAltText('Juan Pérez')).toHaveAttribute('src', '/stokity-icon.png');
    });

    it('posts the changes as form data with the PATCH override', () => {
        render(<Profile mustVerifyEmail={false} />);

        fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Juan P.' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        expect(env.post).toHaveBeenCalledWith(
            '/profile.update',
            expect.objectContaining({ forceFormData: true, preserveScroll: true }),
            expect.objectContaining({ name: 'Juan P.', email: 'juan@lu.co', photo: null, _method: 'PATCH' }),
        );
    });

    it('previews a picked photo and shows its size', async () => {
        render(<Profile mustVerifyEmail={false} />);
        const file = new File([new Uint8Array(2048)], 'foto.png', { type: 'image/png' });

        fireEvent.change(screen.getByLabelText('Cambiar foto'), { target: { files: [file] } });

        await waitFor(() => expect(screen.getByText('2.0 KB')).toBeInTheDocument());
        expect(env.clearErrors).toHaveBeenCalledWith('photo');
        expect(env.setError).not.toHaveBeenCalled();
    });

    it('rejects a photo over 4 MB, with a message that says 2 MB (a copy mismatch)', async () => {
        render(<Profile mustVerifyEmail={false} />);
        const big = new File([new Uint8Array(5 * 1024 * 1024)], 'grande.png', { type: 'image/png' });

        fireEvent.change(screen.getByLabelText('Cambiar foto'), { target: { files: [big] } });

        await waitFor(() => expect(env.setError).toHaveBeenCalledWith('photo', 'El archivo no debe pesar más de 2MB'));
        expect(screen.getByText('JPG, PNG, GIF, WebP. Máx 4MB')).toBeInTheDocument();
    });

    it('does not post when the chosen photo is too big', async () => {
        render(<Profile mustVerifyEmail={false} />);
        const big = new File([new Uint8Array(5 * 1024 * 1024)], 'grande.png', { type: 'image/png' });
        fireEvent.change(screen.getByLabelText('Cambiar foto'), { target: { files: [big] } });
        await waitFor(() => expect(env.setError).toHaveBeenCalled());

        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        expect(env.post).not.toHaveBeenCalled();
    });

    it('offers to resend the verification email only when it must be verified and is not', () => {
        env.user = { ...env.user, email_verified_at: null };
        const { unmount } = render(<Profile mustVerifyEmail status="verification-link-sent" />);
        expect(screen.getByText('Tu correo electrónico no está verificado.', { exact: false })).toBeInTheDocument();
        expect(screen.getByText('Se ha enviado un nuevo enlace de verificación a tu correo electrónico.')).toBeInTheDocument();
        unmount();

        render(<Profile mustVerifyEmail={false} />);
        expect(screen.queryByText('Tu correo electrónico no está verificado.', { exact: false })).not.toBeInTheDocument();
    });

    it('shows the field errors and "Guardado" after saving', () => {
        env.errors = { name: 'Nombre requerido', email: 'Email inválido' };
        env.recentlySuccessful = true;
        render(<Profile mustVerifyEmail={false} />);

        expect(screen.getByText('Nombre requerido')).toBeInTheDocument();
        expect(screen.getByText('Email inválido')).toBeInTheDocument();
        expect(screen.getByText('Guardado')).toBeInTheDocument();
    });
});

describe('Password', () => {
    it('puts the three fields to the password route', () => {
        render(<Password />);

        fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'vieja' } });
        fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'nueva123' } });
        fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'nueva123' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

        expect(env.put).toHaveBeenCalledWith('/password.update', expect.objectContaining({ preserveScroll: true }), {
            current_password: 'vieja',
            password: 'nueva123',
            password_confirmation: 'nueva123',
        });
    });

    it('clears the form after saving', () => {
        env.put.mockImplementation((_url, options) => (options as { onSuccess: () => void }).onSuccess());
        render(<Password />);

        fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

        expect(env.reset).toHaveBeenCalledWith();
    });

    it('clears only the new passwords when the new one is rejected, and only the current one when that is wrong', () => {
        env.put.mockImplementation((_url, options) =>
            (options as { onError: (e: Record<string, string>) => void }).onError({ password: 'Muy corta' }),
        );
        const { unmount } = render(<Password />);
        fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
        expect(env.reset).toHaveBeenCalledWith('password', 'password_confirmation');
        unmount();

        env.reset.mockClear();
        env.put.mockImplementation((_url, options) =>
            (options as { onError: (e: Record<string, string>) => void }).onError({ current_password: 'Incorrecta' }),
        );
        render(<Password />);
        fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
        expect(env.reset).toHaveBeenCalledWith('current_password');
    });

    it('shows the errors, the saved note and disables the button while saving', () => {
        env.errors = { current_password: 'Incorrecta', password: 'Muy corta', password_confirmation: 'No coincide' };
        env.recentlySuccessful = true;
        env.processing = true;
        render(<Password />);

        for (const message of ['Incorrecta', 'Muy corta', 'No coincide', 'Guardado']) {
            expect(screen.getByText(message)).toBeInTheDocument();
        }
        expect(screen.getByRole('button', { name: 'Guardar contraseña' })).toBeDisabled();
    });
});

describe('Appearance', () => {
    it('offers the theme to everybody but the business settings only with the permission', () => {
        const { unmount } = render(<Appearance />);
        expect(screen.getByText('Light')).toBeInTheDocument();
        expect(screen.queryByText('Colores del sistema')).not.toBeInTheDocument();
        expect(screen.queryByText('Imagen por defecto')).not.toBeInTheDocument();
        unmount();

        env.permissions = ['settings.appearance.update'];
        render(<Appearance />);
        expect(screen.getByText('Colores del sistema')).toBeInTheDocument();
        expect(screen.getByText('Imagen por defecto')).toBeInTheDocument();
    });

    it('starts from the brand colors and falls back to the neutral ones', () => {
        env.permissions = ['settings.appearance.update'];
        env.business = { brand_color: null, brand_color_secondary: null };
        render(<Appearance />);

        expect(screen.getByText('#3F3F46')).toBeInTheDocument();
        expect(screen.getByText('#A1A1AA')).toBeInTheDocument();
    });

    it('posts the picked colors and says so', () => {
        env.permissions = ['settings.appearance.update'];
        env.post.mockImplementation((_url, options) => (options as { onSuccess?: () => void }).onSuccess?.());
        const { container } = render(<Appearance />);

        fireEvent.change(container.querySelectorAll('input[type="color"]')[0], { target: { value: '#ff0000' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar colores' }));

        expect(env.post).toHaveBeenCalledWith('/appearance.brand-colors', expect.objectContaining({ preserveScroll: true }), {
            brand_color: '#ff0000',
            brand_color_secondary: '#112233',
        });
        expect(toast.success).toHaveBeenCalledWith('Colores actualizados.');
    });

    it('keeps the image button off until a file is picked, then uploads it as form data', async () => {
        env.permissions = ['settings.appearance.update'];
        render(<Appearance />);
        const submit = screen.getByRole('button', { name: 'Cambiar imagen por defecto' });
        expect(submit).toBeDisabled();

        const file = new File(['x'], 'p.png', { type: 'image/png' });
        fireEvent.change(screen.getByLabelText('Subir imagen'), { target: { files: [file] } });
        await waitFor(() => expect(screen.getByAltText('Vista previa')).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: 'Cambiar imagen por defecto' }));

        const call = env.post.mock.calls.find(([url]) => url === '/appearance.default-product-image');
        expect(call?.[1]).toMatchObject({ forceFormData: true });
        expect(call?.[2]).toEqual({ image: file });
    });

    it('shows the current default image when there is one', () => {
        env.permissions = ['settings.appearance.update'];
        env.business = { ...env.business, default_product_image_url: '/img/default.png' };
        render(<Appearance />);

        expect(screen.getByAltText('Imagen por defecto actual')).toHaveAttribute('src', '/img/default.png');
    });
});

describe('Modules', () => {
    it('lists the four modules with their state, on unless said otherwise', () => {
        render(<ModuleSettings moduleConfig={{ credits: false, suppliers: true }} />);

        expect(screen.getAllByRole('switch').length).toBe(4);
        expect(screen.getByLabelText('Créditos')).not.toBeChecked();
        expect(screen.getByLabelText('Proveedores')).toBeChecked();
        expect(screen.getByLabelText('Finanzas')).toBeChecked();
        expect(screen.getByLabelText('Mayorista')).toBeChecked();
    });

    it('posts the changed modules', () => {
        render(<ModuleSettings moduleConfig={{ credits: true }} />);

        fireEvent.click(screen.getByLabelText('Mayorista'));
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

        expect(env.post).toHaveBeenCalledWith('/settings.modules.update', { preserveScroll: true }, { modules: { credits: true, wholesale: false } });
    });

    it('locks the switches and shows the saving label while saving', () => {
        env.processing = true;
        render(<ModuleSettings moduleConfig={{}} />);

        expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled();
        expect(screen.getByLabelText('Créditos')).toBeDisabled();
    });
});
