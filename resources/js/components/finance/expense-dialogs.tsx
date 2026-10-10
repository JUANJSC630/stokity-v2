import { INPUT_CLASS, LabeledField, SELECT_TRIGGER } from '@/components/sales/form-fields';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { cn } from '@/lib/utils';
import { type Expense, type ExpenseCategory, type ExpenseTemplate } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { ColorDot } from './finance-parts';

export const todayStr = (): string => new Date().toISOString().slice(0, 10);

interface MonthlyExpenseEntry {
    template_id: number;
    amount: number;
    skip: boolean;
}

/** Register the fixed expenses of the month in one go, each with its reference amount (adjustable) or marked as not applicable. */
export function RegisterMonthlyExpensesDialog({
    open,
    onClose,
    templates,
    currentMonth,
}: {
    open: boolean;
    onClose: () => void;
    templates: ExpenseTemplate[];
    currentMonth: string;
}) {
    const onBrand = useOnBrandColor();
    const [entries, setEntries] = useState<MonthlyExpenseEntry[]>(() =>
        templates.map((t) => ({ template_id: t.id, amount: t.reference_amount, skip: false })),
    );
    const [submitting, setSubmitting] = useState(false);

    const updateEntry = (idx: number, patch: Partial<MonthlyExpenseEntry>) => {
        setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
    };

    const handleSubmit = () => {
        const today = new Date().toISOString().slice(0, 10);
        const toRegister = entries
            .filter((e) => !e.skip)
            .map((e) => {
                const t = templates.find((t) => t.id === e.template_id)!;
                return {
                    expense_template_id: t.id,
                    branch_id: t.branch_id,
                    expense_category_id: t.expense_category_id ?? undefined,
                    amount: e.amount,
                    expense_date: today,
                };
            });

        if (toRegister.length === 0) {
            onClose();
            return;
        }
        setSubmitting(true);
        router.post(
            '/expenses',
            { expenses: toRegister },
            {
                onFinish: () => {
                    setSubmitting(false);
                    onClose();
                },
                preserveScroll: true,
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Gastos fijos de {currentMonth}</DialogTitle>
                    <DialogDescription>Confirma o ajusta los montos antes de registrar</DialogDescription>
                </DialogHeader>

                <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                    {templates.map((t, idx) => (
                        <div key={t.id} className={cn('rounded-xl border border-border/60 p-3', entries[idx]?.skip && 'opacity-50')}>
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                    {t.category && <ColorDot color={t.category.color} />}
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{t.name}</p>
                                        {t.category && <p className="text-xs text-muted-foreground">{t.category.name}</p>}
                                    </div>
                                </div>
                                <label className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground">
                                    <input
                                        type="checkbox"
                                        checked={entries[idx]?.skip ?? false}
                                        onChange={(e) => updateEntry(idx, { skip: e.target.checked })}
                                        className="size-4"
                                    />
                                    No aplica
                                </label>
                            </div>
                            <div className="relative">
                                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">$</span>
                                <CurrencyInput
                                    value={entries[idx]?.amount ?? 0}
                                    onChange={(v) => updateEntry(idx, { amount: v })}
                                    disabled={entries[idx]?.skip ?? false}
                                    className={cn(INPUT_CLASS, 'pl-7')}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button variant="outline" onClick={onClose} disabled={submitting} className="h-11 sm:h-10">
                        Cancelar
                    </Button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex h-11 items-center justify-center rounded-md bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 sm:h-10"
                        style={{ color: onBrand.hex }}
                    >
                        {submitting ? 'Registrando...' : 'Registrar gastos'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/** Create or edit one expense. */
export function ExpenseFormDialog({
    open,
    onClose,
    categories,
    branches,
    userBranchId,
    expense,
    showNotes = false,
    editLabel = 'Guardar',
}: {
    open: boolean;
    onClose: () => void;
    categories: ExpenseCategory[];
    branches: Array<{ id: number; name: string }>;
    userBranchId: number | null;
    expense?: Expense;
    /** The full ledger also asks for a free note; the dashboard does not. */
    showNotes?: boolean;
    editLabel?: string;
}) {
    const onBrand = useOnBrandColor();
    const isEdit = Boolean(expense);
    const isAdmin = branches.length > 0;

    const { data, setData, post, put, processing, reset, errors } = useForm({
        expense_category_id: expense?.expense_category_id ? String(expense.expense_category_id) : '',
        description: expense?.description ?? '',
        amount: expense?.amount ?? 0,
        expense_date: expense?.expense_date?.slice(0, 10) ?? todayStr(),
        branch_id: expense?.branch_id ? String(expense.branch_id) : userBranchId ? String(userBranchId) : '',
        notes: expense?.notes ?? '',
    });

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit && expense) {
            put(`/expenses/${expense.id}`, { onSuccess: handleClose, preserveScroll: true });
        } else {
            post('/expenses', { onSuccess: handleClose, preserveScroll: true });
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Editar gasto' : 'Registrar gasto'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <LabeledField id="expense-category" label="Categoría" error={errors.expense_category_id}>
                        <Select value={data.expense_category_id} onValueChange={(v) => setData('expense_category_id', v)}>
                            <SelectTrigger id="expense-category" className={SELECT_TRIGGER}>
                                <SelectValue placeholder="Sin categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin categoría</SelectItem>
                                {categories.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        <div className="flex items-center gap-2">
                                            <ColorDot color={c.color} className="size-2" />
                                            {c.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </LabeledField>

                    <LabeledField id="expense-description" label="Descripción" error={errors.description}>
                        <input
                            id="expense-description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Ej: Arriendo local"
                            className={INPUT_CLASS}
                        />
                    </LabeledField>

                    <LabeledField id="expense-amount" label="Monto" error={errors.amount}>
                        <div className="relative">
                            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">$</span>
                            <CurrencyInput
                                id="expense-amount"
                                value={data.amount}
                                onChange={(v) => setData('amount', v)}
                                placeholder="0"
                                className={cn(INPUT_CLASS, 'pl-7')}
                            />
                        </div>
                    </LabeledField>

                    <LabeledField id="expense-date" label="Fecha" error={errors.expense_date}>
                        <input
                            id="expense-date"
                            type="date"
                            value={data.expense_date}
                            onChange={(e) => setData('expense_date', e.target.value)}
                            className={INPUT_CLASS}
                        />
                    </LabeledField>

                    {isAdmin && (
                        <LabeledField id="expense-branch" label="Sucursal" error={errors.branch_id}>
                            <Select value={data.branch_id} onValueChange={(v) => setData('branch_id', v)}>
                                <SelectTrigger id="expense-branch" className={SELECT_TRIGGER}>
                                    <SelectValue placeholder="Selecciona una sucursal" />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches.map((b) => (
                                        <SelectItem key={b.id} value={String(b.id)}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </LabeledField>
                    )}

                    {showNotes && (
                        <LabeledField id="expense-notes" label="Notas (opcional)">
                            <textarea
                                id="expense-notes"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                rows={2}
                                placeholder="Observaciones adicionales..."
                                className="w-full rounded-lg border border-border/60 bg-white px-3 py-2 text-base text-black focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none sm:text-sm dark:bg-neutral-800 dark:text-neutral-100"
                            />
                        </LabeledField>
                    )}

                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={processing} className="h-11 sm:h-10">
                            Cancelar
                        </Button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex h-11 items-center justify-center rounded-md bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 sm:h-10"
                            style={{ color: onBrand.hex }}
                        >
                            {processing ? 'Guardando...' : isEdit ? editLabel : 'Registrar'}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
