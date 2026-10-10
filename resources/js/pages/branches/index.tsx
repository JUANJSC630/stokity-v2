import { BranchCards, BranchTable } from '@/components/branches/branch-list';
import PaginationFooter from '@/components/common/PaginationFooter';
import { SearchField } from '@/components/common/search-field';
import { PullToRefresh } from '@/components/ui/bencho/pull-to-refresh';
import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { usePermissions } from '@/hooks/use-permissions';
import { usePolling } from '@/hooks/use-polling';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type Branch, type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Building2, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface BranchesPageProps {
    branches: {
        data: Branch[];
        links: { label: string; url: string | null }[];
        current_page: number;
        from: number;
        to: number;
        total: number;
        last_page: number;
    };
    filters?: {
        search?: string;
        status?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Sucursales',
        href: '/branches',
    },
];

const STATUS_CHIPS = [
    { value: 'all', label: 'Todas' },
    { value: '1', label: 'Activas' },
    { value: '0', label: 'Inactivas' },
];

const formatCount = (value: number): string => String(value);

export default function Branches({ branches, filters = { search: '', status: 'all' } }: BranchesPageProps) {
    const { can } = usePermissions();
    usePolling(['branches'], 120_000);
    const isWide = useMediaQuery('(min-width: 768px)');
    const onBrand = useOnBrandColor();

    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [isSearching, setIsSearching] = useState(false);

    const hasResetRef = useRef(false);
    useEffect(() => {
        if (search.trim() === '') {
            const url = new URL(window.location.href);
            const hasFilters = url.searchParams.get('search') || url.searchParams.get('status');
            if (!hasResetRef.current && hasFilters) {
                hasResetRef.current = true;
                setSearch('');
                setStatus('all');
                applyFilters('', 'all');
            }
        } else {
            hasResetRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const applyFilters = (searchParam = search, statusParam = status) => {
        setIsSearching(true);
        const params = new URLSearchParams();

        if (searchParam) {
            params.append('search', searchParam);
        }

        if (statusParam && statusParam !== 'all') {
            params.append('status', statusParam);
        }

        router.visit(`/branches?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
            only: ['branches'],
            onFinish: () => setIsSearching(false),
        });
    };

    const handleStatusChange = (newStatus: string) => {
        setStatus(newStatus);
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (newStatus && newStatus !== 'all') params.append('status', newStatus);
        router.visit(`/branches?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
            only: ['branches'],
        });
    };

    const refresh = useCallback(
        () =>
            new Promise<void>((resolve) => {
                router.reload({ only: ['branches'], onFinish: () => resolve() });
            }),
        [],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión de Sucursales" />
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Gestión de Sucursales</h1>
                        <p className="text-sm text-muted-foreground">
                            <RollingNumber value={branches.total} format={formatCount} intro className="font-medium text-foreground tabular-nums" />{' '}
                            {branches.total === 1 ? 'sucursal' : 'sucursales'} de tu negocio
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:flex">
                        {can('branches.delete') && (
                            <Link
                                href="/branches/trashed"
                                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border/60 bg-card px-4 text-sm font-medium transition-colors hover:bg-muted sm:h-10"
                            >
                                <Trash2 className="size-4" aria-hidden="true" />
                                <span>Sucursales Eliminadas</span>
                            </Link>
                        )}
                        {can('branches.create') && (
                            <Link
                                href="/branches/create"
                                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 sm:h-10"
                                style={{ color: onBrand.hex }}
                            >
                                <Plus className="size-4" aria-hidden="true" />
                                <span>Nueva Sucursal</span>
                            </Link>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <SearchField
                        id="branch-search"
                        label="Buscar sucursales"
                        placeholder="Buscar por nombre, dirección o gerente"
                        value={search}
                        onChange={setSearch}
                        onSubmit={() => applyFilters()}
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
                </div>

                <div
                    aria-busy={isSearching}
                    className={cn(
                        'overflow-hidden rounded-2xl border border-border/60 bg-card transition-opacity',
                        isSearching && 'pointer-events-none opacity-60',
                    )}
                >
                    {branches.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                                <Building2 className="size-7" aria-hidden="true" />
                            </span>
                            <p className="font-semibold">No se encontraron sucursales</p>
                            <p className="text-sm text-muted-foreground">Prueba con otra búsqueda o crea una sucursal nueva.</p>
                        </div>
                    ) : isWide ? (
                        <BranchTable branches={branches.data} />
                    ) : (
                        <PullToRefresh onRefresh={refresh}>{() => <BranchCards branches={branches.data} />}</PullToRefresh>
                    )}
                    <PaginationFooter data={{ ...branches, resourceLabel: 'sucursales' }} />
                </div>
            </div>
        </AppLayout>
    );
}
