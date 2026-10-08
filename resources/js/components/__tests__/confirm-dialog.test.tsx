import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { useConfirm } from '../confirm-dialog';

function Harness() {
    const { confirm, dialog } = useConfirm();
    const [result, setResult] = useState('pendiente');

    return (
        <div>
            <button
                onClick={async () => {
                    const accepted = await confirm({
                        title: '¿Eliminar este gasto?',
                        description: 'No se puede deshacer.',
                        confirmLabel: 'Eliminar',
                    });
                    setResult(String(accepted));
                }}
            >
                abrir
            </button>
            <p>resultado: {result}</p>
            {dialog}
        </div>
    );
}

describe('useConfirm', () => {
    it('does not show the dialog until asked', () => {
        render(<Harness />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows the title, description and confirm label', async () => {
        render(<Harness />);
        await userEvent.click(screen.getByText('abrir'));

        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('¿Eliminar este gasto?')).toBeInTheDocument();
        expect(screen.getByText('No se puede deshacer.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
    });

    it('resolves true when confirmed and closes', async () => {
        render(<Harness />);
        await userEvent.click(screen.getByText('abrir'));
        await userEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));

        await waitFor(() => expect(screen.getByText('resultado: true')).toBeInTheDocument());
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('resolves false when cancelled', async () => {
        render(<Harness />);
        await userEvent.click(screen.getByText('abrir'));
        await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

        await waitFor(() => expect(screen.getByText('resultado: false')).toBeInTheDocument());
    });

    it('resolves false when dismissed with Escape', async () => {
        render(<Harness />);
        await userEvent.click(screen.getByText('abrir'));
        await screen.findByRole('dialog');
        await userEvent.keyboard('{Escape}');

        await waitFor(() => expect(screen.getByText('resultado: false')).toBeInTheDocument());
    });
});
