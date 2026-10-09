import { cn } from '@/lib/utils';
import { Ban, CheckCircle2 } from 'lucide-react';

type OrderStatus = 'completed' | 'cancelled';

const STATUS: Record<OrderStatus, { label: string; pill: string; icon: typeof CheckCircle2 }> = {
    completed: { label: 'Completado', pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300', icon: CheckCircle2 },
    cancelled: { label: 'Cancelado', pill: 'bg-muted text-muted-foreground', icon: Ban },
};

export function OrderStatusPill({ status, className }: { status: string; className?: string }) {
    const config = STATUS[status as OrderStatus] ?? STATUS.completed;
    const Icon = config.icon;

    return (
        <span
            className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap', config.pill, className)}
        >
            <Icon className="size-3.5" aria-hidden="true" />
            {config.label}
        </span>
    );
}

export function OrderMarker({ status }: { status: string }) {
    const config = STATUS[status as OrderStatus] ?? STATUS.completed;
    const Icon = config.icon;

    return (
        <span aria-hidden="true" className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', config.pill)}>
            <Icon className="size-5" />
        </span>
    );
}
