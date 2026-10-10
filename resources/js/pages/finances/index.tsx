import { useConfirm } from '@/components/confirm-dialog';
import { ExpenseFormDialog, RegisterMonthlyExpensesDialog } from '@/components/finance/expense-dialogs';
import { ColorDot, ExpenseCards, ExpenseTable, PeriodChips, ProfitSplit, type PeriodOption } from '@/components/finance/finance-parts';
import { INPUT_CLASS, SELECT_TRIGGER, Section } from '@/components/sales/form-fields';
import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { usePolling } from '@/hooks/use-polling';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type Expense, type ExpenseCategory, type ExpenseTemplate } from '@/types';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, CalendarClock, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface ExpenseByCategoryRow {
    category: string;
    icon: string | null;
    color: string | null;
    amount: number;
    pct: number;
}

interface Props {
    period: PeriodOption;
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

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Finanzas', href: '/finances' },
];

const formatPesos = (value: number): string => formatCurrency(value);

function Kpi({ label, hint, children, tone }: { label: string; hint: ReactNode; children: ReactNode; tone: string }) {
    return (
        <div className="rounded-2xl border border-border/60 bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className={cn('mt-1 text-2xl font-bold tracking-tight tabular-nums', tone)}>{children}</p>
            <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
        </div>
    );
}

