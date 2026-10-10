import PaginationFooter from '@/components/common/PaginationFooter';
import { SearchField } from '@/components/common/search-field';
import { INPUT_CLASS, SELECT_TRIGGER } from '@/components/sales/form-fields';
import { MovementCards, MovementTable, type MovementRow } from '@/components/stock/movement-list';
import { MOVEMENT_TYPES, typeStyle } from '@/components/stock/stock-meta';
import { PullToRefresh } from '@/components/ui/bencho/pull-to-refresh';
import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { usePolling } from '@/hooks/use-polling';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowRightLeft, ListFilter, Plus, Search, X } from 'lucide-react';
import { useCallback, useState } from 'react';

interface Props {
    movements: {
        data: MovementRow[];
        links: { label: string; url: string | null }[];
        current_page: number;
        from: number;
        to: number;
        total: number;
        last_page: number;
    };
    branches: Array<{ id: number; name: string }>;
    products: Array<{ id: number; name: string; code: string }>;
    filters: {
        search?: string;
        type?: string;
        branch?: string;
        product?: string;
        start_date?: string;
        end_date?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Movimientos de Stock', href: '/stock-movements' },
];

const formatCount = (value: number): string => String(value);

export default function StockMovementsIndex({ movements, branches, products, filters }: Props) {
    const onBrand = useOnBrandColor();
    const isWide = useMediaQuery('(min-width: 768px)');

    // Polling: refresh movements list every 60 seconds
    usePolling(['movements'], 60_000);

    const [search, setSearch] = useState(filters.search || '');
    const [type, setType] = useState(filters.type || 'all');
    const [branch, setBranch] = useState(filters.branch || 'all');
    const [product, setProduct] = useState(filters.product || 'all');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const activeFilters = [type !== 'all', branch !== 'all', product !== 'all', startDate !== '', endDate !== ''].filter(Boolean).length;
    const showFields = isWide || filtersOpen;

    const handleFilter = () => {
        const filters = {
            search,
            type: type === 'all' ? '' : type,
            branch: branch === 'all' ? '' : branch,
            product: product === 'all' ? '' : product,
            start_date: startDate,
            end_date: endDate,
        };

        router.get('/stock-movements', filters, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setSearch('');
        setType('all');
        setBranch('all');
        setProduct('all');
        setStartDate('');
        setEndDate('');
        router.get('/stock-movements');
    };

    const refresh = useCallback(
        () =>
            new Promise<void>((resolve) => {
                router.reload({ only: ['movements'], onFinish: () => resolve() });
            }),
        [],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Movimientos de Stock" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Movimientos de Stock</h1>
                        <p className="text-sm text-muted-foreground">
                            <RollingNumber value={movements.total} format={formatCount} intro className="font-medium text-foreground tabular-nums" />{' '}
                            {movements.total === 1 ? 'movimiento registrado' : 'movimientos registrados'} · cada entrada y salida del inventario
                        </p>
                    </div>
                    <Link
                        href="/stock-movements/create"
                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 sm:h-10"
                        style={{ color: onBrand.hex }}
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        Nuevo Movimiento
                    </Link>
                </div>

                <section aria-label="Filtros" className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4">
                    <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                            <SearchField
                                id="movement-search"
                                label="Búsqueda"
                                placeholder="Buscar por referencia, notas o producto..."
                                value={search}
                                onChange={setSearch}
                                onSubmit={handleFilter}
                            />
                        </div>
                        {!isWide && (
                            <button
                                type="button"
                                aria-expanded={filtersOpen}
                                aria-controls="movement-filter-fields"
                                onClick={() => setFiltersOpen((open) => !open)}
                                className="relative flex h-11 shrink-0 items-center gap-2 rounded-xl border border-border/60 bg-card px-3.5 text-sm font-medium"
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
                        <>
                            <div id="movement-filter-fields" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="type-filter" className="text-xs font-medium text-muted-foreground">
                                        Tipo
                                    </label>
                                    <Select value={type} onValueChange={setType}>
                                        <SelectTrigger id="type-filter" className={`${SELECT_TRIGGER} text-left [&>span]:truncate`}>
                                            <SelectValue placeholder="Todos los tipos" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos los tipos</SelectItem>
                                            {MOVEMENT_TYPES.map((value) => (
                                                <SelectItem key={value} value={value}>
                                                    {typeStyle(value).label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {branches.length > 0 && (
                                    <div className="space-y-1.5">
                                        <label htmlFor="branch-filter" className="text-xs font-medium text-muted-foreground">
                                            Sucursal
                                        </label>
                                        <Select value={branch} onValueChange={setBranch}>
                                            <SelectTrigger id="branch-filter" className={`${SELECT_TRIGGER} text-left [&>span]:truncate`}>
                                                <SelectValue placeholder="Todas las sucursales" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todas las sucursales</SelectItem>
                                                {branches.map((item) => (
                                                    <SelectItem key={item.id} value={item.id.toString()}>
                                                        {item.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className={`space-y-1.5 ${branches.length > 0 ? '' : 'lg:col-span-2'}`}>
                                    <label htmlFor="product-filter" className="text-xs font-medium text-muted-foreground">
                                        Producto
                                    </label>
                                    <Select value={product} onValueChange={setProduct}>
                                        <SelectTrigger id="product-filter" className={`${SELECT_TRIGGER} text-left [&>span]:truncate`}>
                                            <SelectValue placeholder="Todos los productos" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos los productos</SelectItem>
                                            {products.map((item) => (
                                                <SelectItem key={item.id} value={item.id.toString()}>
                                                    {item.code} - {item.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="start-date" className="text-xs font-medium text-muted-foreground">
                                        Fecha desde
                                    </label>
                                    <input
                                        id="start-date"
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className={INPUT_CLASS}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="end-date" className="text-xs font-medium text-muted-foreground">
                                        Fecha hasta
                                    </label>
                                    <input
                                        id="end-date"
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className={INPUT_CLASS}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    onClick={handleFilter}
                                    className="h-11 flex-1 gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:opacity-90 sm:h-10 sm:flex-none"
                                    style={{ color: onBrand.hex }}
                                >
                                    <Search className="size-4" aria-hidden="true" />
                                    Filtrar
                                </Button>
                                <Button variant="outline" onClick={clearFilters} className="h-11 flex-1 gap-2 sm:h-10 sm:flex-none">
                                    <X className="size-4" aria-hidden="true" />
                                    Limpiar
                                </Button>
                            </div>
                        </>
                    )}
                </section>

                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                    {movements.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                                <ArrowRightLeft className="size-7" aria-hidden="true" />
                            </span>
                            <p className="font-semibold">No se encontraron movimientos de stock</p>
                            <p className="text-sm text-muted-foreground">Prueba con otros filtros o registra un movimiento.</p>
                        </div>
                    ) : isWide ? (
                        <MovementTable movements={movements.data} showProduct caption="Movimientos de stock" />
                    ) : (
                        <PullToRefresh onRefresh={refresh}>{() => <MovementCards movements={movements.data} showProduct />}</PullToRefresh>
                    )}
                    <PaginationFooter data={{ ...movements, resourceLabel: 'movimientos' }} />
                </div>
            </div>
        </AppLayout>
    );
}
