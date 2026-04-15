import { DeleteWithReasonDialog } from '@/components/common/DeleteWithReasonDialog';
import { usePolling } from '@/hooks/use-polling';
import PaginationFooter from '@/components/common/PaginationFooter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Expense, type ExpenseCategory, type ExpenseTemplate, type PaginatedData } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, ChevronDown, HelpCircle, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

interface Props {
    expenses: PaginatedData<Expense>;
    pendingTemplates: ExpenseTemplate[];
    categories: ExpenseCategory[];
    branches: Array<{ id: number; name: string }>;
    currentMonth: string;
    filters: {
        branch?: string;
        category?: string;
        start_date?: string;
        end_date?: string;
    };
    userBranchId: number | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Gastos', href: '/expenses' },
];

function cop(value: number): string {
    return `$ ${Number(value).toLocaleString('es-CO')}`;
}

function todayStr(): string {
    return new Date().toISOString().slice(0, 10);
}

// ─── RegisterMonthlyExpensesModal ──────────────────────────────────────────────

interface RegisterMonthlyExpensesModalProps {
    open: boolean;
    onClose: () => void;
    templates: ExpenseTemplate[];
    currentMonth: string;
    defaultBranchId: number | null;
    branches: Array<{ id: number; name: string }>;
}

interface MonthlyExpenseEntry {
    template_id: number;
    amount: number;
    skip: boolean;
}

function RegisterMonthlyExpensesModal({ open, onClose, templates, currentMonth }: RegisterMonthlyExpensesModalProps) {
    const [entries, setEntries] = useState<MonthlyExpenseEntry[]>(() =>
        templates.map((t) => ({ template_id: t.id, amount: t.reference_amount, skip: false })),
    );
    const [submitting, setSubmitting] = useState(false);

    const updateEntry = (idx: number, patch: Partial<MonthlyExpenseEntry>) => {
        setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
    };

    const handleSubmit = () => {
        const payload = entries.filter((e) => !e.skip).map((e) => ({ template_id: e.template_id, amount: e.amount }));
        if (payload.length === 0) {
            onClose();
            return;
        }
        setSubmitting(true);
        router.post(
            '/expenses/batch',
            { expenses: payload },
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
                        <div
                            key={t.id}
                            className={`rounded-lg border p-3 ${entries[idx]?.skip ? 'opacity-50' : ''} border-neutral-200 dark:border-neutral-700`}
                        >
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    {t.category && (
                                        <span
                                            className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                                            style={{ backgroundColor: t.category.color ?? '#94a3b8' }}
                                        />
                                    )}
                                    <div>
                                        <p className="text-sm font-medium">{t.name}</p>
                                        {t.category && <p className="text-xs text-muted-foreground">{t.category.name}</p>}
                                    </div>
                                </div>
                                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <input
                                        type="checkbox"
                                        checked={entries[idx]?.skip ?? false}
                                        onChange={(e) => updateEntry(idx, { skip: e.target.checked })}
                                        className="h-3.5 w-3.5"
                                    />
                                    No aplica
                                </label>
                            </div>
                            <CurrencyInput
                                value={entries[idx]?.amount ?? 0}
                                onChange={(v) => updateEntry(idx, { amount: v })}
                                disabled={entries[idx]?.skip ?? false}
                                className="w-full"
                            />
                        </div>
                    ))}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={submitting}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting ? 'Registrando...' : 'Registrar gastos'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── CreateExpenseModal ────────────────────────────────────────────────────────

interface CreateExpenseModalProps {
    open: boolean;
    onClose: () => void;
    categories: ExpenseCategory[];
    branches: Array<{ id: number; name: string }>;
    userBranchId: number | null;
    initialData?: {
        expense_category_id: string;
        description: string;
        amount: number;
        expense_date: string;
        branch_id: string;
        notes: string;
    };
    expenseId?: number;
}

