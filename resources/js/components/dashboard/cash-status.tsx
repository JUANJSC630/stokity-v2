import { formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { Vault } from 'lucide-react';

export interface CashSessionState {
    required: boolean;
    open: { id: number; opened_at: string } | null;
}

interface CashStatusProps {
    cashSession?: CashSessionState | null;
    /** Where to send a user who can open the cash session; without it the closed state is only informative. */
    openHref?: string;
}

/** Whether the till is open, for the people who sell. Hidden when the business does not use cash sessions and none is open. */
export function CashStatus({ cashSession, openHref }: CashStatusProps) {
    if (!cashSession || (!cashSession.open && !cashSession.required)) return null;

    const base = 'inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-sm font-medium sm:min-h-9';

    if (cashSession.open) {
        return (
            <span
                className={cn(
                    base,
                    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300',
                )}
            >
                <span aria-hidden="true" className="size-2 rounded-full bg-emerald-500" />
                Caja abierta · desde {formatTime(cashSession.open.opened_at)}
            </span>
        );
    }

    const closed = cn(base, 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200');

    return openHref ? (
        <Link href={openHref} className={cn(closed, 'hover:bg-amber-100 dark:hover:bg-amber-950/50')}>
            <Vault className="size-4" aria-hidden="true" />
            Caja cerrada · Abrir en el POS
        </Link>
    ) : (
        <span className={closed}>
            <Vault className="size-4" aria-hidden="true" />
            Caja cerrada
        </span>
    );
}
