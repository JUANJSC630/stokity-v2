import { initialsOf } from '@/components/admin/tenant-badges';
import { cn } from '@/lib/utils';
import { type Branch } from '@/types';
import { Building2 } from 'lucide-react';

export function BranchAvatar({ className }: { className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]',
                className,
            )}
        >
            <Building2 className="size-5" />
        </span>
    );
}

export function BranchStatusPill({ active, className }: { active: boolean; className?: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
                active
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300',
                className,
            )}
        >
            <span aria-hidden="true" className={cn('size-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-red-500')} />
            {active ? 'Activa' : 'Inactiva'}
        </span>
    );
}

/** Sellers of a branch, not counting the person who manages it. */
export function sellersLabel(branch: Branch): string {
    const managerId = branch.manager?.id;
    const count = branch.employees ? branch.employees.filter((emp) => emp.id !== managerId && emp.role === 'vendedor').length : 0;

    return count > 0 ? `${count} vendedor(es)` : 'Sin vendedores';
}

export function PersonAvatar({ name, photoUrl, className }: { name: string; photoUrl?: string | null; className?: string }) {
    if (photoUrl) {
        return (
            <img
                src={photoUrl}
                alt=""
                aria-hidden="true"
                className={cn('size-11 shrink-0 rounded-xl border border-border/60 object-cover', className)}
            />
        );
    }

    return (
        <span
            aria-hidden="true"
            className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary-soft)] text-sm font-semibold text-[var(--brand-primary)]',
                className,
            )}
        >
            {initialsOf(name) || '?'}
        </span>
    );
}
