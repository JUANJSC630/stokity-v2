import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchField } from '../common/search-field';

function setup(value = '') {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(<SearchField id="q" label="Buscar" placeholder="Nombre" value={value} onChange={onChange} onSubmit={onSubmit} />);
    return { onChange, onSubmit };
}

describe('SearchField', () => {
    it('reports typing and submits on Enter', () => {
        const { onChange, onSubmit } = setup();

        fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar' }), { target: { value: 'ana' } });
        fireEvent.submit(screen.getByRole('search'));

        expect(onChange).toHaveBeenCalledWith('ana');
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('only shows the clear button when there is text, and clears through onChange', () => {
        const empty = setup();
        expect(screen.queryByRole('button', { name: 'Borrar búsqueda' })).not.toBeInTheDocument();
        expect(empty.onChange).not.toHaveBeenCalled();
    });

    it('clears the text with the inline button', () => {
        const { onChange } = setup('ana');

        fireEvent.click(screen.getByRole('button', { name: 'Borrar búsqueda' }));

        expect(onChange).toHaveBeenCalledWith('');
    });
});
