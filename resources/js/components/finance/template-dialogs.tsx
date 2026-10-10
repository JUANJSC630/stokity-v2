import { INPUT_CLASS, LabeledField, SELECT_TRIGGER } from '@/components/sales/form-fields';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { cn } from '@/lib/utils';
import { type ExpenseCategory, type ExpenseTemplate } from '@/types';
import { useForm } from '@inertiajs/react';
import toast from 'react-hot-toast';
import { todayStr } from './expense-dialogs';
import { ColorDot } from './finance-parts';

type Branches = Array<{ id: number; name: string }>;

function PrimaryButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
    const onBrand = useOnBrandColor();

    return (
        <button
            type="submit"
            disabled={disabled}
            className="flex h-11 items-center justify-center rounded-md bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 sm:h-10"
            style={{ color: onBrand.hex }}
        >
            {children}
        </button>
    );
}

function CategorySelect({
    id,
    value,
    onChange,
    categories,
}: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    categories: ExpenseCategory[];
}) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger id={id} className={SELECT_TRIGGER}>
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
    );
}

function BranchSelect({ id, value, onChange, branches }: { id: string; value: string; onChange: (value: string) => void; branches: Branches }) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger id={id} className={SELECT_TRIGGER}>
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
    );
}

/** Create or edit a recurring (fixed) expense. */
export function TemplateFormDialog({
    open,
    onClose,
    categories,
    branches,
    userBranchId,
    template,
}: {
    open: boolean;
    onClose: () => void;
    categories: ExpenseCategory[];
    branches: Branches;
    userBranchId: number | null;
    template?: ExpenseTemplate;
}) {
    const isEdit = Boolean(template);
    const isAdmin = branches.length > 0;

    const { data, setData, post, put, processing, reset, errors } = useForm({
        name: template?.name ?? '',
        expense_category_id: template?.expense_category_id ? String(template.expense_category_id) : '',
        reference_amount: template?.reference_amount ?? 0,
        due_day: template?.due_day ? String(template.due_day) : '',
        branch_id: template?.branch_id ? String(template.branch_id) : userBranchId ? String(userBranchId) : '',
        is_active: template?.is_active ?? true,
    });

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit && template) {
            put(`/expense-templates/${template.id}`, { onSuccess: handleClose, preserveScroll: true });
        } else {
            post('/expense-templates', { onSuccess: handleClose, preserveScroll: true });
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Editar gasto fijo' : 'Nuevo gasto fijo'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <LabeledField id="template-name" label="Nombre" error={errors.name}>
                        <input
                            id="template-name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Ej: Arriendo local"
                            className={INPUT_CLASS}
                        />
                    </LabeledField>

                    <LabeledField id="template-category" label="Categoría" error={errors.expense_category_id}>
                        <CategorySelect
                            id="template-category"
                            value={data.expense_category_id}
                            onChange={(v) => setData('expense_category_id', v)}
                            categories={categories}
                        />
                    </LabeledField>

                    <LabeledField id="template-amount" label="Monto de referencia" error={errors.reference_amount}>
                        <div className="relative">
                            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">$</span>
                            <CurrencyInput
                                id="template-amount"
                                value={data.reference_amount}
                                onChange={(v) => setData('reference_amount', v)}
                                placeholder="0"
                                className={cn(INPUT_CLASS, 'pl-7')}
                            />
                        </div>
                    </LabeledField>

                    <LabeledField id="template-due-day" label="Día de vencimiento (opcional)" error={errors.due_day}>
                        <Select value={data.due_day} onValueChange={(v) => setData('due_day', v === 'none' ? '' : v)}>
                            <SelectTrigger id="template-due-day" className={SELECT_TRIGGER}>
                                <SelectValue placeholder="Sin día específico" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin día específico</SelectItem>
                                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                                    <SelectItem key={d} value={String(d)}>
                                        Día {d} de cada mes
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Indica cuándo vence este gasto para saber si está al día o atrasado.</p>
                    </LabeledField>

                    {isAdmin && (
                        <LabeledField id="template-branch" label="Sucursal" error={errors.branch_id}>
                            <BranchSelect id="template-branch" value={data.branch_id} onChange={(v) => setData('branch_id', v)} branches={branches} />
                        </LabeledField>
                    )}

                    {isEdit && (
                        <label htmlFor="is_active" className="flex min-h-11 items-center gap-3 rounded-xl border border-border/60 px-3 text-sm">
                            <input
                                id="is_active"
                                type="checkbox"
                                checked={Boolean(data.is_active)}
                                onChange={(e) => setData('is_active', e.target.checked)}
                                className="size-4"
                            />
                            Activa
                        </label>
                    )}

                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={processing} className="h-11 sm:h-10">
                            Cancelar
                        </Button>
                        <PrimaryButton disabled={processing}>
                            {processing ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear gasto fijo'}
                        </PrimaryButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/** Register this month's payment of one fixed expense, with its reference amount ready to adjust. */
export function QuickRegisterDialog({
    template,
    branches,
    userBranchId,
    onClose,
}: {
    template: ExpenseTemplate | null;
    branches: Branches;
    userBranchId: number | null;
    onClose: () => void;
}) {
    const isAdmin = branches.length > 0;

    const { data, setData, post, processing, reset, errors } = useForm({
        expense_category_id: template?.expense_category_id ? String(template.expense_category_id) : '',
        description: template?.name ?? '',
        amount: template?.reference_amount ?? 0,
        expense_date: todayStr(),
        branch_id: template?.branch_id ? String(template.branch_id) : userBranchId ? String(userBranchId) : '',
        notes: '',
        expense_template_id: template?.id ? String(template.id) : '',
    });

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/expenses', {
            onSuccess: () => {
                toast.success('Gasto registrado correctamente.');
                handleClose();
            },
            preserveScroll: true,
        });
    };

    return (
        <Dialog open={Boolean(template)} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Registrar pago</DialogTitle>
                    <DialogDescription>{template?.name}</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <LabeledField id="quick-amount" label="Monto" error={errors.amount}>
                        <div className="relative">
                            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">$</span>
                            <CurrencyInput
                                id="quick-amount"
                                value={data.amount}
                                onChange={(v) => setData('amount', v)}
                                className={cn(INPUT_CLASS, 'pl-7')}
                            />
                        </div>
                    </LabeledField>

                    <LabeledField id="quick-date" label="Fecha de pago" error={errors.expense_date}>
                        <input
                            id="quick-date"
                            type="date"
                            value={data.expense_date}
                            onChange={(e) => setData('expense_date', e.target.value)}
                            className={INPUT_CLASS}
                        />
                    </LabeledField>

                    {isAdmin && (
                        <LabeledField id="quick-branch" label="Sucursal">
                            <BranchSelect id="quick-branch" value={data.branch_id} onChange={(v) => setData('branch_id', v)} branches={branches} />
                        </LabeledField>
                    )}

                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={processing} className="h-11 sm:h-10">
                            Cancelar
                        </Button>
                        <PrimaryButton disabled={processing}>{processing ? 'Registrando...' : 'Registrar pago'}</PrimaryButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/** A yes/no question about a fixed expense, with the consequence written out. */
export function ConfirmActionDialog({
    open,
    title,
    description,
    confirmLabel = 'Confirmar',
    destructive = false,
    onConfirm,
    onCancel,
}: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-2">
                    <Button variant="outline" onClick={onCancel} className="h-11 sm:h-10">
                        Cancelar
                    </Button>
                    <Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm} className="h-11 sm:h-10">
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
