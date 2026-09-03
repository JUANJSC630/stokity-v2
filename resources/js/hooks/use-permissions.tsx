import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import type { SharedData } from '@/types';

/**
 * Reads the current user's permission list (shared via HandleInertiaRequests
 * → auth.permissions) and exposes it as fast lookup helpers. Empty for
 * guests and for the platform super-admin (no tenant context/roles) — the
 * super-admin panel never calls this hook.
 */
export function usePermissions() {
    const { auth } = usePage<SharedData>().props;
    const permissions = auth.permissions;
    const permissionSet = useMemo(() => new Set(permissions ?? []), [permissions]);

    return {
        permissions: permissions ?? [],
        can: (permission: string): boolean => permissionSet.has(permission),
        canAny: (perms: string[]): boolean => perms.some((p) => permissionSet.has(p)),
        // perms.every() on an empty array is vacuously true — guard against
        // an empty list granting access no permission actually authorizes.
        canAll: (perms: string[]): boolean => perms.length > 0 && perms.every((p) => permissionSet.has(p)),
    };
}
