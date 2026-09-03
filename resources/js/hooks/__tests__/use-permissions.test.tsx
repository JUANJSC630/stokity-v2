import { usePage } from '@inertiajs/react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePermissions } from '../use-permissions';

function mockAuthPermissions(permissions?: string[]) {
    vi.mocked(usePage).mockReturnValue({ props: { auth: { permissions } } } as unknown as ReturnType<typeof usePage>);
}

describe('usePermissions', () => {
    it('can() returns true only for a permission the user holds', () => {
        mockAuthPermissions(['products.create', 'sales.view']);
        const { result } = renderHook(() => usePermissions());

        expect(result.current.can('products.create')).toBe(true);
        expect(result.current.can('users.view')).toBe(false);
    });

    it('canAny() returns true if at least one permission matches', () => {
        mockAuthPermissions(['sales.view']);
        const { result } = renderHook(() => usePermissions());

        expect(result.current.canAny(['sales.update', 'sales.view'])).toBe(true);
        expect(result.current.canAny(['sales.update', 'sales.delete'])).toBe(false);
    });

    it('canAny() with an empty list is false', () => {
        mockAuthPermissions(['sales.view']);
        const { result } = renderHook(() => usePermissions());

        expect(result.current.canAny([])).toBe(false);
    });

    it('canAll() returns true only if every permission matches', () => {
        mockAuthPermissions(['sales.view', 'sales.create']);
        const { result } = renderHook(() => usePermissions());

        expect(result.current.canAll(['sales.view', 'sales.create'])).toBe(true);
        expect(result.current.canAll(['sales.view', 'sales.delete'])).toBe(false);
    });

    it('canAll() with an empty list is false, not vacuously true', () => {
        mockAuthPermissions(['sales.view']);
        const { result } = renderHook(() => usePermissions());

        expect(result.current.canAll([])).toBe(false);
    });

    it('handles a missing permissions array (guest/super-admin) as empty', () => {
        mockAuthPermissions(undefined);
        const { result } = renderHook(() => usePermissions());

        expect(result.current.permissions).toEqual([]);
        expect(result.current.can('anything')).toBe(false);
    });
});
