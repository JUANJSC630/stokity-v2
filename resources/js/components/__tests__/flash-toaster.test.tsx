import { render } from '@testing-library/react';
import toast from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FlashToaster from '../flash-toaster';

vi.mock('react-hot-toast', () => ({
    default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

const page = vi.hoisted(() => ({ current: { component: 'dashboard', props: { flash: {} as Record<string, string | null> } } }));
vi.mock('@inertiajs/react', () => ({ usePage: () => page.current }));

function renderWith(flash: Record<string, string | null>, component = 'dashboard') {
    page.current = { component, props: { flash } };
    return render(<FlashToaster />);
}

describe('FlashToaster', () => {
    beforeEach(() => vi.clearAllMocks());

    it('shows nothing when there is no flash message', () => {
        renderWith({ success: null, error: null, warning: null, info: null });

        expect(toast.success).not.toHaveBeenCalled();
        expect(toast.error).not.toHaveBeenCalled();
        expect(toast).not.toHaveBeenCalled();
    });

    it('shows a success toast', () => {
        renderWith({ success: 'Guardado' });

        expect(toast.success).toHaveBeenCalledWith('Guardado', { id: 'flash-success-Guardado' });
    });

    it('shows an error toast so a failure is never silent', () => {
        renderWith({ error: 'No puedes eliminar tu propio usuario' });

        expect(toast.error).toHaveBeenCalledWith('No puedes eliminar tu propio usuario', { id: 'flash-error-No puedes eliminar tu propio usuario' });
    });

    it('shows warning and info toasts', () => {
        renderWith({ warning: 'Revisa el stock', info: 'Sincronizado' });

        expect(toast).toHaveBeenCalledWith('Revisa el stock', expect.objectContaining({ id: 'flash-warning-Revisa el stock' }));
        expect(toast).toHaveBeenCalledWith('Sincronizado', expect.objectContaining({ id: 'flash-info-Sincronizado' }));
    });

    it.each(['products/index', 'products/edit'])('leaves the error to the page that renders it itself (%s)', (component) => {
        renderWith({ error: 'No puedes eliminar "X" porque tiene ventas' }, component);

        expect(toast.error).not.toHaveBeenCalled();
    });

    it('still shows a success toast on the pages that handle their own error', () => {
        renderWith({ success: 'Producto actualizado' }, 'products/edit');

        expect(toast.success).toHaveBeenCalledTimes(1);
    });
});
