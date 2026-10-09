import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PermissionMatrix, type PermissionsByModule } from '../permission-matrix';

const catalog: PermissionsByModule = {
    sales: {
        'sales.view': { module: 'sales', label: 'Ver ventas' },
        'sales.delete': { module: 'sales', label: 'Eliminar ventas', requires: ['sales.view'] },
        'sales.export': { module: 'sales', label: 'Exportar ventas', requires: ['sales.view', 'reports.view'] },
    },
    reports: {
        'reports.view': { module: 'reports', label: 'Ver reportes' },
        'reports.cost': { module: 'reports', label: 'Ver costos', type: 'field', requires: ['reports.view'] },
    },
};

function Harness({ initial = [], disabled = false }: { initial?: string[]; disabled?: boolean }) {
    const [selected, setSelected] = useState(new Set(initial));

    return (
        <>
            <PermissionMatrix permissionsByModule={catalog} selected={selected} onChange={setSelected} disabled={disabled} />
            <output data-testid="selected">{[...selected].sort().join(',')}</output>
        </>
    );
}

const header = (label: string) => within(screen.getByRole('heading', { name: new RegExp(label) })).getByRole('button');
const selected = () => screen.getByTestId('selected').textContent;
const phone = (width: number) => Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });

beforeEach(() => phone(1024));
afterEach(() => phone(1024));

describe('PermissionMatrix', () => {
    it('groups permissions by module with a selected counter', () => {
        render(<Harness initial={['sales.view']} />);

        expect(header('Ventas')).toHaveTextContent('1/3');
        expect(header('Reportes')).toHaveTextContent('0/2');
    });

    it('shows every module open on large screens', () => {
        render(<Harness />);

        expect(header('Ventas')).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByLabelText('Ver ventas')).toBeInTheDocument();
    });

    it('starts with empty modules collapsed on phones and opens the ones that already hold a permission', () => {
        phone(390);
        render(<Harness initial={['reports.view']} />);

        expect(header('Ventas')).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByLabelText('Ver ventas')).not.toBeInTheDocument();
        expect(header('Reportes')).toHaveAttribute('aria-expanded', 'true');
    });

    it('expands and collapses a module', () => {
        phone(390);
        render(<Harness />);

        fireEvent.click(header('Ventas'));
        expect(screen.getByLabelText('Ver ventas')).toBeInTheDocument();

        fireEvent.click(header('Ventas'));
        expect(screen.queryByLabelText('Ver ventas')).not.toBeInTheDocument();
    });

    it('checks the prerequisites of a permission', () => {
        render(<Harness />);

        fireEvent.click(screen.getByLabelText(/Eliminar ventas/));

        expect(selected()).toBe('sales.delete,sales.view');
    });

    it('unchecking a prerequisite also unchecks what depends on it', () => {
        render(<Harness initial={['sales.view', 'sales.delete']} />);

        fireEvent.click(screen.getByLabelText('Ver ventas'));

        expect(selected()).toBe('');
    });

    it('selects a whole module together with prerequisites from other modules', () => {
        render(<Harness />);

        fireEvent.click(screen.getByRole('button', { name: 'Seleccionar todos los permisos de Ventas' }));

        expect(selected()).toBe('reports.view,sales.delete,sales.export,sales.view');
    });

    it('clears a whole module and whatever depended on it', () => {
        render(<Harness initial={['reports.view', 'reports.cost', 'sales.view', 'sales.export']} />);

        fireEvent.click(screen.getByRole('button', { name: 'Quitar todos los permisos de Reportes' }));

        expect(selected()).toBe('sales.view');
    });

    it('explains a missing prerequisite on a checked permission', () => {
        render(<Harness initial={['sales.export']} />);

        expect(screen.getByText(/requiere: sales.view, reports.view/)).toBeInTheDocument();
    });

    it('does not change anything when disabled', () => {
        render(<Harness disabled />);

        expect(screen.getByLabelText('Ver ventas')).toBeDisabled();
        expect(
            within(header('Ventas').closest('section') as HTMLElement).getByRole('button', {
                name: /Seleccionar todos/,
            }),
        ).toBeDisabled();
    });
});
