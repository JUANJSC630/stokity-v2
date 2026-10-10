import PaginationFooter from '@/components/common/PaginationFooter';
import { SearchField } from '@/components/common/search-field';
import { SELECT_TRIGGER } from '@/components/sales/form-fields';
import { SupplierCards, SupplierTable } from '@/components/suppliers/supplier-list';
import { PullToRefresh } from '@/components/ui/bencho/pull-to-refresh';
import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { usePolling } from '@/hooks/use-polling';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type Branch, type BreadcrumbItem, type Supplier } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Plus, Truck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface PageProps {
    suppliers: {
        data: Supplier[];
        links: { label: string; url: string | null }[];
        current_page: number;
        from: number;
        to: number;
        total: number;
        last_page: number;
    };
    branches: Branch[];
    filters: {
        search?: string;
        status?: string;
        branch?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Proveedores', href: '/suppliers' },
];

const STATUS_CHIPS = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
];

const formatCount = (value: number): string => String(value);

export default function Index({ suppliers, branches, filters }: PageProps) {
    usePolling(['suppliers'], 120_000);
    const onBrand = useOnBrandColor();
    const isWide = useMediaQuery('(min-width: 768px)');

    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [branch, setBranch] = useState(filters.branch || 'all');
    const [isSearching, setIsSearching] = useState(false);
    const hasResetRef = useRef(false);

    useEffect(() => {
        if (search.trim() === '') {
            const url = new URL(window.location.href);
            if (!hasResetRef.current && url.searchParams.get('search')) {
                hasResetRef.current = true;
                applyFilters('');
            }
        } else {
            hasResetRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const visit = (searchParam: string, statusParam: string, branchParam: string) => {
        setIsSearching(true);
        const params = new URLSearchParams();
        if (searchParam) params.append('search', searchParam);
        if (statusParam && statusParam !== 'all') params.append('status', statusParam);
        if (branchParam && branchParam !== 'all') params.append('branch', branchParam);

        router.visit(`/suppliers?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
            only: ['suppliers'],
            onFinish: () => setIsSearching(false),
        });
    };

    const applyFilters = (searchParam = search) => visit(searchParam, status, branch);

    const handleStatusChange = (value: string) => {
        setStatus(value);
        visit(search, value, branch);
    };

    const handleBranchChange = (value: string) => {
        setBranch(value);
        visit(search, status, value);
    };

    const refresh = useCallback(
        () =>
            new Promise<void>((resolve) => {
                router.reload({ only: ['suppliers'], onFinish: () => resolve() });
            }),
        [],
    );

    const listProps = { suppliers: suppliers.data, showBranch: branches.length > 0 };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Proveedores" />
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Gestión de Proveedores</h1>
                        <p className="text-sm text-muted-foreground">
                            <RollingNumber value={suppliers.total} format={formatCount} intro className="font-medium text-foreground tabular-nums" />{' '}
                            {suppliers.total === 1 ? 'proveedor' : 'proveedores'} para tus compras de inventario
                        </p>
                    </div>
                    <Link
                        href={route('suppliers.create')}
                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 sm:h-10"
                        style={{ color: onBrand.hex }}
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        Nuevo Proveedor
                    </Link>
                </div>

                <div className="flex flex-col gap-3">
                    <SearchField
                        id="supplier-search"
                        label="Buscar proveedores"
                        placeholder="Nombre, NIT, contacto, correo..."
                        value={search}
                        onChange={setSearch}
                        onSubmit={() => applyFilters()}
                    />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div
                            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
                            role="group"
                            aria-label="Estado"
                        >
                            {STATUS_CHIPS.map((chip) => (
                                <button
                                    key={chip.value}
                                    type="button"
                                    aria-pressed={status === chip.value}
                                    onClick={() => handleStatusChange(chip.value)}
                                    className={cn(
                                        'inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors sm:h-9',
                                        status === chip.value
                                            ? 'border-[var(--brand-primary)]/40 bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]'
                                            : 'border-border/60 bg-card text-muted-foreground hover:bg-muted',
                                    )}
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                        {branches.length > 0 && (
                            <div className="space-y-1.5 sm:w-56">
                                <label htmlFor="branch-filter" className="text-xs font-medium text-muted-foreground">
                                    Sucursal
                                </label>
                                <Select value={branch} onValueChange={handleBranchChange}>
                                    <SelectTrigger id="branch-filter" className={`${SELECT_TRIGGER} text-left [&>span]:truncate`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {branches.map((item) => (
                                            <SelectItem key={item.id} value={String(item.id)}>
                                                {item.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </div>

                <div
                    aria-busy={isSearching}
                    className={cn(
                        'overflow-hidden rounded-2xl border border-border/60 bg-card transition-opacity',
                        isSearching && 'pointer-events-none opacity-60',
                    )}
                >
                    {suppliers.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                                <Truck className="size-7" aria-hidden="true" />
                            </span>
                            <p className="font-semibold">No se encontraron proveedores</p>
                            <p className="text-sm text-muted-foreground">Prueba con otra búsqueda o registra un proveedor nuevo.</p>
                        </div>
                    ) : isWide ? (
                        <SupplierTable {...listProps} />
                    ) : (
                        <PullToRefresh onRefresh={refresh}>{() => <SupplierCards {...listProps} />}</PullToRefresh>
                    )}
                    <PaginationFooter data={{ ...suppliers, resourceLabel: 'proveedores' }} />
                </div>
            </div>
        </AppLayout>
    );
}
