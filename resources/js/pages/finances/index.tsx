import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Expense, type ExpenseCategory, type ExpenseTemplate } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, DollarSign, HelpCircle, Pencil, Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ExpenseByCategoryRow {
    category: string;
    icon: string | null;
    color: string | null;
    amount: number;
    pct: number;
}

interface Props {
    period: 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'custom';
    dateFrom: string;
    dateTo: string;
    periodLabel: string;
    selectedBranch: number | null;
    branches: Array<{ id: number; name: string }>;
    revenue: number;
    returnsTotal: number;
    netRevenue: number;
    cogs: number;
    grossProfit: number;
    grossMarginPct: number;
    totalExpenses: number;
    netProfit: number;
    hasCOGSWarning: boolean;
    expensesByCategory: ExpenseByCategoryRow[];
    // Inline expense management
    expenses: Expense[];
    pendingTemplates: ExpenseTemplate[];
    categories: ExpenseCategory[];
    currentMonth: string;
    userBranchId: number | null;
    receivables: number;
    activeCreditsCount: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Finanzas', href: '/finances' },
];

function cop(value: number): string {
    return `$ ${Number(value).toLocaleString('es-CO')}`;
}

function todayStr(): string {
    return new Date().toISOString().slice(0, 10);
}

type PeriodOption = 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'custom';

const PERIOD_LABELS: Record<PeriodOption, string> = {
    this_week: 'Esta semana',
    this_month: 'Este mes',
    last_month: 'Mes anterior',
    this_year: 'Este año',
    custom: 'Personalizado',
};

function HelpTip({ text }: { text: string }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <HelpCircle className="inline h-3.5 w-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent side="top">{text}</TooltipContent>
        </Tooltip>
    );
}

// ─── RegisterMonthlyExpensesModal ──────────────────────────────────────────────

interface MonthlyExpenseEntry {
    template_id: number;
    amount: number;
    skip: boolean;
}

