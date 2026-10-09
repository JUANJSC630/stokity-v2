import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import WholesaleOrderForm from '../WholesaleOrderForm';

vi.mock('@inertiajs/react', () => ({
    router: { post: vi.fn(), put: vi.fn(), reload: vi.fn() },
    usePage: vi.fn(() => ({ props: { business: { brand_color: '#C4686F' } } })),
}));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/components/PaymentMethodSelect', () => ({ default: () => null }));
vi.mock('@/components/clients', () => ({ CardCreateClient: () => null }));

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
            matches: false,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
        })),
    );
});

const initialValues = {
    branch_id: '1',
    client_id: '',
    payment_method: '',
    date: '2026-10-09',
    notes: '',
    estimated_cost: 0,
    items: [
        { description: 'Primero', quantity: 1, unit_price: 1000 },
        { description: 'Segundo', quantity: 1, unit_price: 1000 },
    ],
};

function renderForm() {
    render(<WholesaleOrderForm clients={[]} branches={[]} initialValues={initialValues} submitUrl="/x" submitMethod="post" submitLabel="Guardar" />);
    return screen.getAllByPlaceholderText('1') as HTMLInputElement[];
}

describe('WholesaleOrderForm quantity input', () => {
    it('lets the user clear the field and type a new quantity on any line', () => {
        const [first] = renderForm();

        fireEvent.change(first, { target: { value: '' } });
        expect(first.value).toBe('');

        fireEvent.change(first, { target: { value: '5' } });
        expect(first.value).toBe('5');
        expect(screen.getAllByText('$ 5.000').length).toBeGreaterThan(0);
    });

    it('lets the user append digits to the current quantity', () => {
        const [first] = renderForm();

        fireEvent.change(first, { target: { value: '12' } });

        expect(first.value).toBe('12');
    });

    it('normalizes an empty or zero quantity to 1 on blur', () => {
        const [first] = renderForm();

        fireEvent.change(first, { target: { value: '' } });
        fireEvent.blur(first);
        expect(first.value).toBe('1');

        fireEvent.change(first, { target: { value: '0' } });
        fireEvent.blur(first);
        expect(first.value).toBe('1');
    });
});
