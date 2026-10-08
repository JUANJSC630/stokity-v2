import { router, usePage } from '@inertiajs/react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import TenantShow from '../show';

const mocks = vi.hoisted(() => ({ post: vi.fn(), put: vi.fn() }));

vi.mock('@inertiajs/react', async () => {
    const { useState } = await import('react');

    return {
        router: { post: vi.fn(), delete: vi.fn(), visit: vi.fn() },
        Head: () => null,
        Link: 'a',
        usePage: vi.fn(() => ({ props: { flash: {} } })),
        useForm: (initial: Record<string, unknown>) => {
            const [data, setState] = useState(initial);

            return {
                data,
                setData: (key: string, value: unknown) => setState((current) => ({ ...current, [key]: value })),
                post: mocks.post,
                put: mocks.put,
                processing: false,
                errors: {},
                reset: vi.fn(),
                clearErrors: vi.fn(),
            };
        },
    };
});

vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

const NOW = new Date('2026-10-08T12:00:00Z');

const baseProps = {
    tenant: {
        id: 7,
        name: 'Lu Accesorios',
        slug: 'lu-accesorios',
        status: 'active',
        plan: 'Pro',
        created_at: '2026-03-02T10:00:00Z',
        trial_ends_at: '2026-10-10T12:00:00Z',
        can_impersonate: true,
    },
    metrics: { users_count: 3, products_count: 312, sales_count: 1840 },
    users: [
        { id: 1, name: 'Ana Admin', email: 'ana@lu.test', role: 'administrador', status: true, last_login_at: '2026-10-08T09:00:00Z' },
        { id: 2, name: 'Laura Inactiva', email: 'laura@lu.test', role: 'encargado', status: false, last_login_at: null },
    ],
    branches: [{ id: 1, name: 'Principal', status: true }],
    apiKeys: [
        {
            id: 11,
            name: 'Storefront',
            key_prefix: 'stk_live_a1b2',
            can_manage_media: true,
            can_generate_order_references: false,
            last_used_at: '2026-10-08T07:00:00Z',
            revoked_at: null,
            created_at: '2026-09-01T10:00:00Z',
        },
        {
            id: 12,
            name: 'Antigua',
            key_prefix: 'stk_live_zzzz',
            can_manage_media: false,
            can_generate_order_references: false,
            last_used_at: null,
            revoked_at: '2026-09-20T10:00:00Z',
            created_at: '2026-01-01T10:00:00Z',
        },
    ],
};

function renderPage(overrides: Partial<typeof baseProps> = {}) {
    return render(<TenantShow {...baseProps} {...overrides} />);
}

function setFlash(flash: Record<string, string>) {
    vi.mocked(usePage).mockReturnValue({ props: { flash } } as unknown as ReturnType<typeof usePage>);
}

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', NoopObserver);
    vi.stubGlobal('ResizeObserver', NoopObserver);
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
    setFlash({});
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

describe('Admin tenant detail', () => {
    it('shows the business status, last activity and remaining trial, without product or sales counts', () => {
        renderPage();

        expect(screen.getByRole('heading', { level: 1, name: 'Lu Accesorios' })).toBeInTheDocument();
        expect(screen.getAllByText('Activo hace 3 h').length).toBeGreaterThan(0);
        expect(screen.getAllByText('2 días restantes').length).toBeGreaterThan(0);
        expect(screen.queryByText('Productos')).not.toBeInTheDocument();
        expect(screen.queryByText('Ventas')).not.toBeInTheDocument();
        expect(screen.queryByText('312')).not.toBeInTheDocument();
    });

    it('reports no activity when no user has ever signed in', () => {
        renderPage({ users: [{ ...baseProps.users[1] }] });

        expect(screen.getAllByText('Sin actividad').length).toBeGreaterThan(0);
    });

    it('lists the users with their last access in the phone list', () => {
        renderPage();

        const list = screen.getByRole('list', { name: '2 usuario(s)' });
        expect(within(list).getByText('Ana Admin')).toBeInTheDocument();
        expect(within(list).getByText('Último acceso hace 3 h')).toBeInTheDocument();
        expect(within(list).getByText('Nunca ha ingresado')).toBeInTheDocument();
        expect(within(list).getByText('Inactivo')).toBeInTheDocument();
    });

    it('explains why users cannot be entered when the business is not active', () => {
        renderPage({ tenant: { ...baseProps.tenant, status: 'suspended', can_impersonate: false } });

        expect(screen.getByText('El negocio debe estar activo para entrar como uno de sus usuarios.')).toBeInTheDocument();
        screen.getAllByRole('button', { name: 'Entrar' }).forEach((button) => expect(button).toBeDisabled());
    });

    it('does not offer to enter as an inactive user', () => {
        renderPage();

        const enterButtons = screen.getAllByRole('button', { name: 'Entrar' });
        expect(enterButtons[0]).toBeEnabled();
        expect(enterButtons[1]).toBeDisabled();
    });

    it('resets a password only after confirming', () => {
        renderPage();

        fireEvent.click(screen.getAllByRole('button', { name: 'Restablecer' })[0]);
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveTextContent('Ana Admin');
        expect(router.post).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));

        expect(router.post).toHaveBeenCalledWith('/admin/tenants/7/users/1/reset-password', {}, expect.objectContaining({ preserveScroll: true }));
    });

    it('asks for the password before entering as a user', () => {
        renderPage();

        fireEvent.click(screen.getAllByRole('button', { name: 'Entrar' })[0]);
        const dialog = screen.getByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText('Confirma tu contraseña'), { target: { value: 'secreto-123' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));

        expect(mocks.post).toHaveBeenCalledWith('/admin/tenants/7/users/1/impersonate', expect.any(Object));
    });

    it('shows revoked API keys as revoked and lets an active one be revoked after confirming', () => {
        renderPage();

        expect(screen.getByText(/Revocada/)).toBeInTheDocument();

        fireEvent.click(document.querySelector('button[data-tone="danger"]') as HTMLElement);
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveTextContent('«Storefront»');
        expect(router.delete).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Revocar' }));

        expect(router.delete).toHaveBeenCalledWith('/admin/tenants/7/api-keys/11', expect.objectContaining({ preserveScroll: true }));
    });

    it('edits the business from the dialog', () => {
        renderPage();

        fireEvent.click(screen.getByRole('button', { name: /Editar datos del negocio/ }));
        const dialog = screen.getByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText('Nombre'), { target: { value: 'Lu Boutique' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));

        expect(mocks.put).toHaveBeenCalledWith('/admin/tenants/7', expect.any(Object));
    });

    it('keeps the temporary password open until the user is done', () => {
        const { rerender } = renderPage();

        fireEvent.click(screen.getAllByRole('button', { name: 'Restablecer' })[0]);
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }));

        setFlash({ temporaryPassword: 'Tmp-Pass-42' });
        rerender(<TenantShow {...baseProps} />);

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveTextContent('Tmp-Pass-42');

        fireEvent.keyDown(dialog, { key: 'Escape' });
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Listo' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('keeps the generated API key open until the user is done, and can copy it', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
        const { rerender } = renderPage();

        setFlash({ plainApiKey: 'stk_live_SECRET_VALUE' });
        rerender(<TenantShow {...baseProps} />);

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveTextContent('stk_live_SECRET_VALUE');

        fireEvent.keyDown(dialog, { key: 'Escape' });
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Copiar API key' }));
        });
        expect(writeText).toHaveBeenCalledWith('stk_live_SECRET_VALUE');

        fireEvent.click(screen.getByRole('button', { name: 'Listo' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
