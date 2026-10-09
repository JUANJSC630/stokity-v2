import { formatCurrency } from '@/lib/format';
import { suggestBills } from '@/lib/pos-cash';
import { cn } from '@/lib/utils';

interface CashTenderProps {
    total: number;
    amountPaid: number;
    amountDisplay: string;
    /** The raw text typed in the box (the page strips it down to digits). */
    onAmountTyped: (raw: string) => void;
    onExact: () => void;
    onBill: (bill: number) => void;
    change: number;
}

const formatBill = (value: number): string => new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

/** Cash received: the typed amount, one-tap bills, and what is still missing or the change to give back. */
export function CashTender({ total, amountPaid, amountDisplay, onAmountTyped, onExact, onBill, change }: CashTenderProps) {
    const covers = amountPaid >= total && total > 0;
    const short = amountPaid > 0 && amountPaid < total;

    return (
        <div className="border-t border-border/60 px-3 py-3">
            <div className="flex items-center gap-2">
                <label htmlFor="cash-received" className="shrink-0 text-sm font-medium">
                    Recibido:
                </label>
                <input
                    id="cash-received"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0"
                    value={amountDisplay}
                    onChange={(event) => onAmountTyped(event.target.value)}
                    className="h-12 min-w-0 flex-1 rounded-xl border border-border/60 bg-background px-3 text-right text-xl font-bold tabular-nums focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none md:h-11"
                />
                <button
                    type="button"
                    onClick={onExact}
                    aria-label={`Pago exacto de ${formatCurrency(total)}`}
                    className="h-12 shrink-0 rounded-xl border border-border/60 bg-card px-3.5 text-sm font-medium transition-colors hover:bg-muted md:h-11"
                >
                    Exacto
                </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
                {suggestBills(total).map((bill) => (
                    <button
                        key={bill}
                        type="button"
                        onClick={() => onBill(bill)}
                        className="h-11 min-w-16 rounded-full border border-border/60 bg-card px-4 text-sm font-medium tabular-nums transition-colors hover:bg-muted md:h-9"
                    >
                        {formatBill(bill)}
                    </button>
                ))}
            </div>
            {covers && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <span className="text-sm font-medium">Cambio:</span>
                    <span className="text-2xl font-bold tabular-nums">{formatCurrency(change)}</span>
                </div>
            )}
            {short && (
                <div
                    className={cn(
                        'mt-3 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
                    )}
                >
                    <span className="text-sm font-medium">Faltan:</span>
                    <span className="text-xl font-bold tabular-nums">{formatCurrency(total - amountPaid)}</span>
                </div>
            )}
        </div>
    );
}
