import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { CircleDot, LockKeyhole, Wallet } from 'lucide-react';

/** Money that may arrive as a string ("1500.00") from the server. */
export function formatCOP(value: number | string | null | undefined): string {
    const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
    if (isNaN(num as number)) return '$0';
    return formatCurrency(num as number);
}

/** The difference between what was counted and what was expected, with the sign written out. */
export const formatDifference = (value: number): string => (value > 0 ? '+' : '') + formatCOP(value);

export type DifferenceTone = 'balanced' | 'short' | 'over';

export const differenceTone = (value: number): DifferenceTone => (value === 0 ? 'balanced' : value < 0 ? 'short' : 'over');

const TONE_TEXT: Record<DifferenceTone, string> = {
    balanced: 'text-green-600 dark:text-green-400',
    short: 'text-red-600 dark:text-red-400',
    over: 'text-amber-600 dark:text-amber-400',
};

const TONE_WORD: Record<DifferenceTone, string> = { balanced: 'Cuadra', short: 'Faltante', over: 'Sobrante' };

export const differenceText = (value: number): string => TONE_TEXT[differenceTone(value)];
export const differenceWord = (value: number): string => TONE_WORD[differenceTone(value)];

export function SessionStatusPill({ open, className }: { open: boolean; className?: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
                open ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-muted text-muted-foreground',
                className,
            )}
        >
            {open ? <CircleDot className="size-3.5" aria-hidden="true" /> : <LockKeyhole className="size-3.5" aria-hidden="true" />}
            {open ? 'Abierta' : 'Cerrada'}
        </span>
    );
}

export function SessionMarker({ open }: { open: boolean }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-xl',
                open ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-muted text-muted-foreground',
            )}
        >
            <Wallet className="size-5" />
        </span>
    );
}

/** INGRESO or EGRESO tag of a manual cash movement. */
export function MovementKind({ type }: { type: string }) {
    const isIn = type === 'cash_in';

    return (
        <span
            className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                isIn
                    ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
            )}
        >
            {isIn ? 'INGRESO' : 'EGRESO'}
        </span>
    );
}

/** "8h 30m" between two moments, or a dash while the shift is still open. */
export function formatDuration(from: string, to: string | null): string {
    if (!to) return '—';
    const mins = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
