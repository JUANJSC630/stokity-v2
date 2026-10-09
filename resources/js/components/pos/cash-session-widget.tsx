import type { CashSession } from '@/types';
import { router } from '@inertiajs/react';
import { ArrowDownCircle, ArrowUpCircle, DoorOpen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const ITEM = 'flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted';

interface CashSessionWidgetProps {
    session: CashSession | null;
    requireCashSession: boolean;
    onOpen: () => void;
    onMovement: (type: 'cash_in' | 'cash_out') => void;
}

/** Header pill: shows whether the cash register is open and, when it is, its movements and the way to close it. */
export function CashSessionWidget({ session, requireCashSession, onOpen, onMovement }: CashSessionWidgetProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    if (!session) {
        return (
            <button
                type="button"
                onClick={onOpen}
                className="flex h-10 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted sm:h-8 sm:px-2.5 sm:text-[11px]"
            >
                <span className="size-2 rounded-full bg-muted-foreground/60" aria-hidden="true" />
                {requireCashSession ? 'Abrir caja' : 'Caja cerrada'}
            </button>
        );
    }

    const openTime = new Date(session.opened_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                aria-expanded={open}
                aria-haspopup="true"
                onClick={() => setOpen((value) => !value)}
                className="flex h-10 items-center gap-2 rounded-full bg-emerald-100 px-3.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-200 sm:h-8 sm:px-2.5 sm:text-[11px] dark:bg-emerald-900/30 dark:text-emerald-300"
            >
                <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
                Caja · {openTime}
            </button>

            {open && (
                <div className="absolute top-full right-0 z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-xl">
                    <button
                        type="button"
                        onClick={() => {
                            onMovement('cash_in');
                            setOpen(false);
                        }}
                        className={ITEM}
                    >
                        <ArrowDownCircle className="size-4 text-emerald-600" aria-hidden="true" />
                        Ingreso de efectivo
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onMovement('cash_out');
                            setOpen(false);
                        }}
                        className={ITEM}
                    >
                        <ArrowUpCircle className="size-4 text-red-500" aria-hidden="true" />
                        Egreso de efectivo
                    </button>
                    <div className="my-1 border-t border-border/60" />
                    <button
                        type="button"
                        onClick={() => {
                            router.visit(route('cash-sessions.close.form', session.id));
                            setOpen(false);
                        }}
                        className={`${ITEM} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30`}
                    >
                        <DoorOpen className="size-4" aria-hidden="true" />
                        Cerrar caja
                    </button>
                </div>
            )}
        </div>
    );
}
