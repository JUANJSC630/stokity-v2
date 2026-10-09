import { INPUT_CLASS } from '@/components/sales/form-fields';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { cn } from '@/lib/utils';
import type { FormEvent } from 'react';

const LABEL = 'mb-1 block text-xs font-medium';
const TEXTAREA =
    'w-full rounded-lg border border-border/60 bg-background p-3 text-base focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none sm:text-sm';

interface OpenSessionDialogProps {
    open: boolean;
    /** The business requires an open cash register: the dialog cannot be dismissed and offers a way out instead. */
    blocking: boolean;
    amount: string;
    notes: string;
    submitting: boolean;
    onAmountChange: (value: string) => void;
    onNotesChange: (value: string) => void;
    onSubmit: (event: FormEvent) => void;
    onClose: () => void;
}

/** Opening of the cash register: the initial float and optional notes. */
export function OpenSessionDialog({
    open,
    blocking,
    amount,
    notes,
    submitting,
    onAmountChange,
    onNotesChange,
    onSubmit,
    onClose,
}: OpenSessionDialogProps) {
    const onBrand = useOnBrandColor();

    return (
        <Dialog open={open} onOpenChange={(next) => !blocking && !next && onClose()}>
            <DialogContent
                className={cn('max-w-sm', blocking && '[&>button:last-child]:hidden')}
                onEscapeKeyDown={(event) => blocking && event.preventDefault()}
                onInteractOutside={(event) => blocking && event.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>Abrir caja</DialogTitle>
                    <DialogDescription>
                        {blocking ? 'Debes abrir la caja antes de realizar ventas.' : 'Indica con cuánto efectivo empieza el turno.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-3">
                    <div>
                        <label htmlFor="opening-amount" className={LABEL}>
                            Fondo inicial
                        </label>
                        <CurrencyInput
                            id="opening-amount"
                            value={amount}
                            onChange={(value) => onAmountChange(value > 0 ? String(value) : '')}
                            placeholder="0"
                            className={INPUT_CLASS}
                        />
                    </div>
                    <div>
                        <label htmlFor="opening-notes" className={LABEL}>
                            Notas (opcional)
                        </label>
                        <textarea
                            id="opening-notes"
                            value={notes}
                            onChange={(event) => onNotesChange(event.target.value)}
                            rows={2}
                            className={TEXTAREA}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="h-12 w-full rounded-xl bg-[var(--brand-primary)] text-sm font-bold disabled:opacity-50"
                        style={{ color: onBrand.hex }}
                    >
                        {submitting ? 'Abriendo...' : 'Abrir caja'}
                    </button>
                </form>
                {blocking && (
                    <div className="text-center">
                        <a href="/dashboard" className="inline-flex min-h-11 items-center text-xs text-muted-foreground hover:underline">
                            Ir al inicio
                        </a>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

interface CashMovementDialogProps {
    open: boolean;
    type: 'cash_in' | 'cash_out';
    amount: string;
    concept: string;
    notes: string;
    submitting: boolean;
    onTypeChange: (type: 'cash_in' | 'cash_out') => void;
    onAmountChange: (value: string) => void;
    onConceptChange: (value: string) => void;
    onNotesChange: (value: string) => void;
    onSubmit: (event: FormEvent) => void;
    onClose: () => void;
}

/** Money that enters or leaves the register outside of a sale. */
export function CashMovementDialog({
    open,
    type,
    amount,
    concept,
    notes,
    submitting,
    onTypeChange,
    onAmountChange,
    onConceptChange,
    onNotesChange,
    onSubmit,
    onClose,
}: CashMovementDialogProps) {
    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>{type === 'cash_in' ? 'Ingreso de efectivo' : 'Egreso de efectivo'}</DialogTitle>
                    <DialogDescription>Queda registrado en el turno de caja abierto.</DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-3">
                    <div role="group" aria-label="Tipo de movimiento" className="grid grid-cols-2 gap-2">
                        {(['cash_in', 'cash_out'] as const).map((value) => (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={type === value}
                                onClick={() => onTypeChange(value)}
                                className={cn(
                                    'h-11 rounded-lg border text-sm font-medium transition-colors',
                                    type === value
                                        ? value === 'cash_in'
                                            ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                            : 'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                        : 'border-border/60 text-muted-foreground hover:bg-muted',
                                )}
                            >
                                {value === 'cash_in' ? 'Ingreso' : 'Egreso'}
                            </button>
                        ))}
                    </div>
                    <div>
                        <label htmlFor="movement-amount" className={LABEL}>
                            Monto *
                        </label>
                        <CurrencyInput
                            id="movement-amount"
                            value={Number(amount) || 0}
                            onChange={(value) => onAmountChange(value > 0 ? String(value) : '')}
                            required
                            placeholder="0"
                            className={INPUT_CLASS}
                        />
                    </div>
                    <div>
                        <label htmlFor="movement-concept" className={LABEL}>
                            Concepto *
                        </label>
                        <input
                            id="movement-concept"
                            type="text"
                            value={concept}
                            onChange={(event) => onConceptChange(event.target.value)}
                            required
                            placeholder="Ej: Pago proveedor"
                            className={INPUT_CLASS}
                        />
                    </div>
                    <div>
                        <label htmlFor="movement-notes" className={LABEL}>
                            Notas (opcional)
                        </label>
                        <textarea
                            id="movement-notes"
                            value={notes}
                            onChange={(event) => onNotesChange(event.target.value)}
                            rows={2}
                            className={TEXTAREA}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={submitting}
                        className={cn(
                            'h-12 w-full rounded-xl text-sm font-bold text-white disabled:opacity-50',
                            type === 'cash_in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700',
                        )}
                    >
                        {submitting ? 'Registrando...' : 'Registrar'}
                    </button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

interface VariablePriceDialogProps {
    productName: string | null;
    value: number;
    onChange: (value: number) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

/** Asks for the price of a service whose price is agreed per sale. */
export function VariablePriceDialog({ productName, value, onChange, onConfirm, onCancel }: VariablePriceDialogProps) {
    const onBrand = useOnBrandColor();

    return (
        <Dialog open={productName !== null} onOpenChange={(next) => !next && onCancel()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Precio del servicio</DialogTitle>
                    <DialogDescription>{productName}</DialogDescription>
                </DialogHeader>
                <CurrencyInput value={value} onChange={onChange} className={INPUT_CLASS} aria-label="Precio del servicio" autoFocus />
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="h-12 rounded-xl border border-border/60 text-sm font-medium text-muted-foreground hover:bg-muted"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="h-12 rounded-xl bg-[var(--brand-primary)] text-sm font-bold hover:opacity-90"
                        style={{ color: onBrand.hex }}
                    >
                        Agregar
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
