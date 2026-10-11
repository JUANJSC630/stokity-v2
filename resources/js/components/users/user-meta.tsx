import { initialsOf } from '@/components/admin/tenant-badges';
import { cn } from '@/lib/utils';

export const ROLE_LABELS: Record<string, string> = {
    administrador: 'Administrador',
    encargado: 'Encargado',
    vendedor: 'Vendedor',
};

const ROLE_PILL_CLASS: Record<string, string> = {
    administrador: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    encargado: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    vendedor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
};

export function RoleBadge({ role, className }: { role: string; className?: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
                ROLE_PILL_CLASS[role] ?? 'bg-muted text-muted-foreground',
                className,
            )}
        >
            {ROLE_LABELS[role] ?? role}
        </span>
    );
}

export function UserStatusPill({ active, className }: { active: boolean; className?: string }) {
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
            {active ? 'Activo' : 'Inactivo'}
        </span>
    );
}

export function UserAvatar({ name, photoUrl, className }: { name: string; photoUrl?: string | null; className?: string }) {
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
