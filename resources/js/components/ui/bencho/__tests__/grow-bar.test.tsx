import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GrowBar } from '../grow-bar';

describe('GrowBar', () => {
    it('settles on the given percentage once mounted', () => {
        const { container } = render(<GrowBar percent={64} />);
        expect(container.firstElementChild).toHaveStyle({ width: '64%' });
    });

    it('follows later changes and applies the stagger delay', () => {
        const { container, rerender } = render(<GrowBar percent={20} delay={150} />);
        rerender(<GrowBar percent={80} delay={150} />);
        expect(container.firstElementChild).toHaveStyle({ width: '80%', transitionDelay: '150ms' });
    });

    it('honours reduced motion through the class list', () => {
        const { container } = render(<GrowBar percent={10} className="bg-red-500" />);
        expect(container.firstElementChild?.className).toContain('motion-reduce:transition-none');
        expect(container.firstElementChild?.className).toContain('bg-red-500');
    });
});
