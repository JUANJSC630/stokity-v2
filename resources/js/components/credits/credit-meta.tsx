import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, Clock } from 'lucide-react';

export const CREDIT_TYPE_LABELS: Record<string, string> = {
    layaway: 'Separado',
    installments: 'Cuotas',
    due_date: 'Fecha acordada',
    hold: 'Reservado',
};

interface StatusStyle {
    label: string;
    pill: string;
    dot: string;
}

const STATUS_STYLES: Record<string, StatusStyle> = {
    active: { label: 'Activo', pill: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300', dot: 'bg-blue-500' },
    overdue: { label: 'Vencido', pill: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300', dot: 'bg-red-500' },
    completed: { label: 'Completado', pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300', dot: 'bg-emerald-500' },
    cancelled: { label: 'Cancelado', pill: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground/60' },
};

export function creditStatusStyle(status: string): StatusStyle {
    return STATUS_STYLES[status] ?? STATUS_STYLES.active;
}

export function CreditStatusPill({ status, className }: { status: string; className?: string }) {
    const style = creditStatusStyle(status);

    return (
        <span
            className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap', style.pill, className)}
        >
            <span className={cn('size-1.5 rounded-full', style.dot)} aria-hidden="true" />
            {style.label}
        </span>
    );
}

export function CreditTypePill({ type, className }: { type: string; className?: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border border-border/60 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-muted-foreground',
                className,
            )}
        >
            {CREDIT_TYPE_LABELS[type] ?? type}
        </span>
    );
}

/** How close the due date is: shown as a coloured line (nothing for finished credits or without a date). */
export function DueDateNote({ dueDate, status }: { dueDate: string | null; status: string }) {
    if (!dueDate || status === 'completed' || status === 'cancelled') return null;

    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                <AlertCircle className="size-3" aria-hidden="true" />
                Venció hace {Math.abs(diffDays)} día{Math.abs(diffDays) !== 1 ? 's' : ''}
            </span>
        );
    }
    if (diffDays <= 3) {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                <Clock className="size-3" aria-hidden="true" />
                Vence en {diffDays} día{diffDays !== 1 ? 's' : ''}
            </span>
        );
    }

    return <span className="text-xs text-muted-foreground">Vence {format(due, "d 'de' MMM yyyy", { locale: es })}</span>;
}