/** One line of the statement, with what it means written under it instead of in a tooltip a phone cannot show. */
function StatementRow({
    label,
    hint,
    value,
    tone,
    strong,
    divider,
}: {
    label: string;
    hint?: string;
    value: number;
    tone?: string;
    strong?: boolean;
    divider?: boolean;
}) {
    return (
        <tr className={cn(divider ? 'border-b-2 border-border' : 'border-b border-border/40')}>
            <td className={cn('py-3 pr-3', strong ? 'font-semibold' : 'text-muted-foreground', tone)}>
                {label}
                {hint && <span className="block text-xs font-normal text-muted-foreground">{hint}</span>}
            </td>
            <td className={cn('py-3 text-right whitespace-nowrap tabular-nums', strong && 'font-semibold', tone)}>{formatPesos(value)}</td>
        </tr>
    );
}

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
    const { confirm, dialog } = useConfirm();
    const onBrand = useOnBrandColor();
    const isWide = useMediaQuery('(min-width: 768px)');
    usePolling(['revenue', 'netRevenue', 'grossProfit', 'netProfit', 'totalExpenses', 'expensesByCategory', 'receivables'], 120_000);

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

    const handleDeleteExpense = async (expense: Expense) => {
        const accepted = await confirm({
            title: '¿Eliminar este gasto?',
            description: 'Esta acción no se puede deshacer.',
            confirmLabel: 'Eliminar',
        });
        if (!accepted) return;
        router.delete(`/expenses/${expense.id}`, { preserveScroll: true });
    };

    const netProfitPositive = netProfit >= 0;
    const showReceivables = receivables > 0 || activeCreditsCount > 0;
    const tone = netProfitPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    const Trend = netProfitPositive ? TrendingUp : TrendingDown;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Finanzas" />

            {showMonthlyModal && (
                <RegisterMonthlyExpensesDialog
                    open={showMonthlyModal}
                    onClose={() => setShowMonthlyModal(false)}
                    templates={pendingTemplates}
                    currentMonth={currentMonth}
                />
            )}
            <ExpenseFormDialog
                open={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                categories={categories}
                branches={branches}
                userBranchId={userBranchId}
            />
            {editExpense && (
                <ExpenseFormDialog
                    open={true}
                    onClose={() => setEditExpense(null)}
                    categories={categories}
                    branches={branches}
                    userBranchId={userBranchId}
                    expense={editExpense}
                />
            )}

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Finanzas</h1>
                        <p className="text-sm text-muted-foreground">Resumen de ingresos, gastos y rentabilidad del negocio</p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <PeriodChips value={localPeriod} onChange={handlePeriodChange} />
                        {branches.length > 0 && (
                            <Select value={localBranch} onValueChange={handleBranchChange}>
                                <SelectTrigger aria-label="Sucursal" className={`${SELECT_TRIGGER} text-left sm:w-52 [&>span]:truncate`}>
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

                {localPeriod === 'custom' && (
                    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 bg-card p-4">
                        <div className="min-w-36 flex-1 space-y-1.5 sm:flex-none">
                            <label htmlFor="finance-from" className="text-xs font-medium text-muted-foreground">
                                Desde
                            </label>
                            <input
                                id="finance-from"
                                type="date"
                                value={dateFromLocal}
                                onChange={(e) => setDateFromLocal(e.target.value)}
                                className={INPUT_CLASS}
                            />
                        </div>
                        <div className="min-w-36 flex-1 space-y-1.5 sm:flex-none">
                            <label htmlFor="finance-to" className="text-xs font-medium text-muted-foreground">
                                Hasta
                            </label>
                            <input
                                id="finance-to"
                                type="date"
                                value={dateToLocal}
                                onChange={(e) => setDateToLocal(e.target.value)}
                                className={INPUT_CLASS}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => applyFilters()}
                            className="flex h-11 w-full items-center justify-center rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-semibold sm:h-9 sm:w-auto"
                            style={{ color: onBrand.hex }}
                        >
                            Aplicar
                        </button>
                    </div>
                )}

                {hasCOGSWarning && (
                    <div className="flex items-start gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-200">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <p className="text-sm">Los datos de costo de productos pueden ser estimados en ventas anteriores.</p>
                    </div>
                )}

                <section
                    aria-label="Ganancia neta"
                    className={cn(
                        'rounded-2xl border-2 bg-card p-5',
                        netProfitPositive ? 'border-green-300 dark:border-green-800' : 'border-red-300 dark:border-red-800',
                    )}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Ganancia neta</p>
                            <p className={cn('mt-1 text-4xl font-extrabold tracking-tight tabular-nums sm:text-5xl', tone)}>
                                <RollingNumber value={netProfit} format={formatPesos} intro />
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">Lo que realmente ganaste luego de todos los costos y gastos</p>
                        </div>
                        <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-full bg-muted', tone)}>
                            <Trend className="size-5" aria-hidden="true" />
                        </span>
                    </div>
                    <div className="mt-5">
                        <ProfitSplit netRevenue={netRevenue} cogs={cogs} expenses={totalExpenses} netProfit={netProfit} />
                    </div>
                </section>

                <div className={cn('grid grid-cols-2 gap-3', showReceivables ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
                    <Kpi label="Ingresos netos" tone="text-blue-600 dark:text-blue-400" hint="Ventas menos devoluciones del periodo">
                        <RollingNumber value={netRevenue} format={formatPesos} intro />
                    </Kpi>
                    <Kpi
                        label="Ganancia bruta"
                        tone="text-green-600 dark:text-green-400"
                        hint={
                            <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700 dark:bg-green-950/50 dark:text-green-300">
                                {grossMarginPct.toFixed(1)}% de margen
                            </span>
                        }
                    >
                        <RollingNumber value={grossProfit} format={formatPesos} intro />
                    </Kpi>
                    <Kpi
                        label="Gastos"
                        tone="text-orange-600 dark:text-orange-400"
                        hint={`Gastos operativos • ${expenses.length} registro${expenses.length !== 1 ? 's' : ''}`}
                    >
                        <RollingNumber value={totalExpenses} format={formatPesos} intro />
                    </Kpi>
                    {showReceivables && (
                        <Kpi
                            label="Cartera por cobrar"
                            tone="text-purple-600 dark:text-purple-400"
                            hint={
                                <>
                                    {activeCreditsCount} crédito{activeCreditsCount !== 1 ? 's' : ''} activo{activeCreditsCount !== 1 ? 's' : ''}
                                    {' — '}
                                    <a href="/credits" className="font-medium text-purple-600 hover:underline dark:text-purple-400">
                                        Ver créditos
                                    </a>
                                </>
                            }
                        >
                            <RollingNumber value={receivables} format={formatPesos} intro />
                        </Kpi>
                    )}
                </div>

                <div className="grid items-start gap-5 lg:grid-cols-2">
                    <Section title="¿Cómo le fue al negocio?" description="Desglose de ingresos y gastos del período seleccionado">
                        <div className="px-5 pb-3">
                            <table aria-label="Estado de resultados" className="w-full text-sm">
                                <tbody>
                                    <StatementRow
                                        label="Ingresos por ventas"
                                        hint="Todo el dinero que ingresó por ventas en este período"
                                        value={revenue}
                                    />
                                    {returnsTotal > 0 && (
                                        <StatementRow label="(-) Devoluciones" value={returnsTotal} tone="text-red-600 dark:text-red-400" />
                                    )}
                                    <StatementRow label="= Ingresos netos" value={netRevenue} strong divider />
                                    <StatementRow
                                        label="(-) Costo de lo vendido"
                                        hint="Lo que te costó el inventario que vendiste"
                                        value={cogs}
                                        tone="text-red-600 dark:text-red-400"
                                    />
                                    <StatementRow
                                        label="= Ganancia bruta"
                                        hint="Diferencia entre lo que vendiste y lo que te costaron los productos"
                                        value={grossProfit}
                                        tone="text-green-700 dark:text-green-400"
                                        strong
                                        divider
                                    />
                                    <StatementRow
                                        label="(-) Gastos del período"
                                        hint="Gastos operativos como arriendo, servicios, etc."
                                        value={totalExpenses}
                                        tone="text-red-600 dark:text-red-400"
                                    />
                                    <StatementRow
                                        label="= Ganancia neta"
                                        hint="Lo que realmente ganaste después de todos los costos"
                                        value={netProfit}
                                        tone={netProfitPositive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}
                                        strong
                                    />
                                </tbody>
                            </table>
                        </div>
                    </Section>

                    <Section title="Gastos por categoría" description="Distribución de gastos en el período">
                        <div className="px-5 pb-5">
                            {expensesByCategory.length > 0 ? (
                                <ul className="flex flex-col gap-3.5">
                                    {expensesByCategory.map((row) => (
                                        <li key={row.category}>
                                            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                                                <span className="flex min-w-0 items-center gap-2">
                                                    <ColorDot color={row.color} className="size-2" />
                                                    <span className="truncate">{row.category}</span>
                                                </span>
                                                <span className="flex shrink-0 items-center gap-2">
                                                    <span className="font-medium tabular-nums">{formatPesos(row.amount)}</span>
                                                    <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">
                                                        {row.pct.toFixed(0)}%
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{ width: `${Math.min(row.pct, 100)}%`, backgroundColor: row.color ?? '#94a3b8' }}
                                                />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="py-6 text-center text-sm text-muted-foreground">Sin gastos registrados en este período</p>
                            )}
                        </div>
                    </Section>
                </div>

                <section className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                    <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
                        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Gastos del período</h2>
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(true)}
                            className="flex h-11 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 sm:h-9"
                            style={{ color: onBrand.hex }}
                        >
                            <Plus className="size-4" aria-hidden="true" />
                            Agregar
                        </button>
                    </header>

                    {pendingTemplates.length > 0 && (
                        <div className="mx-5 mb-3 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800 dark:bg-amber-950/30">
                            <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
                                <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                <span>
                                    Tienes <strong>{pendingTemplates.length}</strong> gasto{pendingTemplates.length > 1 ? 's' : ''} fijo
                                    {pendingTemplates.length > 1 ? 's' : ''} sin registrar este mes ({currentMonth})
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowMonthlyModal(true)}
                                className="flex h-11 items-center justify-center rounded-xl border border-amber-300 px-4 text-sm font-medium text-amber-800 hover:bg-amber-100 sm:h-9 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
                            >
                                Registrar
                            </button>
                        </div>
                    )}

                    {expenses.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                            <p className="text-sm text-muted-foreground">Sin gastos en este período.</p>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(true)}
                                className="flex h-11 items-center gap-2 rounded-xl border border-border/60 px-4 text-sm font-medium hover:bg-muted sm:h-9"
                            >
                                <Plus className="size-4" aria-hidden="true" />
                                Registrar primer gasto
                            </button>
                        </div>
                    ) : (
                        <>
                            <p className="border-t border-border/60 px-5 py-3 text-sm text-muted-foreground">
                                {expenses.length} gasto{expenses.length !== 1 ? 's' : ''} · Total:{' '}
                                <span className="font-semibold text-foreground">{formatPesos(totalExpenses)}</span>
                            </p>
                            {isWide ? (
                                <ExpenseTable expenses={expenses} onEdit={setEditExpense} onDelete={handleDeleteExpense} />
                            ) : (
                                <ExpenseCards expenses={expenses} onEdit={setEditExpense} onDelete={handleDeleteExpense} />
                            )}
                        </>
                    )}
                </section>
            </div>
            {dialog}
        </AppLayout>
    );
}
