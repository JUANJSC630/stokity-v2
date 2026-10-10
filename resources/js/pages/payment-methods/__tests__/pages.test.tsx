/** Characterization tests for the payment methods list, create and edit pages: pin today's behavior before the redesign. */
import { router } from '@inertiajs/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import PaymentMethodsCreate from '../create';
import PaymentMethodsEdit from '../edit';
import PaymentMethodsIndex from '../index';

const env = vi.hoisted(() => ({
    post: vi.fn(),
    put: vi.fn(),
    errors: {} as Record<string, string>,
    processing: false,
    wide: true,
}));

vi.mock('@inertiajs/react', async () => {
    const React = await import('react');
    return {
        router: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() },
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
                processing: env.processing,
                setData: (key: string, value: unknown) => setAll((previous) => ({ ...previous, [key]: value })),
                post: (url: string) => env.post(url, snapshot.current),
                put: (url: string) => env.put(url, snapshot.current),
            };
        },
    };
});
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/hooks/use-polling', () => ({ usePolling: vi.fn() }));

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
    vi.stubGlobal(
        'matchMedia',
        vi.fn().mockImplementation((query: string) => ({
            matches: env.wide,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
        })),
    );
    vi.stubGlobal('route', (name: string) => `/${name}`);
});

beforeEach(() => {
    vi.clearAllMocks();
    env.errors = {};
    env.processing = false;
    env.wide = true;
});

const method = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    name: `Método ${id}`,
    code: `code_${id}`,
    description: null,
    is_active: true,
    sort_order: id - 1,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
});

const methods = [
    method(1, { name: 'Efectivo', code: 'cash', description: 'Billetes y monedas' }),
    method(2, { name: 'Nequi', code: 'nequi', is_active: false }),
    method(3, { name: 'Tarjeta', code: 'card' }),
];

describe('Payment methods list', () => {
    it('lists every method with its code, description and state', () => {
        render(<PaymentMethodsIndex paymentMethods={methods as never} />);

        expect(screen.getAllByText('Efectivo').length).toBeGreaterThan(0);
        expect(screen.getAllByText('cash').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Billetes y monedas').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Activo').length).toBe(2);
        expect(screen.getAllByText('Inactivo').length).toBe(1);
    });

    it('says so when there are no methods', () => {
        render(<PaymentMethodsIndex paymentMethods={[]} />);

        expect(screen.getAllByText('No se encontraron métodos de pago').length).toBeGreaterThan(0);
    });

    it('links to the create page', () => {
        render(<PaymentMethodsIndex paymentMethods={methods as never} />);

        expect(screen.getByText('Nuevo Método de Pago').closest('a')).toHaveAttribute('href', '/payment-methods/create');
    });

    it('links each row to its edit page', () => {
        render(<PaymentMethodsIndex paymentMethods={methods as never} />);

        const hrefs = screen.getAllByTitle('Editar').map((button) => button.closest('a')?.getAttribute('href'));
        expect(hrefs).toEqual(['/payment-methods/1/edit', '/payment-methods/2/edit', '/payment-methods/3/edit']);
    });

    it('toggles a method optimistically and tells the server', () => {
        render(<PaymentMethodsIndex paymentMethods={methods as never} />);

        fireEvent.click(screen.getAllByTitle('Desactivar')[0]);

        expect(router.patch).toHaveBeenCalledWith('/payment-methods/1/toggle', {}, { preserveScroll: true });
        expect(screen.getAllByText('Inactivo').length).toBe(2);
    });

    it('offers to activate an inactive method', () => {
        render(<PaymentMethodsIndex paymentMethods={methods as never} />);

        fireEvent.click(screen.getByTitle('Activar'));

        expect(router.patch).toHaveBeenCalledWith('/payment-methods/2/toggle', {}, { preserveScroll: true });
    });

    it('asks before deleting and deletes only after confirming', () => {
        render(<PaymentMethodsIndex paymentMethods={methods as never} />);

        fireEvent.click(screen.getAllByTitle('Eliminar')[1]);

        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByText(/¿Estás seguro de que quieres eliminar el método de pago "Nequi"\?/)).toBeInTheDocument();
        expect(router.delete).not.toHaveBeenCalled();
        fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));
        expect(router.delete).toHaveBeenCalledWith('/payment-methods/2');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not delete when the dialog is cancelled', () => {
        render(<PaymentMethodsIndex paymentMethods={methods as never} />);

        fireEvent.click(screen.getAllByTitle('Eliminar')[0]);
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

        expect(router.delete).not.toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('reorders by dragging a row onto another and sends the new 0-based order', () => {
        render(<PaymentMethodsIndex paymentMethods={methods as never} />);

        const rows = screen.getAllByRole('row').slice(1);
        fireEvent.dragStart(rows[0]);
        fireEvent.dragOver(rows[2]);
        fireEvent.drop(rows[2]);

        expect(router.post).toHaveBeenCalledWith(
            '/payment-methods.reorder',
            {
                order: [
                    { id: 2, sort_order: 0 },
                    { id: 3, sort_order: 1 },
                    { id: 1, sort_order: 2 },
                ],
            },
            { preserveScroll: true },
        );
    });

    it('on a phone, reorders with the arrows instead of dragging, and the ends cannot move past the list', () => {
        env.wide = false;
        render(<PaymentMethodsIndex paymentMethods={methods as never} />);

        expect(screen.queryByRole('table')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Subir Efectivo' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Bajar Tarjeta' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'Bajar Efectivo' }));

        expect(router.post).toHaveBeenCalledWith(
            '/payment-methods.reorder',
            {
                order: [
                    { id: 2, sort_order: 0 },
                    { id: 1, sort_order: 1 },
                    { id: 3, sort_order: 2 },
                ],
            },
            { preserveScroll: true },
        );
    });

    it('on a phone, toggles with the switch and deletes through the same dialog', () => {
        env.wide = false;
        render(<PaymentMethodsIndex paymentMethods={methods as never} />);

        fireEvent.click(screen.getAllByRole('switch')[0]);
        expect(router.patch).toHaveBeenCalledWith('/payment-methods/1/toggle', {}, { preserveScroll: true });
        fireEvent.click(screen.getByRole('button', { name: 'Eliminar Nequi' }));
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));
        expect(router.delete).toHaveBeenCalledWith('/payment-methods/2');
    });

    it('does not reorder when a row is dropped on itself', () => {
        render(<PaymentMethodsIndex paymentMethods={methods as never} />);

        const rows = screen.getAllByRole('row').slice(1);
        fireEvent.dragStart(rows[1]);
        fireEvent.drop(rows[1]);

        expect(router.post).not.toHaveBeenCalled();
    });
});

