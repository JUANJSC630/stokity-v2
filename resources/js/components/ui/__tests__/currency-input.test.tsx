import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CurrencyInput } from '../currency-input';

describe('CurrencyInput', () => {
    it('renders with placeholder "0" by default', () => {
        render(<CurrencyInput />);
        const input = screen.getByPlaceholderText('0');
        expect(input).toBeInTheDocument();
    });

    it('displays formatted value (123000 → "123.000")', () => {
        render(<CurrencyInput value={123000} />);
        const input = screen.getByDisplayValue('123.000');
        expect(input).toBeInTheDocument();
    });

    it('displays empty string for value 0', () => {
        render(<CurrencyInput value={0} />);
        const input = screen.getByPlaceholderText('0');
        expect(input).toHaveValue('');
    });

    it('calls onChange with parsed integer', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(<CurrencyInput value={0} onChange={onChange} />);
        const input = screen.getByPlaceholderText('0');

        await user.click(input);
        await user.type(input, '5000');

        // onChange should have been called with numeric values
        expect(onChange).toHaveBeenCalled();
        const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
        expect(typeof lastCall[0]).toBe('number');
    });

    it('renders as type="text" with inputMode="numeric"', () => {
        render(<CurrencyInput />);
        const input = screen.getByPlaceholderText('0');
        expect(input).toHaveAttribute('type', 'text');
        expect(input).toHaveAttribute('inputMode', 'numeric');
    });

    it('accepts a custom placeholder', () => {
        render(<CurrencyInput placeholder="Monto" />);
        const input = screen.getByPlaceholderText('Monto');
        expect(input).toBeInTheDocument();
    });

    it('applies custom className', () => {
        render(<CurrencyInput className="custom-class" />);
        const input = screen.getByPlaceholderText('0');
        expect(input.className).toContain('custom-class');
    });

    it('handles string value prop', () => {
        render(<CurrencyInput value="50000" />);
        const input = screen.getByDisplayValue('50.000');
        expect(input).toBeInTheDocument();
    });

    it('handles null value prop', () => {
        render(<CurrencyInput value={null} />);
        const input = screen.getByPlaceholderText('0');
        expect(input).toHaveValue('');
    });
});
