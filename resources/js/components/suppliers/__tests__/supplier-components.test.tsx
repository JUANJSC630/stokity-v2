import { router } from '@inertiajs/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SupplierForm, type SupplierFormData } from '../supplier-form';
import { SupplierAvatar, SupplierStatusPill, SupplierTable } from '../supplier-list';

vi.mock('@inertiajs/react', () => ({
    Link: 'a',
    router: { visit: vi.fn() },
    usePage: () => ({ props: { business: { brand_color: '#C4686F' } } }),
}));
vi.mock('@/components/ui/select', () => ({
    Select: ({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children: React.ReactNode }) => (
        <select value={value} onChange={(e) => onValueChange?.(e.target.value)}>
            {children}
        </select>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{children}</option>,
}));

const text = (node: HTMLElement) => (node.textContent ?? '').replace(/\s/g, ' ');

const supplier = (overrides: Record<string, unknown> = {}) =>
    ({
        id: 3,
        branch_id: 1,
        name: 'Cueros y Perlas SAS',
        nit: '900123',
        contact_name: 'Juan Pérez',
        phone: '3101234567',
        email: 'ventas@cueros.co',
        status: true,
        branch: { id: 1, name: 'Centro' },
        ...overrides,
    }) as never;

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
    vi.stubGlobal('route', (name: string, id?: number) => `/${name}${id ? `/${id}` : ''}`);
});

beforeEach(() => vi.clearAllMocks());

describe('supplier list pieces', () => {
    it('draws the initials of the name and names the state', () => {
        const { container, rerender } = render(<SupplierAvatar name="Cueros y Perlas" />);
        expect(container).toHaveTextContent('CY');

        rerender(<SupplierStatusPill active={false} />);
        expect(screen.getByText('Inactivo')).toBeInTheDocument();
        rerender(<SupplierStatusPill active />);
        expect(screen.getByText('Activo')).toBeInTheDocument();
    });

    it('opens a supplier from its row, but not from the phone link or the view link', () => {
        render(<SupplierTable suppliers={[supplier()]} showBranch={false} />);

        const phone = screen.getByRole('link', { name: '3101234567' });
        phone.addEventListener('click', (event) => event.preventDefault());
        fireEvent.click(phone);
        expect(phone).toHaveAttribute('href', 'tel:3101234567');
        expect(router.visit).not.toHaveBeenCalled();

        fireEvent.click(within(screen.getByRole('table')).getByText('900123'));
        expect(router.visit).toHaveBeenCalledWith('/suppliers.show/3');
    });

    it('shows the branch column only when asked and dashes for missing data', () => {
        const { rerender } = render(<SupplierTable suppliers={[supplier()]} showBranch={false} />);
        expect(screen.queryByRole('columnheader', { name: 'Sucursal' })).not.toBeInTheDocument();

        rerender(<SupplierTable suppliers={[supplier({ nit: null, phone: null, email: null, contact_name: null, branch: null })]} showBranch />);
        expect(screen.getByRole('columnheader', { name: 'Sucursal' })).toBeInTheDocument();
        expect(text(screen.getAllByRole('row')[1]).match(/—/g)?.length).toBe(5);
    });
});

describe('supplier form', () => {
    const base: SupplierFormData = {
        branch_id: '1',
        name: '',
        nit: '',
        contact_name: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        status: true,
    };
    const renderForm = (overrides: Partial<Parameters<typeof SupplierForm>[0]> = {}) => {
        const setData = vi.fn();
        const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
        render(
            <SupplierForm
                data={base}
                errors={{}}
                setData={setData}
                processing={false}
                branches={[{ id: 1, name: 'Centro' }] as never}
                submitLabel="Guardar Proveedor"
                cancelHref="/suppliers"
                onSubmit={onSubmit}
                {...overrides}
            />,
        );
        return { setData, onSubmit };
    };

    it('reports every typed field and the state switch', () => {
        const { setData } = renderForm();

        fireEvent.change(document.getElementById('name') as HTMLInputElement, { target: { value: 'Cueros' } });
        fireEvent.change(document.getElementById('phone') as HTMLInputElement, { target: { value: '310' } });
        fireEvent.click(screen.getByRole('switch', { name: 'Proveedor activo' }));

        expect(setData).toHaveBeenCalledWith('name', 'Cueros');
        expect(setData).toHaveBeenCalledWith('phone', '310');
        expect(setData).toHaveBeenCalledWith('status', false);
    });

    it('submits, links back with Cancelar and disables the save while processing', () => {
        const { onSubmit } = renderForm({ processing: true });

        expect(screen.getByRole('button', { name: /Guardar Proveedor/ })).toBeDisabled();
        fireEvent.submit(document.querySelector('form') as HTMLFormElement);
        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('link', { name: 'Cancelar' })).toHaveAttribute('href', '/suppliers');
    });

    it('asks for the branch only with several, and shows the server errors', () => {
        const { rerender } = render(
            <SupplierForm
                data={base}
                errors={{ name: 'Obligatorio.', branch_id: 'Elige una sucursal.' }}
                setData={vi.fn()}
                processing={false}
                branches={
                    [
                        { id: 1, name: 'Centro' },
                        { id: 2, name: 'Norte' },
                    ] as never
                }
                submitLabel="Guardar"
                cancelHref="/suppliers"
                onSubmit={vi.fn()}
            />,
        );

        expect(screen.getByRole('combobox')).toBeInTheDocument();
        expect(screen.getByText('Obligatorio.')).toBeInTheDocument();
        expect(screen.getByText('Elige una sucursal.')).toBeInTheDocument();

        rerender(
            <SupplierForm
                data={base}
                errors={{}}
                setData={vi.fn()}
                processing={false}
                branches={[{ id: 1, name: 'Centro' }] as never}
                submitLabel="Guardar"
                cancelHref="/suppliers"
                onSubmit={vi.fn()}
            />,
        );
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });
});
