import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, CreditCard, XCircle, type LucideIcon } from 'lucide-react';

export type SaleStatus = 'completed' | 'pending' | 'cancelled' | 'credit_pending';

interface StatusStyle {
    label: string;
    icon: LucideIcon;
    /** Soft pill: tinted background, readable text in light and dark. */
    pill: string;
    /** Round marker shown at the start of a list row. */
    marker: string;
}

const STATUS_STYLES: Record<SaleStatus, StatusStyle> = {
    completed: {
        label: 'Completada',
        icon: CheckCircle2,
        pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
        marker: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    },
    pending: {
        label: 'Pendiente',
        icon: Clock,
        pill: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
        marker: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
    },
    cancelled: {
        label: 'Cancelada',
        icon: XCircle,
        pill: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
        marker: 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400',
    },
    credit_pending: {
        label: 'Crédito pendiente',
        icon: CreditCard,
        pill: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
        marker: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
    },
};

const FALLBACK: StatusStyle = {
    label: '',
    icon: Clock,
    pill: 'bg-muted text-muted-foreground',
    marker: 'bg-muted text-muted-foreground',
};

export const SALE_STATUS_OPTIONS: { value: 'all' | SaleStatus; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'completed', label: 'Completadas' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'credit_pending', label: 'Crédito' },
    { value: 'cancelled', label: 'Canceladas' },
];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    cash: 'Efectivo',
    credit_card: 'Tarjeta de crédito',
    debit_card: 'Tarjeta débito',
    transfer: 'Transferencia',
    bank_transfer: 'Transferencia',
    credito: 'Crédito',
    other: 'Otro',
};

/** Sales created from a credit are administered from Créditos: the server refuses to edit them and sends the user back. */
export function isCreditLinked(sale: { credit_sale_id?: number | null }): boolean {
    return Boolean(sale.credit_sale_id);
}

export const CREDIT_LINKED_MESSAGE = 'Esta venta está vinculada a un crédito. Adminístrala desde el módulo de créditos.';

export function paymentMethodLabel(method: string): string {
    return PAYMENT_METHOD_LABELS[method] ?? method;
}

export function saleStatusStyle(status: string): StatusStyle {
    return STATUS_STYLES[status as SaleStatus] ?? { ...FALLBACK, label: status };
}

export function SaleStatusPill({ status, className }: { status: string; className?: string }) {
    const style = saleStatusStyle(status);
    const Icon = style.icon;

    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap', style.pill, className)}>
            <Icon className="size-3.5" aria-hidden="true" />
            {style.label}
        </span>
    );
}

export function SaleStatusMarker({ status }: { status: string }) {
    const style = saleStatusStyle(status);
    const Icon = style.icon;

    return (
        <span aria-hidden="true" className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', style.marker)}>
            <Icon className="size-5" />
        </span>
    );
}
