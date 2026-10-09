import PaginationFooter from '@/components/common/PaginationFooter';
import { SalesFilters, toDateParam, type DateSpan } from '@/components/sales/sales-filters';
import { SalesCards, SalesTable } from '@/components/sales/sales-list';
import { PullToRefresh } from '@/components/ui/bencho/pull-to-refresh';
import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { Skeleton } from '@/components/ui/skeleton';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { usePermissions } from '@/hooks/use-permissions';
import { usePolling } from '@/hooks/use-polling';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Sale } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Plus, ReceiptText, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface PageProps {
    sales: {
        data: Sale[];
        links: { label: string; url: string | null }[];
        current_page: number;
        from: number;
        to: number;
        total: number;
        last_page: number;
    };
    filters: {
        search?: string;
        status?: string;
        date_from?: string;
        date_to?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Ventas',
        href: '/sales',
    },
];

const formatCount = (value: number): string => String(value);

export default function Index({ sales, filters }: PageProps) {
    const { can } = usePermissions();
    const onBrand = useOnBrandColor();

    usePolling(['sales'], 60_000);

    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [range, setRange] = useState<DateSpan>({
        startDate: filters.date_from ? new Date(`${filters.date_from}T00:00:00`) : undefined,
        endDate: filters.date_to ? new Date(`${filters.date_to}T00:00:00`) : undefined,
    });
    const [isSearching, setIsSearching] = useState(false);

    const visit = useCallback((searchParam: string, statusParam: string, span: DateSpan) => {
        setIsSearching(true);
        const params = new URLSearchParams();

        if (searchParam) params.append('search', searchParam);
        if (statusParam && statusParam !== 'all') params.append('status', statusParam);
        if (span.startDate) params.append('date_from', toDateParam(span.startDate));
        if (span.endDate) params.append('date_to', toDateParam(span.endDate));

        const query = params.toString();
        router.visit(query ? `/sales?${query}` : '/sales', {
            preserveState: true,
            preserveScroll: true,
            only: ['sales'],
            onFinish: () => setIsSearching(false),
        });
    }, []);

    const hasResetRef = useRef(false);
    useEffect(() => {
        if (search.trim() === '') {
            const url = new URL(window.location.href);
            const hasFilters =
                url.searchParams.get('search') ||
                url.searchParams.get('status') ||
                url.searchParams.get('date_from') ||
                url.searchParams.get('date_to');
            if (!hasResetRef.current && hasFilters) {
                hasResetRef.current = true;
                setStatus('all');
                setRange({});
                visit('', 'all', {});
            }
        } else {
            hasResetRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const changeStatus = (next: string) => {
        setStatus(next);
        visit(search, next, range);
    };

    const changeRange = (next: DateSpan) => {
        setRange(next);
        visit(search, status, next);
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('all');
        setRange({});
        visit('', 'all', {});
    };

    const refresh = useCallback(
        () =>
            new Promise<void>((resolve) => {
                router.reload({ only: ['sales'], onFinish: () => resolve() });
            }),
        [],
    );

    const canEdit = can('sales.update');
    const isFiltered = search.trim() !== '' || status !== 'all' || range.startDate !== undefined;

    const emptyState = (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <ReceiptText className="size-7" aria-hidden="true" />
            </span>
            <div>
                <p className="font-semibold">{isFiltered ? 'Ninguna venta coincide con esos filtros' : 'Todavía no hay ventas'}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                    {isFiltered ? 'Prueba con otro estado o fechas, o quita los filtros.' : 'Cuando registres la primera, aparecerá aquí.'}
                </p>
            </div>
            {isFiltered ? (
                <button
                    type="button"
                    onClick={clearFilters}
                    className="h-11 rounded-lg border border-border/60 px-4 text-sm font-medium hover:bg-muted sm:h-9"
                >
                    Limpiar filtros
                </button>
            ) : (
                <Link
                    href={route('sales.create')}
                    className="flex h-11 items-center rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-medium hover:opacity-90 sm:h-9"
                    style={{ color: onBrand.hex }}
                >
                    Nueva venta
                </Link>
            )}
        </div>
    );

    const skeleton = (
        <div aria-hidden="true" className="flex flex-col divide-y divide-border/40">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                    <Skeleton className="size-11 rounded-xl" />
                    <div className="flex flex-1 flex-col gap-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                </div>
            ))}
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ventas" />
            <div className="flex flex-col gap-5 p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl leading-tight font-bold sm:text-2xl">Ventas</h1>
                        <p className="text-sm text-muted-foreground">
                            <RollingNumber value={sales.total} format={formatCount} intro className="font-medium text-foreground tabular-nums" />{' '}
                            {sales.total === 1 ? 'venta' : 'ventas'}
                            {isFiltered ? ' con los filtros actuales' : ' registradas'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {can('sales.view_deleted') && (
                            <Link
                                href={route('sales.deleted.index')}
                                aria-label="Ver ventas eliminadas"
                                className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-9"
                            >
                                <Trash2 className="size-4" aria-hidden="true" />
                                <span className="hidden sm:inline">Eliminadas</span>
                            </Link>
                        )}
                        <Link
                            href={route('sales.create')}
                            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-medium transition-opacity hover:opacity-90 sm:h-9 sm:flex-none"
                            style={{ color: onBrand.hex }}
                        >
                            <Plus className="size-4" aria-hidden="true" />
                            Nueva venta
                        </Link>
                    </div>
                </div>

                <SalesFilters
                    search={search}
                    onSearchChange={setSearch}
                    onSearchSubmit={() => visit(search, status, range)}
                    status={status}
                    onStatusChange={changeStatus}
                    range={range}
                    onRangeChange={changeRange}
                    onClear={clearFilters}
                />

                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card" aria-busy={isSearching}>
                    {isSearching ? (
                        skeleton
                    ) : sales.data.length === 0 ? (
                        emptyState
                    ) : (
                        <>
                            <div className="md:hidden">
                                <PullToRefresh onRefresh={refresh}>{() => <SalesCards sales={sales.data} canEdit={canEdit} />}</PullToRefresh>
                            </div>
                            <div className="hidden md:block">
                                <SalesTable sales={sales.data} canEdit={canEdit} />
                            </div>
                        </>
                    )}
                    <PaginationFooter data={{ ...sales, resourceLabel: 'ventas' }} />
                </div>
            </div>
        </AppLayout>
    );
}
