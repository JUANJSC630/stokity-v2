import { ClientCards, ClientTable } from '@/components/clients/client-list';
import PaginationFooter from '@/components/common/PaginationFooter';
import { SearchField } from '@/components/common/search-field';
import { PullToRefresh } from '@/components/ui/bencho/pull-to-refresh';
import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { Skeleton } from '@/components/ui/skeleton';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { usePolling } from '@/hooks/use-polling';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Client } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Plus, UserRound } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface PageProps {
    clients: {
        data: Client[];
        links: { label: string; url: string | null }[];
        current_page: number;
        from: number;
        to: number;
        total: number;
        last_page: number;
    };
    filters: {
        search?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Clientes',
        href: '/clients',
    },
];

const formatCount = (value: number): string => String(value);

export default function Index({ clients, filters }: PageProps) {
    const onBrand = useOnBrandColor();
    usePolling(['clients'], 60_000);

    const [search, setSearch] = useState(filters.search || '');
    const [isSearching, setIsSearching] = useState(false);

    const applyFilters = useCallback((searchParam: string) => {
        setIsSearching(true);
        const params = new URLSearchParams();
        if (searchParam) params.append('search', searchParam);
        const query = params.toString();

        router.visit(query ? `/clients?${query}` : '/clients', {
            preserveState: true,
            preserveScroll: true,
            only: ['clients'],
            onFinish: () => setIsSearching(false),
        });
    }, []);

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
    }, [search, applyFilters]);

    const refresh = useCallback(
        () =>
            new Promise<void>((resolve) => {
                router.reload({ only: ['clients'], onFinish: () => resolve() });
            }),
        [],
    );

    const isFiltered = search.trim() !== '' || Boolean(filters.search);

    const emptyState = (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <UserRound className="size-7" aria-hidden="true" />
            </span>
            <div>
                <p className="font-semibold">{isFiltered ? 'Ningún cliente coincide con la búsqueda' : 'Todavía no hay clientes'}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                    {isFiltered ? 'Prueba con otro nombre, documento o correo.' : 'Agrega el primero para asociarlo a sus ventas.'}
                </p>
            </div>
            {isFiltered ? (
                <button
                    type="button"
                    onClick={() => {
                        setSearch('');
                        applyFilters('');
                    }}
                    className="h-11 rounded-lg border border-border/60 px-4 text-sm font-medium hover:bg-muted sm:h-9"
                >
                    Limpiar búsqueda
                </button>
            ) : (
                <Link
                    href={route('clients.create')}
                    className="flex h-11 items-center rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-medium hover:opacity-90 sm:h-9"
                    style={{ color: onBrand.hex }}
                >
                    Nuevo cliente
                </Link>
            )}
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Clientes" />
            <div className="flex flex-col gap-5 p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl leading-tight font-bold sm:text-2xl">Clientes</h1>
                        <p className="text-sm text-muted-foreground">
                            <RollingNumber value={clients.total} format={formatCount} intro className="font-medium text-foreground tabular-nums" />{' '}
                            {clients.total === 1 ? 'cliente' : 'clientes'}
                            {isFiltered ? ' con esa búsqueda' : ' registrados'}
                        </p>
                    </div>
                    <Link
                        href={route('clients.create')}
                        className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-medium transition-opacity hover:opacity-90 sm:h-9"
                        style={{ color: onBrand.hex }}
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        Nuevo cliente
                    </Link>
                </div>

                <SearchField
                    id="client-search"
                    label="Buscar clientes"
                    placeholder="Nombre, documento o correo"
                    value={search}
                    onChange={setSearch}
                    onSubmit={() => applyFilters(search)}
                />

                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card" aria-busy={isSearching}>
                    {isSearching ? (
                        <div aria-hidden="true" className="flex flex-col divide-y divide-border/40">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 p-4">
                                    <Skeleton className="size-11 rounded-xl" />
                                    <div className="flex flex-1 flex-col gap-2">
                                        <Skeleton className="h-4 w-1/2" />
                                        <Skeleton className="h-3 w-2/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : clients.data.length === 0 ? (
                        emptyState
                    ) : (
                        <>
                            <div className="md:hidden">
                                <PullToRefresh onRefresh={refresh}>{() => <ClientCards clients={clients.data} />}</PullToRefresh>
                            </div>
                            <div className="hidden md:block">
                                <ClientTable clients={clients.data} />
                            </div>
                        </>
                    )}
                    <PaginationFooter data={{ ...clients, resourceLabel: 'clientes' }} />
                </div>
            </div>
        </AppLayout>
    );
}
