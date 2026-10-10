import { SessionCards, SessionTable, type SessionRow } from '@/components/cash/session-list';
import PaginationFooter from '@/components/common/PaginationFooter';
import { INPUT_CLASS } from '@/components/sales/form-fields';
import { PullToRefresh } from '@/components/ui/bencho/pull-to-refresh';
import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { usePolling } from '@/hooks/use-polling';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem, type PaginatedData } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ListFilter, Search, Wallet, X } from 'lucide-react';
import { useCallback, useState } from 'react';

interface Props {
    sessions: PaginatedData<SessionRow>;
    filters: {
        date_from?: string;
        date_to?: string;
        branch_id?: string;
    };
    availableBranches: Branch[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Historial de Caja', href: '/cash-sessions' },
];

const formatCount = (value: number): string => String(value);

export default function CashSessionIndex({ sessions, filters, availableBranches }: Props) {
    usePolling(['sessions'], 60_000);
    const onBrand = useOnBrandColor();
    const isWide = useMediaQuery('(min-width: 768px)');

    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? '');
    const [branchId, setBranchId] = useState(filters.branch_id ?? '');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const activeFilters = [dateFrom, dateTo, branchId].filter(Boolean).length;
    const showFields = isWide || filtersOpen;

    function applyFilters() {
        router.get(
            route('cash-sessions.index'),
            {
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                branch_id: branchId || undefined,
            },
            { preserveState: true },
        );
    }

    function clearFilters() {
        setDateFrom('');
        setDateTo('');
        setBranchId('');
        router.get(route('cash-sessions.index'), {}, { preserveState: false });
    }

    const refresh = useCallback(
        () =>
            new Promise<void>((resolve) => {
                router.reload({ only: ['sessions'], onFinish: () => resolve() });
            }),
        [],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Historial de Caja" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Historial de Caja</h1>
                        <p className="text-sm text-muted-foreground">
                            <RollingNumber value={sessions.total} format={formatCount} intro className="font-medium text-foreground tabular-nums" />{' '}
                            {sessions.total === 1 ? 'turno registrado' : 'turnos registrados'} · aperturas, cierres y diferencias
                        </p>
                    </div>
                    {!isWide && (
                        <button
                            type="button"
                            aria-expanded={filtersOpen}
                            aria-controls="cash-filter-fields"
                            onClick={() => setFiltersOpen((value) => !value)}
                            className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-border/60 bg-card px-3.5 text-sm font-medium"
                        >
                            <ListFilter className="size-4" aria-hidden="true" />
                            Filtros
                            {activeFilters > 0 && (
                                <span
                                    className="flex size-5 items-center justify-center rounded-full bg-[var(--brand-primary)] text-[11px] font-semibold"
                                    style={{ color: onBrand.hex }}
                                >
                                    {activeFilters}
                                </span>
                            )}
                        </button>
                    )}
                </div>

                {showFields && (
                    <section
                        id="cash-filter-fields"
                        aria-label="Filtros"
                        className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 bg-card p-4"
                    >
                        <div className="min-w-36 flex-1 space-y-1.5 sm:flex-none">
                            <label htmlFor="date-from" className="text-xs font-medium text-muted-foreground">
                                Desde
                            </label>
                            <input
                                id="date-from"
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className={INPUT_CLASS}
                            />
                        </div>
                        <div className="min-w-36 flex-1 space-y-1.5 sm:flex-none">
                            <label htmlFor="date-to" className="text-xs font-medium text-muted-foreground">
                                Hasta
                            </label>
                            <input id="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={INPUT_CLASS} />
                        </div>
                        {availableBranches.length > 1 && (
                            <div className="min-w-40 flex-1 space-y-1.5 sm:flex-none">
                                <label htmlFor="branch-filter" className="text-xs font-medium text-muted-foreground">
                                    Sucursal
                                </label>
                                <select id="branch-filter" value={branchId} onChange={(e) => setBranchId(e.target.value)} className={INPUT_CLASS}>
                                    <option value="">Todas</option>
                                    {availableBranches.map((b) => (
                                        <option key={b.id} value={String(b.id)}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="flex w-full gap-2 sm:w-auto">
                            <button
                                type="button"
                                onClick={applyFilters}
                                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold sm:h-9 sm:flex-none"
                                style={{ color: onBrand.hex }}
                            >
                                <Search className="size-4" aria-hidden="true" />
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
                    </section>
                )}

                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                    {sessions.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                                <Wallet className="size-7" aria-hidden="true" />
                            </span>
                            <p className="font-semibold">No hay sesiones registradas</p>
                            <p className="text-sm text-muted-foreground">Los turnos de caja aparecerán aquí al abrirlos desde el POS.</p>
                        </div>
                    ) : isWide ? (
                        <SessionTable sessions={sessions.data} />
                    ) : (
                        <PullToRefresh onRefresh={refresh}>{() => <SessionCards sessions={sessions.data} />}</PullToRefresh>
                    )}
                    <PaginationFooter data={{ ...sessions, resourceLabel: 'turnos' }} />
                </div>
            </div>
        </AppLayout>
    );
}
