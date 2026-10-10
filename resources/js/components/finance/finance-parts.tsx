import { SwipeActions, SwipeActionsRow } from '@/components/ui/arc/swipe-actions';
import { GrowBar } from '@/components/ui/bencho/grow-bar';
import { StaggerItem } from '@/components/ui/bencho/stagger-item';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type Expense } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pencil, Trash2 } from 'lucide-react';

export type PeriodOption = 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'custom';

export const PERIOD_LABELS: Record<PeriodOption, string> = {
    this_week: 'Esta semana',
    this_month: 'Este mes',
    last_month: 'Mes anterior',
    this_year: 'Este año',
    custom: 'Personalizado',
};

const DEFAULT_COLOR = '#94a3b8';

/** Periods as chips that scroll sideways on a phone, instead of a dropdown that hides the choices. */
export function PeriodChips({ value, onChange }: { value: PeriodOption; onChange: (period: PeriodOption) => void }) {
    return (
        <div
            role="group"
            aria-label="Periodo"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
            {(Object.keys(PERIOD_LABELS) as PeriodOption[]).map((period) => (
                <button
                    key={period}
                    type="button"
                    aria-pressed={value === period}
                    onClick={() => onChange(period)}
                    className={cn(
                        'inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors sm:h-9',
                        value === period
                            ? 'border-[var(--brand-primary)]/40 bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]'
                            : 'border-border/60 bg-card text-muted-foreground hover:bg-muted',
                    )}
                >
                    {PERIOD_LABELS[period]}
                </button>
            ))}
        </div>
    );
}

export function ColorDot({ color, className }: { color: string | null | undefined; className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn('inline-block size-2.5 shrink-0 rounded-full', className)}
            style={{ backgroundColor: color ?? DEFAULT_COLOR }}
        />
    );
}

interface ProfitSplitProps {
    netRevenue: number;
    cogs: number;
    expenses: number;
    netProfit: number;
}

/** Where each peso of net revenue went: cost of goods, expenses and what is left. The three parts add up to the revenue by construction. */
export function ProfitSplit({ netRevenue, cogs, expenses, netProfit }: ProfitSplitProps) {
    if (netRevenue <= 0) {
        return null;
    }

    const loss = netProfit < 0;
    const base = loss ? cogs + expenses : netRevenue;
    const share = (value: number): number => (base > 0 ? Math.max(0, Math.min(100, (value / base) * 100)) : 0);
    const parts = [
        { key: 'cogs', label: 'Costo de lo vendido', value: cogs, color: 'bg-amber-400' },
        { key: 'expenses', label: 'Gastos', value: expenses, color: 'bg-orange-500' },
        ...(loss ? [] : [{ key: 'profit', label: 'Ganancia', value: netProfit, color: 'bg-emerald-500' }]),
    ];

    return (
        <div className="flex flex-col gap-3">
            <div role="img" aria-label="Reparto de los ingresos netos" className="flex h-3 overflow-hidden rounded-full bg-muted">
                {parts.map((part, index) => (
                    <div key={part.key} className="h-full" style={{ width: `${share(part.value)}%` }}>
                        <GrowBar percent={100} delay={index * 120} className={part.color} />
                    </div>
                ))}
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                {parts.map((part) => (
                    <li key={part.key} className="flex items-center gap-1.5">
                        <span aria-hidden="true" className={cn('size-2 rounded-full', part.color)} />
                        {part.label} <span className="font-semibold text-foreground tabular-nums">{Math.round(share(part.value))}%</span>
                    </li>
                ))}
            </ul>
            {loss && <p className="text-xs text-red-600 dark:text-red-400">Los costos y gastos superan a los ingresos del periodo.</p>}
        </div>
    );
}

interface ExpenseRowsProps {
    expenses: Expense[];
    onEdit: (expense: Expense) => void;
    onDelete: (expense: Expense) => void;
}

const titleOf = (expense: Expense): string => expense.description || expense.category?.name || 'Sin descripción';
const dayOf = (expense: Expense): string => format(new Date(expense.expense_date), 'dd MMM', { locale: es });

/** Phones: a row per expense; swipe (or the row menu) to edit or delete. */
export function ExpenseCards({ expenses, onEdit, onDelete }: ExpenseRowsProps) {
    return (
        <SwipeActions label={`${expenses.length} gasto(s)`}>
            {expenses.map((expense, index) => (
                <SwipeActionsRow
                    key={expense.id}
                    label={titleOf(expense)}
                    fullSwipe={false}
                    trailing={[
                        { label: 'Editar', icon: <Pencil />, tone: 'neutral' as const, onSelect: () => onEdit(expense), keepRow: true },
                        { label: 'Eliminar', icon: <Trash2 />, tone: 'danger' as const, onSelect: () => onDelete(expense), keepRow: true },
                    ]}
                >
                    <StaggerItem index={index}>
                        <div className="flex min-w-0 items-center gap-3">
                            <ColorDot color={expense.category?.color} className="size-3" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[15px] font-semibold">{titleOf(expense)}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {dayOf(expense)}
                                    {expense.category && ` · ${expense.category.name}`}
                                </p>
                            </div>
                            <span className="shrink-0 text-[15px] font-bold tabular-nums">{formatCurrency(expense.amount)}</span>
                        </div>
                    </StaggerItem>
                </SwipeActionsRow>
            ))}
        </SwipeActions>
    );
}

/** Desktop: the expenses of the period as a table with the actions at the end of each row. */
export function ExpenseTable({ expenses, onEdit, onDelete }: ExpenseRowsProps) {
    return (
        <table className="w-full text-sm">
            <caption className="sr-only">Gastos del periodo</caption>
            <thead>
                <tr className="border-b border-border/60 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                    <th scope="col" className="px-6 py-3 font-medium">
                        Fecha
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                        Descripción
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                        Categoría
                    </th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">
                        Monto
                    </th>
                    <th scope="col" className="w-24 px-6 py-3">
                        <span className="sr-only">Acciones</span>
                    </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
                {expenses.map((expense) => (
                    <tr key={expense.id} className="group transition-colors hover:bg-muted/40">
                        <td className="px-6 py-3 whitespace-nowrap text-muted-foreground">{dayOf(expense)}</td>
                        <td className="max-w-xs px-3 py-3 font-medium">
                            <span className="line-clamp-1">{titleOf(expense)}</span>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                            {expense.category ? (
                                <span className="inline-flex items-center gap-2">
                                    <ColorDot color={expense.category.color} />
                                    {expense.category.name}
                                </span>
                            ) : (
                                '—'
                            )}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatCurrency(expense.amount)}</td>
                        <td className="px-6 py-3">
                            <div className="flex justify-end gap-1 opacity-60 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                                <button
                                    type="button"
                                    aria-label="Editar"
                                    onClick={() => onEdit(expense)}
                                    className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    <Pencil className="size-4" aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Eliminar"
                                    onClick={() => onDelete(expense)}
                                    className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-red-600"
                                >
                                    <Trash2 className="size-4" aria-hidden="true" />
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
