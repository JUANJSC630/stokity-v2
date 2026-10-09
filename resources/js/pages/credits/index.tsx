import PaginationFooter from '@/components/common/PaginationFooter';
import { CreditDetailPane } from '@/components/credits/credit-detail-pane';
import { CreditRow } from '@/components/credits/credit-row';
import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { usePolling } from '@/hooks/use-polling';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type CreditSale, type PaginatedData } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { HandCoins, MousePointerClick, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
    credits: PaginatedData<CreditSale>;
    filters: {
        tab?: string;
        search?: string;
        type?: string;
    };
    overdueCount: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Créditos', href: '/credits' },
];

const TABS = [
    { key: 'active', label: 'Activos' },
    { key: 'overdue', label: 'Vencidos' },
    { key: 'completed', label: 'Completados' },
    { key: 'all', label: 'Todos' },
];

const formatCount = (value: number): string => String(value);
const cop = (value: number): string => formatCurrency(value);

/** Money still to collect on installment and agreed-date credits (the endpoint the Finanzas widget already uses). */
function useReceivables(): number | null {
    const [total, setTotal] = useState<number | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        fetch('/credits/receivables', { signal: controller.signal, headers: { Accept: 'application/json' } })
            .then((response) => (response.ok ? response.json() : null))
            .then((data: { total?: number } | null) => setTotal(typeof data?.total === 'number' ? data.total : null))
            .catch(() => setTotal(null));
        return () => controller.abort();
    }, []);

    return total;
}

function readSelected(): number | null {
    if (typeof window === 'undefined') return null;
    const value = new URLSearchParams(window.location.search).get('selected');
    return value && /^\d+$/.test(value) ? Number(value) : null;
}

export default function CreditsIndex({ credits, filters, overdueCount }: Props) {
    usePolling(['credits', 'overdueCount'], 60_000);

    const onBrand = useOnBrandColor();
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const receivables = useReceivables();

    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedId, setSelectedId] = useState<number | null>(readSelected);
    const activeTab = filters.tab ?? 'active';
    const list = credits.data;

    function navigate(params: Record<string, string | undefined>) {
        router.get('/credits', { ...filters, ...params }, { preserveState: true, replace: true });
    }

    function select(id: number) {
        setSelectedId(id);
        const url = new URL(window.location.href);
        url.searchParams.set('selected', String(id));
        window.history.replaceState(window.history.state, '', url);
    }

    // On a wide screen there is always one credit open: keep the selection if it is still in the list, otherwise open the first.
    useEffect(() => {
        if (!isDesktop || list.length === 0) return;
        if (selectedId === null || !list.some((credit) => credit.id === selectedId)) {
            if (selectedId === null) setSelectedId(list[0].id);
        }
    }, [isDesktop, list, selectedId]);

    // Up / Down move through the list from the keyboard while no field is being typed in.
    useEffect(() => {
        if (!isDesktop) return;
        function onKeyDown(event: KeyboardEvent) {
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
            const tag = (event.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if (document.querySelector('[role="dialog"][data-state="open"]')) return;
            const index = list.findIndex((credit) => credit.id === selectedId);
            const next = list[Math.min(list.length - 1, Math.max(0, index + (event.key === 'ArrowDown' ? 1 : -1)))];
            if (next && next.id !== selectedId) {
                event.preventDefault();
                select(next.id);
            }
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isDesktop, list, selectedId]);

    const emptyLabel = activeTab !== 'all' ? (TABS.find((tab) => tab.key === activeTab)?.label.toLowerCase() ?? '') : '';

    const listColumn = (
        <div className="flex min-h-0 flex-col gap-4">
            <div className="flex gap-1 rounded-xl border border-border/60 bg-card p-1" role="tablist" aria-label="Estado de los créditos">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => navigate({ tab: tab.key, search: undefined })}
                        className={`relative flex h-11 flex-1 items-center justify-center rounded-lg px-2 text-sm font-medium whitespace-nowrap transition-colors lg:h-9 ${
                            activeTab === tab.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        {tab.label}
                        {tab.key === 'overdue' && overdueCount > 0 && (
                            <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                                {overdueCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                <div className="relative flex-1">
                    <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <input
                        type="search"
                        placeholder="Buscar por código o cliente..."
                        aria-label="Buscar créditos"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && navigate({ search: search || undefined })}
                        className="h-11 w-full rounded-xl border border-border/60 bg-card pr-3 pl-10 text-base focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none lg:h-10 lg:text-sm"
                    />
                </div>
                <Select value={filters.type ?? 'all'} onValueChange={(v) => navigate({ type: v === 'all' ? undefined : v })}>
                    <SelectTrigger className="h-11 w-full bg-card text-base sm:w-48 lg:h-10 lg:w-full lg:text-sm">
                        <SelectValue placeholder="Modalidad" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las modalidades</SelectItem>
                        <SelectItem value="layaway">Separado</SelectItem>
                        <SelectItem value="installments">Cuotas</SelectItem>
                        <SelectItem value="due_date">Fecha acordada</SelectItem>
                        <SelectItem value="hold">Reservado</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {list.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
                    <HandCoins className="mb-3 size-10 text-muted-foreground/60" aria-hidden="true" />
                    <p className="text-muted-foreground">No hay créditos {emptyLabel}</p>
                </div>
            ) : (
                <ul className="flex flex-col gap-2.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1" aria-label="Créditos">
                    {list.map((credit) => (
                        <li key={credit.id}>
                            <CreditRow
                                credit={credit}
                                selected={isDesktop && credit.id === selectedId}
                                onSelect={isDesktop ? () => select(credit.id) : undefined}
                            />
                        </li>
                    ))}
                </ul>
            )}

            <PaginationFooter data={{ ...credits, resourceLabel: 'créditos' }} />
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Créditos" />

            <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-5 p-4 lg:h-[calc(100dvh-4rem)] lg:min-h-0 lg:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Créditos</h1>
                        <p className="text-sm text-muted-foreground">Gestiona separados, cuotas y pagos diferidos</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {receivables !== null && (
                            <div className="hidden items-center gap-6 rounded-xl border border-border/60 bg-card px-4 py-2 lg:flex">
                                <div>
                                    <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Por cobrar (cuotas y fecha acordada)</p>
                                    <p className="text-lg font-bold tabular-nums">
                                        <RollingNumber value={receivables} format={cop} intro />
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Vencidos</p>
                                    <p className={cn('text-lg font-bold tabular-nums', overdueCount > 0 && 'text-red-600 dark:text-red-400')}>
                                        <RollingNumber value={overdueCount} format={formatCount} intro />
                                    </p>
                                </div>
                            </div>
                        )}
                        <Link
                            href="/credits/create"
                            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 lg:h-10"
                            style={{ color: onBrand.hex }}
                        >
                            <Plus className="size-4" aria-hidden="true" />
                            Nuevo crédito
                        </Link>
                    </div>
                </div>

                <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(340px,420px)_1fr]">
                    {listColumn}

                    <div
                        className="hidden min-h-0 overflow-y-auto rounded-3xl border border-border/60 bg-muted/20 p-6 lg:block"
                        aria-label="Detalle del crédito"
                    >
                        {selectedId !== null ? (
                            <CreditDetailPane key={selectedId} id={selectedId} />
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                                <MousePointerClick className="size-10 opacity-30" aria-hidden="true" />
                                <p className="text-sm">Selecciona un crédito de la lista para ver su detalle.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
