import PaginationFooter from '@/components/common/PaginationFooter';
import { SearchField } from '@/components/common/search-field';
import { PullToRefresh } from '@/components/ui/bencho/pull-to-refresh';
import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { OrderCards, OrderTable } from '@/components/wholesale/order-list';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { usePermissions } from '@/hooks/use-permissions';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type PaginatedData, type WholesaleSale } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Gem, Plus, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';

interface Props {
    wholesaleSales: PaginatedData<WholesaleSale>;
    filters: {
        search?: string;
        status?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Mayorista', href: '/wholesale' },
];

const STATUS_CHIPS = [
    { value: 'all', label: 'Todos' },
    { value: 'completed', label: 'Completados' },
    { value: 'cancelled', label: 'Cancelados' },
];

const formatCount = (value: number): string => String(value);

export default function WholesaleIndex({ wholesaleSales, filters }: Props) {
    const { can } = usePermissions();
    const onBrand = useOnBrandColor();
    const isWide = useMediaQuery('(min-width: 768px)');
    const [search, setSearch] = useState(filters.search ?? '');
    const activeStatus = filters.status ?? 'all';
    const canUpdate = can('wholesale.update');

    function navigate(params: Record<string, string | undefined>) {
        router.get('/wholesale', { ...filters, ...params }, { preserveState: true, replace: true });
    }

    const refresh = useCallback(
        () =>
            new Promise<void>((resolve) => {
                router.reload({ only: ['wholesaleSales'], onFinish: () => resolve() });
            }),
        [],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Mayorista" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Mayorista</h1>
                        <p className="text-sm text-muted-foreground">
                            <RollingNumber
                                value={wholesaleSales.total}
                                format={formatCount}
                                intro
                                className="font-medium text-foreground tabular-nums"
                            />{' '}
                            {wholesaleSales.total === 1 ? 'pedido personalizado' : 'pedidos personalizados'}, fuera del catálogo e inventario normal
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {can('wholesale.view_deleted') && (
                            <Link
                                href="/wholesale/deleted"
                                className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-card px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-10"
                            >
                                <Trash2 className="size-4" aria-hidden="true" />
                                <span className="hidden sm:inline">Eliminados</span>
                                <span className="sr-only sm:hidden">Eliminados</span>
                            </Link>
                        )}
                        <Link
                            href="/wholesale/create"
                            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 sm:h-10 sm:flex-none"
                            style={{ color: onBrand.hex }}
                        >
                            <Plus className="size-4" aria-hidden="true" />
                            Nuevo pedido
                        </Link>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <SearchField
                        id="wholesale-search"
                        label="Buscar pedidos mayoristas"
                        placeholder="Buscar por código o cliente..."
                        value={search}
                        onChange={setSearch}
                        onSubmit={() => navigate({ search: search || undefined })}
                    />
                    <div
                        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
                        role="group"
                        aria-label="Estado"
                    >
                        {STATUS_CHIPS.map((chip) => (
                            <button
                                key={chip.value}
                                type="button"
                                aria-pressed={activeStatus === chip.value}
                                onClick={() => navigate({ status: chip.value === 'all' ? undefined : chip.value })}
                                className={cn(
                                    'inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors sm:h-9',
                                    activeStatus === chip.value
                                        ? 'border-[var(--brand-primary)]/40 bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]'
                                        : 'border-border/60 bg-card text-muted-foreground hover:bg-muted',
                                )}
                            >
                                {chip.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                    {wholesaleSales.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                                <Gem className="size-7" aria-hidden="true" />
                            </span>
                            <p className="font-semibold">No hay pedidos mayoristas registrados</p>
                            <p className="text-sm text-muted-foreground">Los pedidos a la medida del cliente aparecerán aquí.</p>
                        </div>
                    ) : isWide ? (
                        <OrderTable orders={wholesaleSales.data} canUpdate={canUpdate} />
                    ) : (
                        <PullToRefresh onRefresh={refresh}>{() => <OrderCards orders={wholesaleSales.data} canUpdate={canUpdate} />}</PullToRefresh>
                    )}
                    <PaginationFooter data={{ ...wholesaleSales, resourceLabel: 'pedidos mayoristas' }} />
                </div>
            </div>
        </AppLayout>
    );
}
