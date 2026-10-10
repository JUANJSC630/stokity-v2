import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoryConfirmDialog, CategoryNameDialog } from '../category-dialogs';
import { CategoryCards, CategoryTable } from '../category-list';

vi.mock('@inertiajs/react', () => ({ usePage: () => ({ props: { business: { brand_color: '#C4686F' } } }) }));

const category = (id: number, overrides: Record<string, unknown> = {}) =>
    ({
        id,
        name: `Categoría ${id}`,
        description: null,
        status: true,
        created_at: '2026-09-01T10:00:00Z',
        updated_at: '2026-09-02T10:00:00Z',
        deleted_at: '2026-10-02T10:00:00Z',
        ...overrides,
    }) as never;

const text = (node: HTMLElement) => (node.textContent ?? '').replace(/\s/g, ' ');

beforeAll(() => {
    class NoopObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', NoopObserver);
});

beforeEach(() => vi.clearAllMocks());

describe('category list', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const props = {
        actions: () => [
            { label: 'Editar', icon: <span />, tone: 'neutral' as const, onSelect: onEdit },
            { label: 'Eliminar permanentemente', icon: <span />, tone: 'danger' as const, onSelect: onDelete },
        ],
        dateLabel: 'Eliminada',
        dateOf: (item: { deleted_at: string | null }) => item.deleted_at,
    };

    it('shows visible action buttons under each card and runs them', () => {
        render(<CategoryCards {...props} categories={[category(1)]} visibleActions showStatus={false} />);

        fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
        fireEvent.click(screen.getByRole('button', { name: 'Eliminar permanentemente' }));

        expect(onEdit).toHaveBeenCalledTimes(1);
        expect(onDelete).toHaveBeenCalledTimes(1);
        expect(text(screen.getByRole('list'))).toContain('Eliminada 2 de oct de 2026');
    });

    it('marks inactive categories only when the state matters', () => {
        const { rerender } = render(<CategoryCards {...props} categories={[category(1, { status: false })]} visibleActions />);
        expect(screen.getByText('Inactiva')).toBeInTheDocument();

        rerender(<CategoryCards {...props} categories={[category(1, { status: false })]} visibleActions showStatus={false} />);
        expect(screen.queryByText('Inactiva')).not.toBeInTheDocument();
    });

    it('lists a table with description, state and date, and runs the row actions', () => {
        render(<CategoryTable {...props} categories={[category(1, { description: 'Para el cuello' }), category(2, { status: false })]} />);

        const table = screen.getByRole('table');
        expect(text(table)).toContain('Para el cuello');
        expect(text(table)).toContain('—');
        expect(text(table)).toContain('Activa');
        expect(text(table)).toContain('Inactiva');
        expect(within(table).getByRole('columnheader', { name: 'Eliminada' })).toBeInTheDocument();

        fireEvent.click(within(table).getAllByRole('button', { name: 'Editar' })[1]);
        expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('drops the state column for deleted categories', () => {
        render(<CategoryTable {...props} categories={[category(1)]} showStatus={false} />);

        expect(screen.queryByRole('columnheader', { name: 'Estado' })).not.toBeInTheDocument();
    });
});

describe('category dialogs', () => {
    it('submits the name, shows the server error and can be cancelled', () => {
        const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
        const onOpenChange = vi.fn();
        const onChange = vi.fn();
        render(
            <CategoryNameDialog
                open
                onOpenChange={onOpenChange}
                title="Crear Nueva Categoría"
                description="Ingresa el nombre."
                submitLabel="Crear Categoría"
                idPrefix="create-"
                value="Relojes"
                onChange={onChange}
                error="Ya existe."
                processing={false}
                onSubmit={onSubmit}
            />,
        );
        const dialog = screen.getByRole('dialog', { name: 'Crear Nueva Categoría' });

        expect(within(dialog).getByRole('alert')).toHaveTextContent('Ya existe.');
        fireEvent.change(within(dialog).getByLabelText('Nombre'), { target: { value: 'Relojes de pared' } });
        expect(onChange).toHaveBeenCalledWith('Relojes de pared');

        fireEvent.submit(within(dialog).getByRole('button', { name: 'Crear Categoría' }).closest('form') as HTMLFormElement);
        expect(onSubmit).toHaveBeenCalledTimes(1);

        fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('disables the main action while saving', () => {
        render(
            <CategoryNameDialog
                open
                onOpenChange={vi.fn()}
                title="Editar Categoría"
                description="x"
                submitLabel="Guardar cambios"
                idPrefix="edit-"
                value="A"
                onChange={vi.fn()}
                processing
                onSubmit={vi.fn()}
            />,
        );

        expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    });

    it('asks a question and only offers to confirm when it is allowed', () => {
        const onConfirm = vi.fn();
        const { rerender } = render(
            <CategoryConfirmDialog
                open
                onOpenChange={vi.fn()}
                title="Restaurar Categoría"
                tone="restore"
                cancelLabel="Cancelar"
                confirmLabel="Restaurar"
                onConfirm={onConfirm}
            >
                <p>¿Desea restaurar?</p>
            </CategoryConfirmDialog>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }));
        expect(onConfirm).toHaveBeenCalledTimes(1);

        rerender(
            <CategoryConfirmDialog open onOpenChange={vi.fn()} title="No se puede eliminar" tone="danger" cancelLabel="Cerrar">
                <p>Tiene productos.</p>
            </CategoryConfirmDialog>,
        );
        expect(screen.queryByRole('button', { name: 'Restaurar' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    });
});
