/** Gallery photos get an editable alternative text, saved in one PUT. */
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GalleryAltText } from '../gallery-alt-text';

const env = vi.hoisted(() => ({ put: vi.fn() }));

vi.mock('@inertiajs/react', () => ({ router: { put: (...args: unknown[]) => env.put(...args) } }));
vi.mock('@/components/sales/form-fields', () => ({
    INPUT_CLASS: '',
    LabeledField: ({ id, label, children }: { id: string; label: string; children: ReactNode }) => (
        <div>
            <label htmlFor={id}>{label}</label>
            {children}
        </div>
    ),
    Section: ({ title, children }: { title: string; children: ReactNode }) => (
        <section>
            <h2>{title}</h2>
            {children}
        </section>
    ),
}));

const images = [
    { id: 5, image_url: 'https://blob.example/a.webp', alt_text: 'Pulsera dorada', sort_order: 0 },
    { id: 6, image_url: 'https://blob.example/b.webp', alt_text: null, sort_order: 1 },
];

describe('GalleryAltText', () => {
    beforeEach(() => vi.clearAllMocks());

    it('renders nothing when the product has no gallery photos', () => {
        const { container } = render(<GalleryAltText productId={9} images={[]} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('shows the current texts and saves every photo in one request', () => {
        render(<GalleryAltText productId={9} images={images} />);

        expect(screen.getByLabelText('Texto alternativo de la foto 1')).toHaveValue('Pulsera dorada');
        expect(screen.getByLabelText('Texto alternativo de la foto 2')).toHaveValue('');

        fireEvent.change(screen.getByLabelText('Texto alternativo de la foto 2'), { target: { value: 'Pulsera de perlas' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar textos' }));

        expect(env.put).toHaveBeenCalledWith(
            '/products/9/images-alt-text',
            {
                images: [
                    { id: 5, alt_text: 'Pulsera dorada' },
                    { id: 6, alt_text: 'Pulsera de perlas' },
                ],
            },
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});