function CreateExpenseModal({ open, onClose, categories, branches, userBranchId, initialData, expenseId }: CreateExpenseModalProps) {
    const isEdit = Boolean(expenseId);
    const isAdmin = branches.length > 0;

    const { data, setData, post, put, processing, reset, errors } = useForm({
        expense_category_id: initialData?.expense_category_id ?? '',
        description: initialData?.description ?? '',
        amount: initialData?.amount ?? 0,
        expense_date: initialData?.expense_date ?? todayStr(),
        branch_id: initialData?.branch_id ?? (userBranchId ? String(userBranchId) : ''),
        notes: initialData?.notes ?? '',
    });

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit && expenseId) {
            put(`/expenses/${expenseId}`, {
                onSuccess: handleClose,
                preserveScroll: true,
            });
        } else {
            post('/expenses', {
                onSuccess: handleClose,
                preserveScroll: true,
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Editar gasto' : 'Registrar gasto'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Category */}
                    <div className="space-y-1.5">
                        <Label>Categoría</Label>
                        <Select value={data.expense_category_id} onValueChange={(v) => setData('expense_category_id', v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona una categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin categoría</SelectItem>
                                {categories.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        <div className="flex items-center gap-2">
                                            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: c.color ?? '#94a3b8' }} />
                                            {c.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.expense_category_id && <p className="text-xs text-red-600">{errors.expense_category_id}</p>}
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <Label>Descripción</Label>
                        <Input value={data.description} onChange={(e) => setData('description', e.target.value)} placeholder="Ej: Arriendo local" />
                        {errors.description && <p className="text-xs text-red-600">{errors.description}</p>}
                    </div>

                    {/* Amount */}
                    <div className="space-y-1.5">
                        <Label>Monto</Label>
                        <CurrencyInput value={data.amount} onChange={(v) => setData('amount', v)} placeholder="0" />
                        {errors.amount && <p className="text-xs text-red-600">{errors.amount}</p>}
                    </div>

                    {/* Date */}
                    <div className="space-y-1.5">
                        <Label>Fecha</Label>
                        <Input type="date" value={data.expense_date} onChange={(e) => setData('expense_date', e.target.value)} />
                        {errors.expense_date && <p className="text-xs text-red-600">{errors.expense_date}</p>}
                    </div>

                    {/* Branch — admin only */}
                    {isAdmin && (
                        <div className="space-y-1.5">
                            <Label>Sucursal</Label>
                            <Select value={data.branch_id} onValueChange={(v) => setData('branch_id', v)}>
                                <SelectTrigger>
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
                            {errors.branch_id && <p className="text-xs text-red-600">{errors.branch_id}</p>}
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <Label>Notas (opcional)</Label>
                        <textarea
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={2}
                            placeholder="Observaciones adicionales..."
                            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose} disabled={processing}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ExpensesIndex({ expenses, pendingTemplates, categories, branches, currentMonth, filters, userBranchId }: Props) {
    usePolling(['expenses', 'pendingTemplates'], 60_000);

    const isAdmin = branches.length > 0;

    const [filterCategory, setFilterCategory] = useState(filters.category || 'all');
    const [filterBranch, setFilterBranch] = useState(filters.branch || 'all');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editExpense, setEditExpense] = useState<Expense | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
    const [deleting, setDeleting] = useState(false);

    const hasActiveFilters = filterCategory !== 'all' || filterBranch !== 'all' || startDate !== '' || endDate !== '';
    const activeFilterCount = [filterCategory !== 'all', filterBranch !== 'all', startDate !== '', endDate !== ''].filter(Boolean).length;

    const applyFilters = () => {
        router.get(
            '/expenses',
            {
                category: filterCategory === 'all' ? '' : filterCategory,
                branch: filterBranch === 'all' ? '' : filterBranch,
                start_date: startDate,
                end_date: endDate,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const clearFilters = () => {
        setFilterCategory('all');
        setFilterBranch('all');
        setStartDate('');
        setEndDate('');
        router.get('/expenses');
    };

    const handleDelete = (reason: string) => {
        if (!deleteTarget) return;
        setDeleting(true);
        router.delete(`/expenses/${deleteTarget.id}`, {
            data: { deletion_reason: reason },
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gastos" />

            <DeleteWithReasonDialog
                open={Boolean(deleteTarget)}
                title="Eliminar gasto"
                description={
                    deleteTarget && (
                        <span>
                            ¿Eliminar <strong>{deleteTarget.description || 'este gasto'}</strong> por <strong>{cop(deleteTarget.amount)}</strong>?
                            Esta acción no se puede deshacer.
                        </span>
                    )
                }
                processing={deleting}
                onConfirm={handleDelete}
                onClose={() => setDeleteTarget(null)}
            />

            {/* Modals */}
            {showRegisterModal && (
                <RegisterMonthlyExpensesModal
                    open={showRegisterModal}
                    onClose={() => setShowRegisterModal(false)}
                    templates={pendingTemplates}
                    currentMonth={currentMonth}
                    defaultBranchId={userBranchId}
                    branches={branches}
                />
            )}

            <CreateExpenseModal
                open={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                categories={categories}
                branches={branches}
                userBranchId={userBranchId}
            />

            {editExpense && (
                <CreateExpenseModal
                    open={Boolean(editExpense)}
                    onClose={() => setEditExpense(null)}
                    categories={categories}
                    branches={branches}
                    userBranchId={userBranchId}
                    expenseId={editExpense.id}
                    initialData={{
                        expense_category_id: editExpense.expense_category_id ? String(editExpense.expense_category_id) : '',
                        description: editExpense.description ?? '',
                        amount: editExpense.amount,
                        expense_date: editExpense.expense_date.slice(0, 10),
                        branch_id: String(editExpense.branch_id),
                        notes: editExpense.notes ?? '',
                    }}
                />
            )}

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h1 className="text-2xl font-semibold">Gastos</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">Historial y control de todos tus gastos operativos</p>
                    </div>
                    <div className="flex gap-2">
                        {pendingTemplates.length > 0 && (
                            <Button variant="outline" onClick={() => setShowRegisterModal(true)}>
                                Registrar gastos fijos
                            </Button>
                        )}
                        <Button onClick={() => setShowCreateModal(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Registrar gasto
                        </Button>
                    </div>
                </div>

                {/* Pending templates banner */}
                {pendingTemplates.length > 0 && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-900/30">
                        <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                            <span>
                                Tienes <strong>{pendingTemplates.length}</strong> gasto{pendingTemplates.length > 1 ? 's' : ''} fijo
                                {pendingTemplates.length > 1 ? 's' : ''} sin registrar para <strong>{currentMonth}</strong>.
                            </span>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-200"
                            onClick={() => setShowRegisterModal(true)}
                        >
                            Registrar ahora
                        </Button>
                    </div>
                )}

                {/* Collapsible Filters */}
                <Collapsible defaultOpen={hasActiveFilters}>
                    <Card>
                        <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer select-none">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CardTitle>Filtros</CardTitle>
                                        {activeFilterCount > 0 && (
                                            <Badge variant="secondary" className="text-xs">
                                                {activeFilterCount} activo{activeFilterCount !== 1 ? 's' : ''}
                                            </Badge>
                                        )}
                                    </div>
                                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
                                </div>
                            </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <CardContent>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium">Categoría</label>
                                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todas" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todas las categorías</SelectItem>
                                                {categories.map((c) => (
                                                    <SelectItem key={c.id} value={String(c.id)}>
                                                        {c.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {isAdmin && (
                                        <div>
                                            <label className="mb-1 block text-sm font-medium">Sucursal</label>
                                            <Select value={filterBranch} onValueChange={setFilterBranch}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Todas" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todas las sucursales</SelectItem>
                                                    {branches.map((b) => (
                                                        <SelectItem key={b.id} value={String(b.id)}>
                                                            {b.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="mb-1 block text-sm font-medium">Fecha desde</label>
                                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium">Fecha hasta</label>
                                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                    </div>
                                </div>

                                <div className="mt-4 flex gap-2">
                                    <Button onClick={applyFilters}>Filtrar</Button>
                                    <Button variant="outline" onClick={clearFilters}>
                                        <X className="mr-2 h-4 w-4" />
                                        Limpiar
                                    </Button>
                                </div>
                            </CardContent>
                        </CollapsibleContent>
                    </Card>
                </Collapsible>

                {/* Summary bar */}
                {expenses.data.length > 0 && (
                    <div className="flex flex-wrap items-center gap-4 rounded-lg bg-neutral-50 px-4 py-2.5 text-sm dark:bg-neutral-900">
                        <span className="text-muted-foreground">Total mostrado:</span>
                        <span className="font-semibold">{cop(expenses.data.reduce((sum, e) => sum + Number(e.amount), 0))}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">
                            {expenses.total} gasto{expenses.total !== 1 ? 's' : ''} en total
                        </span>
                    </div>
                )}

                {/* Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Gastos ({expenses.total})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Desktop table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-neutral-200 text-left text-xs font-medium text-muted-foreground dark:border-neutral-700">
                                        <th className="pr-4 pb-2">Fecha</th>
                                        <th className="pr-4 pb-2">Categoría</th>
                                        <th className="pr-4 pb-2">Descripción</th>
                                        <th className="pr-4 pb-2 text-right">Monto</th>
                                        <th className="pr-4 pb-2">
                                            <span className="inline-flex items-center gap-1">
                                                Origen
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">
                                                        Recurrente: gasto fijo mensual. Puntual: gasto registrado manualmente.
                                                    </TooltipContent>
                                                </Tooltip>
                                            </span>
                                        </th>
                                        <th className="pb-2">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center">
                                                {hasActiveFilters ? (
                                                    <div>
                                                        <p className="text-muted-foreground">
                                                            No se encontraron gastos con los filtros seleccionados
                                                        </p>
                                                        <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>
                                                            Limpiar filtros
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <p className="text-base font-medium">Sin gastos registrados</p>
                                                        <p className="mt-1 text-sm text-muted-foreground">
                                                            Comienza registrando tus gastos operativos del mes
                                                        </p>
                                                        <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                                                            <Plus className="mr-2 h-4 w-4" />
                                                            Registrar primer gasto
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ) : (
                                        expenses.data.map((expense) => (
                                            <tr key={expense.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                                                <td className="py-2 pr-4 whitespace-nowrap">
                                                    {format(new Date(expense.expense_date), 'dd/MM/yyyy', { locale: es })}
                                                </td>
                                                <td className="py-2 pr-4">
                                                    {expense.category ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span
                                                                className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                                                                style={{ backgroundColor: expense.category.color ?? '#94a3b8' }}
                                                            />
                                                            <span>{expense.category.name}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                                <td className="max-w-[200px] truncate py-2 pr-4" title={expense.description ?? ''}>
                                                    {expense.description ?? '—'}
                                                </td>
                                                <td className="py-2 pr-4 text-right font-semibold">{cop(expense.amount)}</td>
                                                <td className="py-2 pr-4">
                                                    {expense.template ? (
                                                        <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                            Recurrente
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                            Puntual
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="py-2">
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => setEditExpense(expense)}
                                                            title="Editar"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-600 hover:text-red-700"
                                                            onClick={() => setDeleteTarget(expense)}
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="block space-y-3 md:hidden">
                            {expenses.data.length === 0 ? (
                                <div className="py-12 text-center">
                                    {hasActiveFilters ? (
                                        <div>
                                            <p className="text-sm text-muted-foreground">No se encontraron gastos con los filtros seleccionados</p>
                                            <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>
                                                Limpiar filtros
                                            </Button>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-base font-medium">Sin gastos registrados</p>
                                            <p className="mt-1 text-sm text-muted-foreground">Comienza registrando tus gastos operativos del mes</p>
                                            <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Registrar primer gasto
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                expenses.data.map((expense) => (
                                    <div
                                        key={expense.id}
                                        className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                                    >
                                        <div className="mb-2 flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-medium">{expense.description ?? '—'}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {format(new Date(expense.expense_date), 'dd/MM/yyyy', { locale: es })}
                                                </p>
                                            </div>
                                            <p className="font-bold text-neutral-900 dark:text-neutral-100">{cop(expense.amount)}</p>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {expense.category ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span
                                                            className="inline-block h-2 w-2 rounded-full"
                                                            style={{ backgroundColor: expense.category.color ?? '#94a3b8' }}
                                                        />
                                                        <span className="text-sm">{expense.category.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">Sin categoría</span>
                                                )}
                                                {expense.template ? (
                                                    <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                        Recurrente
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Puntual</Badge>
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditExpense(expense)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-600 hover:text-red-700"
                                                    onClick={() => setDeleteTarget(expense)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <PaginationFooter
                            data={{
                                ...expenses,
                                resourceLabel: 'gastos',
                            }}
                        />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
