import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from '../field';

describe('Field', () => {
    it('connects the label to the input', () => {
        render(<Field id="email" label="Correo" defaultValue="a@b.co" />);

        expect(screen.getByLabelText('Correo')).toHaveValue('a@b.co');
    });

    it('uses touch-sized, zoom-safe controls', () => {
        render(<Field id="email" label="Correo" />);

        const input = screen.getByLabelText('Correo');
        expect(input.className).toContain('h-11');
        expect(input.className).toContain('text-base');
    });

    it('describes the input with its error and marks it invalid', () => {
        render(<Field id="email" label="Correo" error="El correo ya está en uso." />);

        const input = screen.getByLabelText('Correo');
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAccessibleDescription('El correo ya está en uso.');
    });

    it('has no error markup when valid and forwards native attributes', () => {
        render(<Field id="pw" label="Contraseña" type="password" autoComplete="new-password" />);

        const input = screen.getByLabelText('Contraseña');
        expect(input).not.toHaveAttribute('aria-invalid');
        expect(input).toHaveAttribute('autocomplete', 'new-password');
        expect(input).toHaveAttribute('type', 'password');
    });
});
