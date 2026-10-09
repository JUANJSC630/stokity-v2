import PaymentMethodSelect from '@/components/PaymentMethodSelect';
import { INPUT_CLASS } from '@/components/sales/form-fields';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

export type CreditType = 'layaway' | 'installments' | 'due_date' | 'hold';

const CREDIT_TYPES: { key: CreditType; label: string; desc: string }[] = [
    { key: 'layaway', label: 'Separado', desc: 'Entrega al completar pago' },
    { key: 'installments', label: 'Cuotas', desc: 'Entrega inmediata, pago en cuotas' },
    { key: 'due_date', label: 'Fecha acordada', desc: 'Entrega inmediata, pago en fecha' },
    { key: 'hold', label: 'Reservado', desc: 'Sin abono, sin entrega' },
];

const LABEL = 'mb-1 block text-sm font-medium';

interface CreditSaleDialogProps {
    open: boolean;
    onClose: () => void;
    type: CreditType;
    onSelectType: (type: CreditType) => void;
    installments: number;
    onInstallmentsChange: (count: number) => void;
    dueDate: string;
    onDueDateChange: (date: string) => void;
    initialPayment: number;
    onInitialPaymentChange: (amount: number) => void;
    initialMethod: string;
    onInitialMethodChange: (method: string) => void;
    notes: string;
    onNotesChange: (notes: string) => void;
    total: number;
    submitting: boolean;
    onConfirm: () => void;
}

/** Turns the cart into a credit: how it will be paid, an optional first payment and a summary of what is left. */
export function CreditSaleDialog({
    open,
    onClose,
    type,
    onSelectType,
    installments,
    onInstallmentsChange,
    dueDate,
    onDueDateChange,
    initialPayment,
    onInitialPaymentChange,
    initialMethod,
    onInitialMethodChange,
    notes,
    onNotesChange,
    total,
    submitting,
    onConfirm,
}: CreditSaleDialogProps) {
    const onBrand = useOnBrandColor();
    const today = new Date().toISOString().slice(0, 10);

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Registrar como crédito</DialogTitle>
                    <DialogDescription>Elige cómo se va a pagar. Los productos del carrito quedan asociados al cliente.</DialogDescription>
                </DialogHeader>

                <div role="group" aria-label="Tipo de crédito" className="grid grid-cols-2 gap-2">
                    {CREDIT_TYPES.map((option) => (
                        <button
                            key={option.key}
                            type="button"
                            aria-pressed={type === option.key}
                            onClick={() => onSelectType(option.key)}
                            className={cn(
                                'min-h-16 rounded-xl border-2 p-3 text-left text-sm transition-colors',
                                type === option.key
                                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)]'
                                    : 'border-border/60 hover:bg-muted',
                            )}
                        >
                            <p className="font-semibold">{option.label}</p>
                            <p className="text-xs text-muted-foreground">{option.desc}</p>
                        </button>
                    ))}
                </div>

                <div className="space-y-3">
                    {type === 'installments' && (
                        <div>
                            <label htmlFor="credit-installments" className={LABEL}>
                                Número de cuotas
                            </label>
                            <select
                                id="credit-installments"
                                value={installments}
                                onChange={(event) => onInstallmentsChange(parseInt(event.target.value))}
                                className={cn(INPUT_CLASS, 'bg-background')}
                            >
                                {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                                    <option key={n} value={n}>
                                        {n} {n === 1 ? 'cuota' : 'cuotas'} — {formatCurrency(Math.round(total / n))} c/u
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    {(type === 'due_date' || type === 'installments') && (
                        <div>
                            <label htmlFor="credit-due" className={LABEL}>
                                {type === 'installments' ? 'Fecha última cuota' : 'Fecha límite de pago'}
                            </label>
                            <input
                                id="credit-due"
                                type="date"
                                value={dueDate}
                                min={today}
                                onChange={(event) => onDueDateChange(event.target.value)}
                                className={INPUT_CLASS}
                            />
                        </div>
                    )}
                    {type !== 'hold' && (
                        <div>
                            <label className={LABEL}>Abono inicial (opcional)</label>
                            <CurrencyInput
                                value={initialPayment}
                                onChange={onInitialPaymentChange}
                                className={INPUT_CLASS}
                                aria-label="Abono inicial"
                            />
                            {initialPayment > total && <p className="mt-1 text-xs text-red-500">El abono no puede ser mayor al total del crédito.</p>}
                            {initialPayment > 0 && (
                                <div className="mt-3">
                                    <label className={LABEL}>Método de pago del abono</label>
                                    <PaymentMethodSelect
                                        value={initialMethod}
                                        onValueChange={onInitialMethodChange}
                                        triggerClassName="h-11 text-base sm:h-9 sm:text-sm"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    <div>
                        <label htmlFor="credit-notes" className={LABEL}>
                            Notas (opcional)
                        </label>
                        <input
                            id="credit-notes"
                            value={notes}
                            onChange={(event) => onNotesChange(event.target.value)}
                            placeholder="Observaciones..."
                            className={INPUT_CLASS}
                        />
                    </div>
                </div>

                <div className="rounded-xl bg-muted/50 p-3">
                    <div className="flex justify-between text-sm">
                        <span>Total del crédito</span>
                        <span className="font-bold tabular-nums">{formatCurrency(total)}</span>
                    </div>
                    {initialPayment > 0 && (
                        <div className="mt-1 flex justify-between text-sm text-emerald-700 dark:text-emerald-400">
                            <span>Abono inicial</span>
                            <span className="tabular-nums">{formatCurrency(initialPayment)}</span>
                        </div>
                    )}
                    {initialPayment > 0 && (
                        <div className="mt-1 flex justify-between text-sm text-amber-700 dark:text-amber-400">
                            <span>Saldo pendiente</span>
                            <span className="font-semibold tabular-nums">{formatCurrency(total - initialPayment)}</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-12 rounded-xl border border-border/60 text-sm font-medium text-muted-foreground hover:bg-muted"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={submitting || initialPayment > total}
                        className="h-12 rounded-xl bg-[var(--brand-primary)] text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
                        style={{ color: onBrand.hex }}
                    >
                        {submitting ? 'Registrando...' : 'Confirmar crédito'}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
