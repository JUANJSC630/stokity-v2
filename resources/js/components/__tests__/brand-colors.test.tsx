import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BrandColors from '../brand-colors';

const env = vi.hoisted(() => ({ business: {} as Record<string, unknown> }));

vi.mock('@inertiajs/react', () => ({ usePage: () => ({ props: { business: env.business } }) }));

beforeEach(() => {
    env.business = {};
});

const css = () => document.querySelector('style')?.textContent ?? '';

describe('BrandColors', () => {
    it('publishes the brand colors and their rgb triplets', () => {
        env.business = { brand_color: '#C4686F', brand_color_secondary: '#112233' };
        render(<BrandColors />);

        expect(css()).toContain('--brand-primary: #C4686F');
        expect(css()).toContain('--brand-primary-rgb: 196, 104, 111');
        expect(css()).toContain('--brand-secondary: #112233');
    });

    it('publishes a readable text color for buttons painted with the brand color', () => {
        env.business = { brand_color: '#FFEB3B' };
        const { unmount } = render(<BrandColors />);
        const onLight = css().match(/--brand-on-primary: (#[0-9a-fA-F]+)/)?.[1];
        unmount();

        env.business = { brand_color: '#1E3A8A' };
        render(<BrandColors />);
        const onDark = css().match(/--brand-on-primary: (#[0-9a-fA-F]+)/)?.[1];

        expect(onLight).toBeDefined();
        expect(onDark).toBeDefined();
        expect(onLight).not.toBe(onDark);
    });

    it('falls back to the default colors when the business has none', () => {
        render(<BrandColors />);

        expect(css()).toContain('--brand-primary:');
        expect(css()).toContain('--brand-on-primary:');
    });
});