describe('Create payment method', () => {
    const fill = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

    it('starts empty, active and with order 0', () => {
        render(<PaymentMethodsCreate />);

        expect(screen.getByLabelText(/Nombre/)).toHaveValue('');
        expect(screen.getByLabelText(/Código/)).toHaveValue('');
        expect(screen.getByLabelText('Orden de Aparición')).toHaveValue(0);
        expect(screen.getByRole('switch')).toBeChecked();
    });

    it('posts what was typed', () => {
        render(<PaymentMethodsCreate />);

        fill(/Nombre/, 'Daviplata');
        fill(/Código/, 'daviplata');
        fill('Descripción', 'Billetera');
        fill('Orden de Aparición', '4');
        fireEvent.click(screen.getByRole('switch'));
        fireEvent.click(screen.getByRole('button', { name: 'Crear Método de Pago' }));

        expect(env.post).toHaveBeenCalledWith('/payment-methods', {
            name: 'Daviplata',
            code: 'daviplata',
            description: 'Billetera',
            is_active: false,
            sort_order: 4,
        });
    });

    it('turns an invalid order into 0', () => {
        render(<PaymentMethodsCreate />);

        fill('Orden de Aparición', 'abc');

        expect(screen.getByLabelText('Orden de Aparición')).toHaveValue(0);
    });

    it('shows the server errors under each field', () => {
        env.errors = { name: 'Nombre duplicado', code: 'Código inválido', sort_order: 'Orden inválido' };
        render(<PaymentMethodsCreate />);

        expect(screen.getByText('Nombre duplicado')).toBeInTheDocument();
        expect(screen.getByText('Código inválido')).toBeInTheDocument();
        expect(screen.getByText('Orden inválido')).toBeInTheDocument();
    });

    it('disables the buttons while saving', () => {
        env.processing = true;
        render(<PaymentMethodsCreate />);

        expect(screen.getByRole('button', { name: 'Creando...' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    });

    it('goes back to the list on cancel, now through a link', () => {
        render(<PaymentMethodsCreate />);

        expect(screen.getByRole('button', { name: 'Cancelar' }).closest('a')).toHaveAttribute('href', '/payment-methods');
    });
});

describe('Edit payment method', () => {
    it('loads the method and puts the changes', () => {
        render(<PaymentMethodsEdit paymentMethod={method(7, { name: 'Efectivo', code: 'cash', description: null, sort_order: 2 }) as never} />);

        expect(screen.getByLabelText(/Nombre/)).toHaveValue('Efectivo');
        expect(screen.getByLabelText('Descripción')).toHaveValue('');
        fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Efectivo caja' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

        expect(env.put).toHaveBeenCalledWith('/payment-methods/7', {
            name: 'Efectivo caja',
            code: 'cash',
            description: '',
            is_active: true,
            sort_order: 2,
        });
    });

    it('keeps an inactive method inactive', () => {
        render(<PaymentMethodsEdit paymentMethod={method(8, { is_active: false }) as never} />);

        expect(screen.getByRole('switch')).not.toBeChecked();
    });

    it('shows the saving label and the errors', () => {
        env.processing = true;
        env.errors = { code: 'Código en uso' };
        render(<PaymentMethodsEdit paymentMethod={method(9) as never} />);

        expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled();
        expect(screen.getByText('Código en uso')).toBeInTheDocument();
    });
});
