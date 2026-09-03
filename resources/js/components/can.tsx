import type { ReactNode } from 'react';
import { usePermissions } from '@/hooks/use-permissions';

interface CanProps {
    /** A single permission name (checked with `can`). */
    permission?: string;
    /** User needs at least one of these (checked with `canAny`). */
    any?: string[];
    /** User needs all of these (checked with `canAll`). */
    all?: string[];
    children: ReactNode;
    /** Rendered instead of children when the check fails. */
    fallback?: ReactNode;
}

/**
 * Conditionally renders children based on the current user's permissions.
 * Exactly one of `permission`, `any`, or `all` should be passed.
 *
 *   <Can permission="products.create"><Button>Nuevo</Button></Can>
 *   <Can any={['sales.update', 'sales.delete']}>...</Can>
 */
export function Can({ permission, any, all, children, fallback = null }: CanProps) {
    const { can, canAny, canAll } = usePermissions();

    const allowed = permission ? can(permission) : any ? canAny(any) : all ? canAll(all) : false;

    return allowed ? <>{children}</> : <>{fallback}</>;
}
