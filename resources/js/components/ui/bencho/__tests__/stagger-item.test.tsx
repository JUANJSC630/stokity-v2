import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { StaggerItem } from '../stagger-item';

beforeAll(() => {
    vi.stubGlobal(
        'matchMedia',
        vi.fn().mockImplementation((query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })),
    );
});

describe('StaggerItem', () => {
    it('renders its children inside a wrapper with the given class', () => {
        render(
            <StaggerItem index={3} className="row">
                <span>Fila</span>
            </StaggerItem>,
        );
        expect(screen.getByText('Fila').parentElement).toHaveClass('row');
    });

    it('does not break with a large index', () => {
        render(<StaggerItem index={500}>Última</StaggerItem>);
        expect(screen.getByText('Última')).toBeInTheDocument();
    });
});
