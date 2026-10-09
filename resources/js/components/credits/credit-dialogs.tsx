import PaymentMethodSelect from '@/components/PaymentMethodSelect';
import { INPUT_CLASS } from '@/components/sales/form-fields';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { formatCurrency } from '@/lib/format';
import { type CreditSale } from '@/types';
import { router } from '@inertiajs/react';
import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

const cop = (value: number): string => formatCurrency(Number(value));
const LABEL = 'mb-1 block text-sm font-medium';
const CANCEL_BUTTON = 'h-12 rounded-xl border border-border/60 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50';

interface DialogProps {
    open: boolean;
    onClose: () => void;
    credit: CreditSale;
}

/** Registers a payment (abono) against the balance of the credit. */
export function AbonoDialog({ open, onClose, credit }: DialogProps) {
    const onBrand = useOnBrandColor();
    const [amount, setAmount] = useState(0);
    const [method, setMethod] = useState('efectivo');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const maxAmount = Number(credit.balance);
    const valid = amount > 0 && amount <= maxAmount;

    function handleSubmit() {
        if (amount <= 0 || amount > maxAmount) return;
        setSubmitting(true);

        router.post(
            `/credits/${credit.id}/payments`,
            { amount, payment_method: method, notes: notes || null },
            {
                onSuccess: () => {
                    toast.success('Abono registrado');
                    onClose();
                    setAmount(0);
                    setNotes('');
                },
                onError: (errors) => {
                    Object.values(errors).forEach((e) => toast.error(e as string));
                    setSubmitting(false);
                },
                onFinish: () => setSubmitting(false),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Registrar abono</DialogTitle>
                    <DialogDescription>
                        Saldo pendiente: <span className="font-semibold text-orange-600 dark:text-orange-400">{cop(maxAmount)}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <label className={LABEL}>Monto del abono</label>
                        <CurrencyInput value={amount} onChange={setAmount} autoFocus className={`${INPUT_CLASS} h-14 text-xl font-bold sm:h-12`} />
                        {amount > maxAmount && (
                            <p className="mt-1 text-sm text-red-500">El abono no puede ser mayor al saldo restante de {cop(maxAmount)}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                            {[10000, 20000, 50000]
                                .filter((value) => value <= maxAmount)
                                .map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setAmount(value)}
                                        className="h-11 rounded-full border border-border/60 bg-card px-4 text-sm font-medium tabular-nums transition-colors hover:bg-muted sm:h-9"
                                    >
                                        {cop(value)}
                                    </button>
                                ))}
                            <button
                                type="button"
                                onClick={() => setAmount(maxAmount)}
                                className="h-11 rounded-full border border-[var(--brand-primary)]/40 bg-[var(--brand-primary-soft)] px-4 text-sm font-medium text-[var(--brand-primary)] sm:h-9"
                            >
                                Pagar todo
                            </button>
                        </div>
                        {valid && (
                            <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                                Después de este abono quedará un saldo de <strong className="text-foreground">{cop(maxAmount - amount)}</strong>.
                            </p>
                        )}
                    </div>

                    <PaymentMethodSelect value={method} onValueChange={setMethod} triggerClassName="h-11 text-base sm:h-9 sm:text-sm" />

                    <div>
                        <label className={LABEL}>Notas (opcional)</label>
                        <textarea
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="Observaciones..."
                            rows={2}
                            className="w-full rounded-lg border border-border/60 bg-background p-3 text-base focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none sm:text-sm"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={onClose} disabled={submitting} className={CANCEL_BUTTON}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting || !valid}
                        className="h-12 rounded-xl bg-[var(--brand-primary)] text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
                        style={{ color: onBrand.hex }}
                    >
                        {submitting ? 'Registrando...' : `Registrar ${cop(amount)}`}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/** Cancelling a credit: explains what happens with the abonos and the reserved stock before confirming. */
export function CancelCreditDialog({ open, onClose, credit }: DialogProps) {
    const [submitting, setSubmitting] = useState(false);
    const reservesStock = credit.type === 'layaway' || credit.type === 'hold';

    function handleCancel() {
        setSubmitting(true);
        router.post(
            `/credits/${credit.id}/cancel`,
            {},
            {
                onSuccess: () => toast.success('Crédito cancelado'),
                onError: (errors) => {
                    Object.values(errors).forEach((e) => toast.error(e as string));
                    setSubmitting(false);
                },
                onFinish: () => setSubmitting(false),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <AlertCircle className="size-5" aria-hidden="true" />
                        Cancelar crédito
                    </DialogTitle>
                    <DialogDescription>
                        {credit.amount_paid > 0 ? (
                            <>
                                Este crédito tiene abonos registrados por <strong>{cop(credit.amount_paid)}</strong>. Los abonos permanecerán en caja
                                pero el crédito se marcará como cancelado.
                                {reservesStock && ' El stock reservado se liberará.'}
                            </>
                        ) : (
                            <>
                                Se cancelará el crédito <strong>{credit.code}</strong>.{reservesStock && ' El stock reservado se liberará.'}
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={onClose} disabled={submitting} className={CANCEL_BUTTON}>
                        No, volver
                    </button>
                    <button
                        type="button"
                        onClick={handleCancel}
                        disabled={submitting}
                        className="h-12 rounded-xl bg-red-600 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                        {submitting ? 'Cancelando...' : 'Sí, cancelar crédito'}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

const INSTALLMENT_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 18, 24];

/** Edits how an installment credit with no abonos is split (the total never changes). */
export function EditPlanDialog({ open, onClose, credit }: DialogProps) {
    const onBrand = useOnBrandColor();
    const [count, setCount] = useState(credit.installments_count ?? 2);
    const [dueDate, setDueDate] = useState(credit.due_date ? credit.due_date.slice(0, 10) : '');
    const [submitting, setSubmitting] = useState(false);

    function handleSubmit() {
        setSubmitting(true);
        router.patch(
            `/credits/${credit.id}/installments`,
            { installments_count: count, due_date: dueDate },
            {
                onSuccess: () => {
                    toast.success('Plan de cuotas actualizado');
                    onClose();
                },
                onError: (errors) => {
                    Object.values(errors).forEach((e) => toast.error(e as string));
                    setSubmitting(false);
                },
                onFinish: () => setSubmitting(false),
            },
        );
    }

    const installmentAmount = Number(credit.total_amount) / count;

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Editar plan de cuotas</DialogTitle>
                    <DialogDescription>
                        Solo se puede editar mientras el crédito no tenga abonos registrados. El total del crédito ({cop(Number(credit.total_amount))}
                        ) no cambia, solo cómo se reparte.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <label className={LABEL}>Número de cuotas</label>
                        <Select value={String(count)} onValueChange={(value) => setCount(Number(value))}>
                            <SelectTrigger className="h-11 w-full text-base sm:h-9 sm:text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {INSTALLMENT_OPTIONS.map((n) => (
                                    <SelectItem key={n} value={String(n)}>
                                        {n} {n === 1 ? 'cuota' : 'cuotas'} — {cop(Math.round(Number(credit.total_amount) / n))} c/u
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label htmlFor="due_date" className={LABEL}>
                            Fecha límite
                        </label>
                        <input
                            id="due_date"
                            type="date"
                            value={dueDate}
                            onChange={(event) => setDueDate(event.target.value)}
                            className={INPUT_CLASS}
                        />
                    </div>

                    <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                        Quedará en <strong className="text-foreground">{count}</strong> {count === 1 ? 'cuota' : 'cuotas'} de{' '}
                        <strong className="text-foreground">{cop(Math.round(installmentAmount))}</strong> cada una.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={onClose} disabled={submitting} className={CANCEL_BUTTON}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting || !dueDate}
                        className="h-12 rounded-xl bg-[var(--brand-primary)] text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
                        style={{ color: onBrand.hex }}
                    >
                        {submitting ? 'Guardando...' : 'Guardar plan'}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
