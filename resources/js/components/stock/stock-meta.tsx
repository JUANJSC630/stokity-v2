import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowDownCircle, ArrowUpCircle, Equal, RotateCcw, Trash2, type LucideIcon } from 'lucide-react';

export type MovementType = 'ingreso' | 'out' | 'adjustment' | 'write_off' | 'supplier_return';

interface TypeStyle {
    /** Short name shown in lists. */
    label: string;
    /** Full name shown when choosing a type. */
    longLabel: string;
    icon: LucideIcon;
    /** +1 adds stock, -1 removes it, 0 sets it. */
    sign: 1 | -1 | 0;
    pill: string;
    marker: string;
}

const TYPES: Record<MovementType, TypeStyle> = {
    ingreso: {
        label: 'Ingreso',
        longLabel: 'Ingreso',
        icon: ArrowDownCircle,
        sign: 1,
        pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
        marker: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    },
    out: {
        label: 'Salida',
        longLabel: 'Salida',
        icon: ArrowUpCircle,
        sign: -1,
        pill: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
        marker: 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400',
    },
    write_off: {
        label: 'Baja',
        longLabel: 'Baja de Inventario',
        icon: Trash2,
        sign: -1,
        pill: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
        marker: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
    },
    supplier_return: {
        label: 'Dev. Proveedor',
        longLabel: 'Devolución a Proveedor',
        icon: RotateCcw,
        sign: -1,
        pill: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
        marker: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    },
    adjustment: {
        label: 'Ajuste',
        longLabel: 'Ajuste de Stock',
        icon: Equal,
        sign: 0,
        pill: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
        marker: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    },
};

const FALLBACK: TypeStyle = { ...TYPES.adjustment, label: 'Desconocido', longLabel: 'Desconocido' };

export const typeStyle = (type: string): TypeStyle => TYPES[type as MovementType] ?? FALLBACK;

export const MOVEMENT_TYPES = Object.keys(TYPES) as MovementType[];

/** What a movement does to the stock of the product, for showing a "+12" or "−5" next to the quantity. */
export const signedQuantity = (type: string, quantity: number): string => {
    const { sign } = typeStyle(type);
    const amount = quantity.toLocaleString();
    return sign > 0 ? `+${amount}` : sign < 0 ? `−${amount}` : amount;
};

/** The stock a product will have after a movement, with the same rules the server applies (it never goes under zero). */
export const stockAfter = (type: string, current: number, quantity: number): number => {
    const { sign } = typeStyle(type);
    if (sign > 0) return current + quantity;
    if (sign < 0) return Math.max(0, current - quantity);
    return quantity;
};

export const formatMovementDate = (date: string): string => format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: es });

export function MovementTypePill({ type, className }: { type: string; className?: string }) {
    const style = typeStyle(type);
    const Icon = style.icon;

    return (
        <span
            className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap', style.pill, className)}
        >
            <Icon className="size-3.5" aria-hidden="true" />
            {style.label}
        </span>
    );
}

export function MovementMarker({ type }: { type: string }) {
    const style = typeStyle(type);
    const Icon = style.icon;

    return (
        <span aria-hidden="true" className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', style.marker)}>
            <Icon className="size-5" />
        </span>
    );
}