function RegisterMonthlyExpensesModal({
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

// ─── ExpenseFormModal ──────────────────────────────────────────────────────────

function ExpenseFormModal({
    open,
    onClose,
    categories,
    branches,
    userBranchId,
    expense,
}: {
    open: boolean;
    onClose: () => void;
    categories: ExpenseCategory[];
    branches: Array<{ id: number; name: string }>;
    userBranchId: number | null;
    expense?: Expense;
}) {
    const isEdit = Boolean(expense);
    const isAdmin = branches.length > 0;

    const { data, setData, post, put, processing, reset, errors } = useForm({
        expense_category_id: expense?.expense_category_id ? String(expense.expense_category_id) : '',
        description: expense?.description ?? '',
        amount: expense?.amount ?? 0,
        expense_date: expense?.expense_date?.slice(0, 10) ?? todayStr(),
        branch_id: expense?.branch_id ? String(expense.branch_id) : (userBranchId ? String(userBranchId) : ''),
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
                    <div className="space-y-1.5">
                        <Label>Categoría</Label>
                        <Select value={data.expense_category_id} onValueChange={(v) => setData('expense_category_id', v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Sin categoría" />
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
                    </div>

                    <div className="space-y-1.5">
                        <Label>Descripción</Label>
                        <Input value={data.description} onChange={(e) => setData('description', e.target.value)} placeholder="Ej: Arriendo local" />
                    </div>

                    <div className="space-y-1.5">
                        <Label>Monto</Label>
                        <CurrencyInput value={data.amount} onChange={(v) => setData('amount', v)} placeholder="0" />
                        {errors.amount && <p className="text-xs text-red-600">{errors.amount}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label>Fecha</Label>
                        <Input type="date" value={data.expense_date} onChange={(e) => setData('expense_date', e.target.value)} />
                    </div>

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

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose} disabled={processing}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Guardando...' : isEdit ? 'Guardar' : 'Registrar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function FinancesIndex({
    period,
    dateFrom,
    dateTo,
    selectedBranch,
    branches,
    revenue,
    returnsTotal,
    netRevenue,
    cogs,
    grossProfit,
    grossMarginPct,
    totalExpenses,
    netProfit,
    hasCOGSWarning,
    expensesByCategory,
    expenses,
    pendingTemplates,
    categories,
    currentMonth,
    userBranchId,
    receivables,
    activeCreditsCount,
}: Props) {
    const [localPeriod, setLocalPeriod] = useState<PeriodOption>(period);
    const [localBranch, setLocalBranch] = useState<string>(selectedBranch ? String(selectedBranch) : 'all');
    const [dateFromLocal, setDateFromLocal] = useState(dateFrom);
    const [dateToLocal, setDateToLocal] = useState(dateTo);

    const [showMonthlyModal, setShowMonthlyModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editExpense, setEditExpense] = useState<Expense | null>(null);

    const applyFilters = (newPeriod?: PeriodOption, newBranch?: string) => {
        const p = newPeriod ?? localPeriod;
        const b = newBranch ?? localBranch;
        router.get(
            '/finances',
            {
                period: p,
                branch: b === 'all' ? '0' : b,
                date_from: p === 'custom' ? dateFromLocal : '',
                date_to: p === 'custom' ? dateToLocal : '',
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handlePeriodChange = (p: PeriodOption) => {
        setLocalPeriod(p);
        if (p !== 'custom') applyFilters(p, localBranch);
    };

    const handleBranchChange = (val: string) => {
        setLocalBranch(val);
        applyFilters(localPeriod, val);
    };

    const handleDeleteExpense = (id: number) => {
        if (!window.confirm('¿Eliminar este gasto? Esta acción no se puede deshacer.')) return;
        router.delete(`/expenses/${id}`, { preserveScroll: true });
    };

    const netProfitPositive = netProfit >= 0;
    const showReceivables = receivables > 0 || activeCreditsCount > 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Finanzas" />

            {/* Modals */}
            {showMonthlyModal && (
                <RegisterMonthlyExpensesModal
                    open={showMonthlyModal}
                    onClose={() => setShowMonthlyModal(false)}
                    templates={pendingTemplates}
                    currentMonth={currentMonth}
                />
            )}
            <ExpenseFormModal
                open={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                categories={categories}
                branches={branches}
                userBranchId={userBranchId}
            />
            {editExpense && (
                <ExpenseFormModal
                    open={true}
                    onClose={() => setEditExpense(null)}
                    categories={categories}
                    branches={branches}
                    userBranchId={userBranchId}
                    expense={editExpense}
                />
            )}

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header + period selector */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">Finanzas</h1>
                        <p className="text-sm text-muted-foreground">Resumen de ingresos, gastos y rentabilidad del negocio</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Period dropdown */}
                        <Select value={localPeriod} onValueChange={(v) => handlePeriodChange(v as PeriodOption)}>
                            <SelectTrigger className="w-44">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.keys(PERIOD_LABELS) as PeriodOption[]).map((p) => (
                                    <SelectItem key={p} value={p}>
                                        {PERIOD_LABELS[p]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {/* Branch selector */}
                        {branches.length > 0 && (
                            <Select value={localBranch} onValueChange={handleBranchChange}>
                                <SelectTrigger className="w-44">
                                    <SelectValue placeholder="Todas las sucursales" />
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
                        )}
                    </div>
                </div>

                {/* Custom date range */}
                {localPeriod === 'custom' && (
                    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-neutral-50 px-4 py-3 dark:bg-neutral-900">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">Desde</label>
                            <Input type="date" value={dateFromLocal} onChange={(e) => setDateFromLocal(e.target.value)} className="w-40" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">Hasta</label>
                            <Input type="date" value={dateToLocal} onChange={(e) => setDateToLocal(e.target.value)} className="w-40" />
                        </div>
                        <Button size="sm" onClick={() => applyFilters()}>
                            Aplicar
                        </Button>
                    </div>
                )}

                {/* COGS warning */}
                {hasCOGSWarning && (
                    <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200">
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <p className="text-sm">
                            Los datos de costo de productos pueden ser estimados en ventas anteriores.
                        </p>
                    </div>
                )}

                {/* KPI Cards */}
                <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${showReceivables ? 'lg:grid-cols-3 xl:grid-cols-5' : 'lg:grid-cols-4'}`}>
                    <Card className="border-blue-100 dark:border-blue-900">
                        <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Ingresos netos</p>
                                    <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{cop(netRevenue)}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Total de ventas menos devoluciones del período</p>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/40">
                                    <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-green-100 dark:border-green-900">
                        <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Ganancia bruta</p>
                                    <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{cop(grossProfit)}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Lo que queda después de descontar el costo de los productos vendidos</p>
                                    <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                        {grossMarginPct.toFixed(1)}% de margen
                                    </span>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/40">
                                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-orange-100 dark:border-orange-900">
                        <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Gastos</p>
                                    <p className="mt-1 text-2xl font-bold text-orange-600 dark:text-orange-400">{cop(totalExpenses)}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Total registrado en gastos operativos &bull; {expenses.length} registro{expenses.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-900/40">
                                    <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={`border-2 ${netProfitPositive ? 'border-green-300 dark:border-green-700' : 'border-red-300 dark:border-red-700'}`}>
                        <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Ganancia neta</p>
                                    <p
                                        className={`mt-1 text-3xl font-extrabold ${netProfitPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                                    >
                                        {cop(netProfit)}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">Lo que realmente ganaste luego de todos los costos y gastos</p>
                                </div>
                                <div
                                    className={`flex h-10 w-10 items-center justify-center rounded-full ${netProfitPositive ? 'bg-green-50 dark:bg-green-900/40' : 'bg-red-50 dark:bg-red-900/40'}`}
                                >
                                    {netProfitPositive ? (
                                        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                                    ) : (
                                        <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Cartera por cobrar */}
                    {showReceivables && (
                        <Card className="border-purple-100 dark:border-purple-900">
                            <CardContent className="pt-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Cartera por cobrar</p>
                                        <p className="mt-1 text-2xl font-bold text-purple-600 dark:text-purple-400">{cop(receivables)}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {activeCreditsCount} crédito{activeCreditsCount !== 1 ? 's' : ''} activo{activeCreditsCount !== 1 ? 's' : ''}
                                            {' — '}
                                            <a href="/credits" className="text-purple-600 hover:underline dark:text-purple-400">Ver créditos</a>
                                        </p>
                                    </div>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-900/40">
                                        <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Main content: P&L + Expenses by category + Expenses list */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {/* P&L Statement */}
                    <Card>
                        <CardHeader>
                            <CardTitle>¿Cómo le fue al negocio?</CardTitle>
                            <CardDescription>Desglose de ingresos y gastos del período seleccionado</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <table className="w-full text-sm">
                                <tbody>
                                    <tr className="border-b border-neutral-100 dark:border-neutral-800">
                                        <td className="py-2 text-muted-foreground">
                                            Ingresos por ventas <HelpTip text="Todo el dinero que ingresó por ventas en este período" />
                                        </td>
                                        <td className="py-2 text-right">{cop(revenue)}</td>
                                    </tr>
                                    {returnsTotal > 0 && (
                                        <tr className="border-b border-neutral-100 dark:border-neutral-800">
                                            <td className="py-2 text-muted-foreground">(-) Devoluciones</td>
                                            <td className="py-2 text-right text-red-600 dark:text-red-400">{cop(returnsTotal)}</td>
                                        </tr>
                                    )}
                                    <tr className="border-b-2 border-neutral-200 dark:border-neutral-700">
                                        <td className="py-2 font-semibold">= Ingresos netos</td>
                                        <td className="py-2 text-right font-semibold">{cop(netRevenue)}</td>
                                    </tr>
                                    <tr className="border-b border-neutral-100 dark:border-neutral-800">
                                        <td className="py-2 text-muted-foreground">
                                            (-) Costo de lo vendido <HelpTip text="Lo que te costó el inventario que vendiste" />
                                        </td>
                                        <td className="py-2 text-right text-red-600 dark:text-red-400">{cop(cogs)}</td>
                                    </tr>
                                    <tr className="border-b-2 border-neutral-200 dark:border-neutral-700">
                                        <td className="py-2 font-semibold text-green-700 dark:text-green-400">
                                            = Ganancia bruta <HelpTip text="Diferencia entre lo que vendiste y lo que te costaron los productos" />
                                        </td>
                                        <td className="py-2 text-right font-semibold text-green-700 dark:text-green-400">{cop(grossProfit)}</td>
                                    </tr>
                                    <tr className="border-b border-neutral-100 dark:border-neutral-800">
                                        <td className="py-2 text-muted-foreground">
                                            (-) Gastos del período <HelpTip text="Gastos operativos como arriendo, servicios, etc." />
                                        </td>
                                        <td className="py-2 text-right text-red-600 dark:text-red-400">{cop(totalExpenses)}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            className={`py-3 text-base font-bold ${netProfitPositive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}
                                        >
                                            = Ganancia neta <HelpTip text="Lo que realmente ganaste después de todos los costos" />
                                        </td>
                                        <td
                                            className={`py-3 text-right text-base font-bold ${netProfitPositive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}
                                        >
                                            {cop(netProfit)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>

                    {/* Expenses by category */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Gastos por categoría</CardTitle>
                            <CardDescription>Distribución de gastos en el período</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {expensesByCategory.length > 0 ? (
                                <div className="space-y-2">
                                    {expensesByCategory.map((row) => (
                                        <div key={row.category}>
                                            <div className="mb-0.5 flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="inline-block h-2 w-2 rounded-full"
                                                        style={{ backgroundColor: row.color ?? '#94a3b8' }}
                                                    />
                                                    <span>{row.category}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{cop(row.amount)}</span>
                                                    <span className="w-8 text-right text-xs text-muted-foreground">{row.pct.toFixed(0)}%</span>
                                                </div>
                                            </div>
                                            <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                                                <div
                                                    className="h-1 rounded-full"
                                                    style={{ width: `${Math.min(row.pct, 100)}%`, backgroundColor: row.color ?? '#94a3b8' }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="py-6 text-center text-sm text-muted-foreground">Sin gastos registrados en este período</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Expenses section */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Gastos del período</CardTitle>
                                <Button size="sm" onClick={() => setShowCreateModal(true)}>
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    Agregar
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Pending templates banner */}
                            {pendingTemplates.length > 0 && (
                                <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-700 dark:bg-amber-900/30">
                                    <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
                                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                        <span>
                                            Tienes <strong>{pendingTemplates.length}</strong> gasto{pendingTemplates.length > 1 ? 's' : ''} fijo
                                            {pendingTemplates.length > 1 ? 's' : ''} sin registrar este mes ({currentMonth})
                                        </span>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-200"
                                        onClick={() => setShowMonthlyModal(true)}
                                    >
                                        Registrar
                                    </Button>
                                </div>
                            )}

                            {/* Expenses list */}
                            {expenses.length === 0 ? (
                                <div className="py-8 text-center">
                                    <p className="text-sm text-muted-foreground">Sin gastos en este período.</p>
                                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowCreateModal(true)}>
                                        <Plus className="mr-1.5 h-4 w-4" />
                                        Registrar primer gasto
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <p className="mb-3 text-sm text-muted-foreground">
                                        {expenses.length} gasto{expenses.length !== 1 ? 's' : ''} · Total: <span className="font-semibold text-foreground">{cop(totalExpenses)}</span>
                                    </p>
                                    <div className="max-h-[520px] space-y-1 overflow-y-auto">
                                        {expenses.map((expense) => (
                                            <div
                                                key={expense.id}
                                                className="flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                                            >
                                                <div className="flex min-w-0 items-center gap-2.5">
                                                    <span
                                                        className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                                                        style={{ backgroundColor: expense.category?.color ?? '#94a3b8' }}
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium">
                                                            {expense.description || expense.category?.name || 'Sin descripción'}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {format(new Date(expense.expense_date), 'dd MMM', { locale: es })}
                                                            {expense.category && ` · ${expense.category.name}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-shrink-0 items-center gap-1">
                                                    <span className="text-sm font-semibold">{cop(expense.amount)}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                        onClick={() => setEditExpense(expense)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                                        onClick={() => handleDeleteExpense(expense.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
