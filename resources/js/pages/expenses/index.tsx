import { DeleteWithReasonDialog } from '@/components/common/DeleteWithReasonDialog';
import PaginationFooter from '@/components/common/PaginationFooter';
import { ExpenseFormDialog, RegisterMonthlyExpensesDialog } from '@/components/finance/expense-dialogs';
import { ExpenseCards, ExpenseTable } from '@/components/finance/finance-parts';
import { INPUT_CLASS, SELECT_TRIGGER } from '@/components/sales/form-fields';
import { PullToRefresh } from '@/components/ui/bencho/pull-to-refresh';
import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { usePolling } from '@/hooks/use-polling';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency } from '@/lib/format';
import { type BreadcrumbItem, type Expense, type ExpenseCategory, type ExpenseTemplate, type PaginatedData } from '@/types';
import { Head, router } from '@inertiajs/react';
import { CalendarClock, ListFilter, Plus, Receipt, X } from 'lucide-react';
import { useCallback, useState } from 'react';

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

const formatPesos = (value: number): string => formatCurrency(Number(value));

export default function ExpensesIndex({ expenses, pendingTemplates, categories, branches, currentMonth, filters, userBranchId }: Props) {
    usePolling(['expenses', 'pendingTemplates'], 60_000);
    const onBrand = useOnBrandColor();
    const isWide = useMediaQuery('(min-width: 768px)');

    const isAdmin = branches.length > 0;

    const [filterCategory, setFilterCategory] = useState(filters.category || 'all');
    const [filterBranch, setFilterBranch] = useState(filters.branch || 'all');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    const hasActiveFilters = filterCategory !== 'all' || filterBranch !== 'all' || startDate !== '' || endDate !== '';
    const activeFilterCount = [filterCategory !== 'all', filterBranch !== 'all', startDate !== '', endDate !== ''].filter(Boolean).length;
    const [filtersOpen, setFiltersOpen] = useState(hasActiveFilters);
    const showFields = isWide || filtersOpen;

    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editExpense, setEditExpense] = useState<Expense | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
    const [deleting, setDeleting] = useState(false);

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

    const refresh = useCallback(
        () =>
            new Promise<void>((resolve) => {
                router.reload({ only: ['expenses'], onFinish: () => resolve() });
            }),
        [],
    );

    const shownTotal = expenses.data.reduce((sum, e) => sum + Number(e.amount), 0);

    const empty = (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Receipt className="size-7" aria-hidden="true" />
            </span>
            {hasActiveFilters ? (
                <>
                    <p className="font-semibold">No se encontraron gastos con los filtros seleccionados</p>
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="flex h-11 items-center rounded-xl border border-border/60 px-4 text-sm font-medium hover:bg-muted sm:h-9"
                    >
                        Limpiar filtros
                    </button>
                </>
            ) : (
                <>
                    <p className="font-semibold">Sin gastos registrados</p>
                    <p className="text-sm text-muted-foreground">Comienza registrando tus gastos operativos del mes</p>
                    <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="flex h-11 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold sm:h-9"
                        style={{ color: onBrand.hex }}
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        Registrar primer gasto
                    </button>
                </>
            )}
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gastos" />

            <DeleteWithReasonDialog
                open={Boolean(deleteTarget)}
                title="Eliminar gasto"
                description={
                    deleteTarget && (
                        <span>
                            ¿Eliminar <strong>{deleteTarget.description || 'este gasto'}</strong> por{' '}
                            <strong>{formatPesos(deleteTarget.amount)}</strong>? Esta acción no se puede deshacer.
                        </span>
                    )
                }
                processing={deleting}
                onConfirm={handleDelete}
                onClose={() => setDeleteTarget(null)}
            />

            {showRegisterModal && (
                <RegisterMonthlyExpensesDialog
                    open={showRegisterModal}
                    onClose={() => setShowRegisterModal(false)}
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
                showNotes
            />

            {editExpense && (
                <ExpenseFormDialog
                    open={Boolean(editExpense)}
                    onClose={() => setEditExpense(null)}
                    categories={categories}
                    branches={branches}
                    userBranchId={userBranchId}
                    expense={editExpense}
                    showNotes
                    editLabel="Guardar cambios"
                />
            )}

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Gastos</h1>
                        <p className="text-sm text-muted-foreground">Historial y control de todos tus gastos operativos</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        {pendingTemplates.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowRegisterModal(true)}
                                className="flex h-11 items-center justify-center rounded-xl border border-border/60 bg-card px-4 text-sm font-medium hover:bg-muted sm:h-10"
                            >
                                Registrar gastos fijos
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(true)}
                            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 sm:h-10"
                            style={{ color: onBrand.hex }}
                        >
                            <Plus className="size-4" aria-hidden="true" />
                            Registrar gasto
                        </button>
                    </div>
                </div>

                {pendingTemplates.length > 0 && (
                    <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800 dark:bg-amber-950/30">
                        <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
                            <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                            <span>
                                Tienes <strong>{pendingTemplates.length}</strong> gasto{pendingTemplates.length > 1 ? 's' : ''} fijo
                                {pendingTemplates.length > 1 ? 's' : ''} sin registrar para <strong>{currentMonth}</strong>.
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowRegisterModal(true)}
                            className="flex h-11 items-center justify-center rounded-xl border border-amber-300 px-4 text-sm font-medium text-amber-800 hover:bg-amber-100 sm:h-9 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
                        >
                            Registrar ahora
                        </button>
                    </div>
                )}

                <section aria-label="Filtros" className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4">
                    {!isWide && (
                        <button
                            type="button"
                            aria-expanded={filtersOpen}
                            aria-controls="expense-filter-fields"
                            onClick={() => setFiltersOpen((open) => !open)}
                            className="flex h-11 items-center justify-between gap-2 text-sm font-medium"
                        >
                            <span className="flex items-center gap-2">
                                <ListFilter className="size-4" aria-hidden="true" />
                                Filtros
                                {activeFilterCount > 0 && (
                                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                                        {activeFilterCount} activo{activeFilterCount !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </span>
                        </button>
                    )}
                    {isWide && (
                        <h2 className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            Filtros
                            {activeFilterCount > 0 && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs normal-case">
                                    {activeFilterCount} activo{activeFilterCount !== 1 ? 's' : ''}
                                </span>
                            )}
                        </h2>
                    )}
                    {showFields && (
                        <>
                            <div id="expense-filter-fields" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="filter-category" className="text-xs font-medium text-muted-foreground">
                                        Categoría
                                    </label>
                                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                                        <SelectTrigger id="filter-category" className={`${SELECT_TRIGGER} text-left [&>span]:truncate`}>
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
                                    <div className="space-y-1.5">
                                        <label htmlFor="filter-branch" className="text-xs font-medium text-muted-foreground">
                                            Sucursal
                                        </label>
                                        <Select value={filterBranch} onValueChange={setFilterBranch}>
                                            <SelectTrigger id="filter-branch" className={`${SELECT_TRIGGER} text-left [&>span]:truncate`}>
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

                                <div className="space-y-1.5">
                                    <label htmlFor="filter-from" className="text-xs font-medium text-muted-foreground">
                                        Fecha desde
                                    </label>
                                    <input
                                        id="filter-from"
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className={INPUT_CLASS}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="filter-to" className="text-xs font-medium text-muted-foreground">
                                        Fecha hasta
                                    </label>
                                    <input
                                        id="filter-to"
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className={INPUT_CLASS}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={applyFilters}
                                    className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-semibold sm:h-9 sm:flex-none"
                                    style={{ color: onBrand.hex }}
                                >
                                    Filtrar
                                </button>
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border/60 px-4 text-sm font-medium text-muted-foreground hover:bg-muted sm:h-9 sm:flex-none"
                                >
                                    <X className="size-4" aria-hidden="true" />
                                    Limpiar
                                </button>
                            </div>
                        </>
                    )}
                </section>

                {expenses.data.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-border/60 bg-card p-4">
                            <p className="text-xs text-muted-foreground">Total mostrado:</p>
                            <p className="mt-1 text-xl font-bold text-orange-600 tabular-nums sm:text-2xl dark:text-orange-400">
                                <RollingNumber value={shownTotal} format={formatPesos} intro />
                            </p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card p-4">
                            <p className="text-xs text-muted-foreground">En el historial</p>
                            <p className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">
                                {expenses.total}{' '}
                                <span className="text-sm font-medium text-muted-foreground">gasto{expenses.total !== 1 ? 's' : ''} en total</span>
                            </p>
                        </div>
                    </div>
                )}

                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                    <h2 className="px-5 pt-4 pb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Gastos ({expenses.total})</h2>
                    {expenses.data.length === 0 ? (
                        empty
                    ) : isWide ? (
                        <ExpenseTable expenses={expenses.data} onEdit={setEditExpense} onDelete={setDeleteTarget} detailed />
                    ) : (
                        <PullToRefresh onRefresh={refresh}>
                            {() => <ExpenseCards expenses={expenses.data} onEdit={setEditExpense} onDelete={setDeleteTarget} detailed />}
                        </PullToRefresh>
                    )}
                    <PaginationFooter data={{ ...expenses, resourceLabel: 'gastos' }} />
                </div>
            </div>
        </AppLayout>
    );
}
