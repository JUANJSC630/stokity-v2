import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RollingNumber } from '../rolling-number';

const money = (n: number) => `$ ${n.toLocaleString('es-CO')}`;
const wheels = (container: HTMLElement) => container.querySelectorAll('[class*="wheel"]').length;

describe('RollingNumber', () => {
    it('exposes the whole formatted number to screen readers', () => {
        render(<RollingNumber value={1184500} format={money} />);

        expect(screen.getByText('$ 1.184.500')).toHaveClass('sr-only');
    });

    it('draws one wheel per digit and leaves separators and symbols still', () => {
        const { container } = render(<RollingNumber value={1184500} format={money} />);

        expect(wheels(container)).toBe(7);
        expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('$ 1.184.500');
    });

    it('updates the number when the value changes', () => {
        const { rerender, container } = render(<RollingNumber value={500} format={money} />);

        rerender(<RollingNumber value={12500} format={money} />);

        expect(screen.getByText('$ 12.500')).toBeInTheDocument();
        expect(wheels(container)).toBe(5);
    });

    it('uses whatever formatter it is given', () => {
        render(<RollingNumber value={24} format={(n) => `${n} ventas`} />);

        expect(screen.getByText('24 ventas')).toBeInTheDocument();
    });

    it('applies the class to the wrapper', () => {
        const { container } = render(<RollingNumber value={1} format={String} className="text-4xl" />);

        expect(container.firstElementChild).toHaveClass('text-4xl');
    });

    it('handles zero and negative numbers', () => {
        const { rerender } = render(<RollingNumber value={0} format={String} />);
        expect(screen.getByText('0', { selector: '.sr-only' })).toBeInTheDocument();

        rerender(<RollingNumber value={-15} format={String} />);
        expect(screen.getByText('-15', { selector: '.sr-only' })).toBeInTheDocument();
    });
});
