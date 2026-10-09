import PaginationFooter from '@/components/common/PaginationFooter';
import { SearchField } from '@/components/common/search-field';
import { ProductCards, ProductTable } from '@/components/products/product-list';
import { SELECT_TRIGGER } from '@/components/sales/form-fields';
import { PullToRefresh } from '@/components/ui/bencho/pull-to-refresh';
import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { usePermissions } from '@/hooks/use-permissions';
import { usePolling } from '@/hooks/use-polling';
import { usePrinter } from '@/hooks/use-printer';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type Branch, type BreadcrumbItem, type Category, type Product } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Package, Plus, Printer, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface ProductsPageProps {
    products: {
        data: Product[];
        links: { label: string; url: string | null }[];
        current_page: number;
        from: number;
        to: number;
        total: number;
        last_page: number;
    };
    categories: Category[];
    branches: Branch[];
    filters?: {
        search?: string;
        status?: string;
        category?: string;
        branch?: string;
        type?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Catálogo', href: '/products' },
];

const TYPE_TABS = [
    { value: 'all', label: 'Todos' },
    { value: 'producto', label: 'Productos' },
    { value: 'servicio', label: 'Servicios' },
];

const formatCount = (value: number): string => String(value);

export default function Products({
    products,
    categories = [],
    branches = [],
    filters = { search: '', status: 'all', category: 'all', branch: 'all' },
}: ProductsPageProps) {
    const onBrand = useOnBrandColor();
    const isWide = useMediaQuery('(min-width: 768px)');
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [category, setCategory] = useState(filters?.category || 'all');
    const [branch, setBranch] = useState(filters?.branch || 'all');
    const [typeFilter, setTypeFilter] = useState(filters?.type || 'all');
    const [isSearching, setIsSearching] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [printingLabels, setPrintingLabels] = useState(false);
    const printer = usePrinter();

    // Drop any selected id that's no longer in the visible page (new
    // filter/search/page navigation, or the 60s background poll removing a
    // row) — but keep selections that are still visible, so the 60s poll
    // doesn't silently wipe out a selection mid-click.
    useEffect(() => {
        const visibleIds = new Set(products.data.map((product) => product.id));
        setSelectedIds((previous) => new Set([...previous].filter((id) => visibleIds.has(id))));
    }, [products.data]);

    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Polling: refresh product list (stock levels) every 60 seconds
    usePolling(['products'], 60_000);

    const { can } = usePermissions();
    // branches.view: only Administrador holds it among the default roles —
    // matches the previous admin-only branch column/filter exactly.
    const isAdmin = can('branches.view');
    const canCreate = can('products.create');

    // Debounced auto-search on text input change
    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            applyFilters(search, status, category, branch, typeFilter);
        }, 350);
        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const handleSearch = () => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        applyFilters();
    };

    const handleStatusChange = (newStatus: string) => {
        setStatus(newStatus);
        applyFilters(search, newStatus, category, branch, typeFilter);
    };

    const handleTypeChange = (newType: string) => {
        setTypeFilter(newType);
        applyFilters(search, status, category, branch, newType);
    };

    const applyFilters = (searchParam = search, statusParam = status, categoryParam = category, branchParam = branch, typeParam = typeFilter) => {
        setIsSearching(true);
        const params = new URLSearchParams();

        if (searchParam) params.append('search', searchParam);
        if (statusParam && statusParam !== 'all') params.append('status', statusParam);
        if (categoryParam && categoryParam !== 'all') params.append('category', categoryParam);
        if (branchParam && branchParam !== 'all') params.append('branch', branchParam);
        if (typeParam && typeParam !== 'all') params.append('type', typeParam);

        router.visit(`/products?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['products'],
            onFinish: () => setIsSearching(false),
        });
    };

    const toggleSelected = (id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handlePrintSelectedLabels = async () => {
        if (printer.status !== 'connected' || !printer.selectedPrinter) {
            toast.error('QZ Tray no conectado. Configura la impresora en el POS.');
            return;
        }
        setPrintingLabels(true);
        try {
            const requested = selectedIds.size;
            const { printedCount } = await printer.printLabels(Array.from(selectedIds));
            if (printedCount === requested) {
                toast.success(`${printedCount} etiqueta(s) enviadas a la impresora`);
            } else if (printedCount > 0) {
                toast.success(`${printedCount} de ${requested} etiqueta(s) enviadas — algunos productos no están disponibles para ti`);
            } else {
                toast.error('Ninguno de los productos seleccionados está disponible para imprimir.');
            }
            setSelectedIds(new Set());
        } catch (err) {
            toast.error('Error al imprimir: ' + (err as Error).message);
        } finally {
            setPrintingLabels(false);
        }
    };

    const refresh = useCallback(
        () =>
            new Promise<void>((resolve) => {
                router.reload({ only: ['products'], onFinish: () => resolve() });
            }),
        [],
    );

    const listProps = {
        products: products.data,
        selectable: canCreate,
        selectedIds,
        onToggle: toggleSelected,
        busy: printingLabels,
        showBranch: isAdmin,
        canEdit: can('products.edit'),
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Catálogo" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Catálogo</h1>
                        <p className="text-sm text-muted-foreground">
                            <RollingNumber value={products.total} format={formatCount} intro className="font-medium text-foreground tabular-nums" />{' '}
                            {products.total === 1 ? 'artículo' : 'artículos'} entre productos y servicios
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {can('products.delete') && (
                            <Link
                                href="/products/trashed"
                                className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-card px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-10"
                            >
                                <Trash2 className="size-4" aria-hidden="true" />
                                <span className="hidden sm:inline">Papelera</span>
                                <span className="sr-only sm:hidden">Papelera</span>
                            </Link>
                        )}
                        {canCreate && (
                            <Link
                                href="/products/create"
                                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 sm:h-10 sm:flex-none"
                                style={{ color: onBrand.hex }}
                            >
                                <Plus className="size-4" aria-hidden="true" />
                                Nuevo
                            </Link>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <SearchField
                        id="product-search"
                        label="Buscar productos"
                        placeholder="Buscar por nombre o código..."
                        value={search}
                        onChange={setSearch}
                        onSubmit={handleSearch}
                    />
                    <div
                        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
                        role="group"
                        aria-label="Tipo"
                    >
                        {TYPE_TABS.map((tab) => (
                            <button
                                key={tab.value}
                                type="button"
                                aria-pressed={typeFilter === tab.value}
                                onClick={() => handleTypeChange(tab.value)}
                                className={cn(
                                    'inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors sm:h-9',
                                    typeFilter === tab.value
                                        ? 'border-[var(--brand-primary)]/40 bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]'
                                        : 'border-border/60 bg-card text-muted-foreground hover:bg-muted',
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div
                        className={cn('grid grid-cols-2 gap-3', isAdmin && branches.length > 0 ? 'md:grid-cols-3' : 'md:grid-cols-2', 'lg:max-w-2xl')}
                    >
                        <div className="space-y-1.5">
                            <label htmlFor="status-filter" className="text-xs font-medium text-muted-foreground">
                                Estado
                            </label>
                            <Select value={status} onValueChange={handleStatusChange}>
                                <SelectTrigger id="status-filter" className={SELECT_TRIGGER}>
                                    <SelectValue placeholder="Estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="1">Activos</SelectItem>
                                    <SelectItem value="0">Inactivos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="category-filter" className="text-xs font-medium text-muted-foreground">
                                Categoría
                            </label>
                            <Select
                                value={category}
                                onValueChange={(value) => {
                                    setCategory(value);
                                    applyFilters(search, status, value, branch);
                                }}
                            >
                                <SelectTrigger id="category-filter" className={SELECT_TRIGGER}>
                                    <SelectValue placeholder="Categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {categories.map((item) => (
                                        <SelectItem key={item.id} value={item.id.toString()}>
                                            {item.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {isAdmin && branches.length > 0 && (
                            <div className="col-span-2 space-y-1.5 md:col-span-1">
                                <label htmlFor="branch-filter" className="text-xs font-medium text-muted-foreground">
                                    Sucursal
                                </label>
                                <Select
                                    value={branch}
                                    onValueChange={(value) => {
                                        setBranch(value);
                                        applyFilters(search, status, category, value);
                                    }}
                                >
                                    <SelectTrigger id="branch-filter" className={SELECT_TRIGGER}>
                                        <SelectValue placeholder="Sucursal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {branches.map((item) => (
                                            <SelectItem key={item.id} value={item.id.toString()}>
                                                {item.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </div>

                {canCreate && selectedIds.size > 0 && (
                    <div
                        role="region"
                        aria-label="Selección"
                        className="sticky top-2 z-20 flex items-center justify-between gap-2 rounded-2xl border border-border/60 bg-card/95 p-2 pl-4 shadow-lg backdrop-blur"
                    >
                        <span className="text-sm font-medium tabular-nums">
                            {selectedIds.size} {selectedIds.size === 1 ? 'seleccionado' : 'seleccionados'}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedIds(new Set())}
                                disabled={printingLabels}
                                aria-label="Quitar selección"
                                className="flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted sm:size-10"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                onClick={handlePrintSelectedLabels}
                                disabled={printingLabels}
                                className="flex h-11 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold disabled:opacity-60 sm:h-10"
                                style={{ color: onBrand.hex }}
                            >
                                <Printer className="size-4" aria-hidden="true" />
                                {printingLabels ? 'Imprimiendo...' : `Imprimir etiquetas (${selectedIds.size})`}
                            </button>
                        </div>
                    </div>
                )}

                <div
                    aria-busy={isSearching}
                    className={cn(
                        'overflow-hidden rounded-2xl border border-border/60 bg-card transition-opacity',
                        isSearching && 'pointer-events-none opacity-60',
                    )}
                >
                    {products.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                                <Package className="size-7" aria-hidden="true" />
                            </span>
                            <p className="font-semibold">No hay productos que mostrar</p>
                            <p className="text-sm text-muted-foreground">Prueba con otra búsqueda o quita algún filtro.</p>
                        </div>
                    ) : isWide ? (
                        <ProductTable {...listProps} />
                    ) : (
                        <PullToRefresh onRefresh={refresh}>{() => <ProductCards {...listProps} />}</PullToRefresh>
                    )}
                    <PaginationFooter data={{ ...products, resourceLabel: 'productos' }} />
                </div>
            </div>
        </AppLayout>
    );
}
