import { usePage } from '@inertiajs/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Can } from '../can';

function mockAuthPermissions(permissions: string[]) {
    vi.mocked(usePage).mockReturnValue({ props: { auth: { permissions } } } as unknown as ReturnType<typeof usePage>);
}

describe('Can', () => {
    it('renders children when the permission check passes', () => {
        mockAuthPermissions(['products.create']);
        render(
            <Can permission="products.create">
                <span>Nuevo</span>
            </Can>,
        );

        expect(screen.getByText('Nuevo')).toBeInTheDocument();
    });

    it('renders nothing by default when the permission check fails', () => {
        mockAuthPermissions([]);
        render(
            <Can permission="products.create">
                <span>Nuevo</span>
            </Can>,
        );

        expect(screen.queryByText('Nuevo')).not.toBeInTheDocument();
    });

    it('renders the fallback when the permission check fails', () => {
        mockAuthPermissions([]);
        render(
            <Can permission="products.create" fallback={<span>Bloqueado</span>}>
                <span>Nuevo</span>
            </Can>,
        );

        expect(screen.getByText('Bloqueado')).toBeInTheDocument();
        expect(screen.queryByText('Nuevo')).not.toBeInTheDocument();
    });

    it('any={[]} never grants access', () => {
        mockAuthPermissions(['products.create']);
        render(
            <Can any={[]}>
                <span>Nuevo</span>
            </Can>,
        );

        expect(screen.queryByText('Nuevo')).not.toBeInTheDocument();
    });

    it('all={[]} never grants access (not vacuously true)', () => {
        mockAuthPermissions(['products.create']);
        render(
            <Can all={[]}>
                <span>Nuevo</span>
            </Can>,
        );

        expect(screen.queryByText('Nuevo')).not.toBeInTheDocument();
    });
});
