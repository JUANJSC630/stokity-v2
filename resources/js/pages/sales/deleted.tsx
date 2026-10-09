import PaginationFooter from '@/components/common/PaginationFooter';
import { StaggerItem } from '@/components/ui/bencho/stagger-item';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency, formatDateTime, formatRelativeTime } from '@/lib/format';
import { type BreadcrumbItem, type Sale } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Eye, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';

type DeletedSale = Sale & { deleted_at: string };

interface PageProps {
    sales: {
        data: DeletedSale[];
        links: { label: string; url: string | null }[];
        current_page: number;
        from: number;
        to: number;
        total: number;
        last_page: number;
    };
    filters: {
        search?: string;
        date_from?: string;
        date_to?: string;
    };
}

const clientName = (sale: Sale): string => sale.client?.name || 'Consumidor final';

export default function Deleted({ sales, filters }: PageProps) {
    const [search, setSearch] = useState(filters.search || '');
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Ventas', href: '/sales' },
        { title: 'Eliminadas', href: route('sales.deleted.index') },
    ];

    const applyFilters = (searchParam = search) => {
        const params = new URLSearchParams();
        if (searchParam) params.append('search', searchParam);
        const query = params.toString();
        router.visit(query ? `${route('sales.deleted.index')}?${query}` : route('sales.deleted.index'), {
            preserveState: true,
            preserveScroll: true,
            only: ['sales'],
        });
    };

    const clearSearch = () => {
        setSearch('');
        applyFilters('');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ventas eliminadas" />
            <div className="flex flex-col gap-5 p-4 sm:p-6">
                <div className="flex items-start gap-3">
                    <Link
                        href={route('sales.index')}
                        aria-label="Volver a ventas"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted sm:h-8 sm:w-8"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="flex items-center gap-2 text-xl leading-tight font-bold sm:text-2xl">
                            <Trash2 className="size-5 shrink-0 text-red-500" aria-hidden="true" />
                            Ventas eliminadas
                        </h1>
                        <p className="text-sm text-muted-foreground">Historial de ventas eliminadas, solo visible para administradores.</p>
                    </div>
                </div>

                <form
                    role="search"
                    onSubmit={(event) => {
                        event.preventDefault();
                        applyFilters();
                    }}
                    className="relative"
                >
                    <label htmlFor="deleted-search" className="sr-only">
                        Buscar ventas eliminadas
                    </label>
                    <Search
                        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                    />
                    <input
                        id="deleted-search"
                        type="search"
                        inputMode="search"
                        enterKeyHint="search"
                        autoComplete="off"
                        placeholder="Código, cliente o vendedor"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="h-11 w-full rounded-xl border border-border/60 bg-card pr-12 pl-10 text-base focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none sm:h-10 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
                    />
                    {search && (
                        <button
                            type="button"
                            aria-label="Borrar búsqueda"
                            onClick={clearSearch}
                            className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground sm:size-9"
                        >
                            <X className="size-4" aria-hidden="true" />
                        </button>
                    )}
                </form>

                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                    {sales.data.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                                <Trash2 className="size-7" aria-hidden="true" />
                            </span>
                            <div>
                                <p className="font-semibold">{filters.search ? 'Ninguna venta eliminada coincide' : 'No hay ventas eliminadas'}</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {filters.search ? 'Prueba con otro código o cliente.' : 'Las ventas que se eliminen aparecerán aquí.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <ul aria-label={`${sales.data.length} venta(s) eliminada(s)`} className="divide-y divide-border/40 md:hidden">
                                {sales.data.map((sale, index) => (
                                    <li key={sale.id}>
                                        <StaggerItem index={index}>
                                            <Link
                                                href={route('sales.deleted.show', sale.id)}
                                                className="flex min-h-16 items-center gap-3 p-4 active:bg-muted/40"
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                                                >
                                                    <Trash2 className="size-5" />
                                                </span>
                                                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                                    <span className="flex items-baseline justify-between gap-2">
                                                        <span className="min-w-0 truncate text-[15px] font-semibold">{clientName(sale)}</span>
                                                        <span className="shrink-0 text-[15px] font-bold tabular-nums">
                                                            {formatCurrency(sale.total)}
                                                        </span>
                                                    </span>
                                                    <span className="truncate text-xs text-muted-foreground line-through">{sale.code}</span>
                                                    <span className="truncate text-xs font-medium text-red-600 dark:text-red-400">
                                                        Eliminada {formatRelativeTime(sale.deleted_at)}
                                                    </span>
                                                    <span className="truncate text-xs text-muted-foreground">
                                                        Vendida el {formatDateTime(sale.date)}
                                                    </span>
                                                </span>
                                                <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                                            </Link>
                                        </StaggerItem>
                                    </li>
                                ))}
                            </ul>

                            <table className="hidden w-full text-sm md:table">
                                <caption className="sr-only">Ventas eliminadas</caption>
                                <thead>
                                    <tr className="border-b border-border/60 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                                        <th scope="col" className="px-6 py-3 font-medium">
                                            Venta
                                        </th>
                                        <th scope="col" className="px-3 py-3 font-medium">
                                            Vendida el
                                        </th>
                                        <th scope="col" className="px-3 py-3 font-medium">
                                            Eliminada el
                                        </th>
                                        <th scope="col" className="px-3 py-3 text-right font-medium">
                                            Total
                                        </th>
                                        <th scope="col" className="w-16 px-6 py-3 text-right font-medium">
                                            <span className="sr-only">Acciones</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {sales.data.map((sale) => (
                                        <tr key={sale.id} className="transition-colors hover:bg-muted/40">
                                            <td className="px-6 py-3">
                                                <p className="font-medium">{clientName(sale)}</p>
                                                <p className="text-xs text-muted-foreground line-through">{sale.code}</p>
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{formatDateTime(sale.date)}</td>
                                            <td className="px-3 py-3 whitespace-nowrap text-red-600 dark:text-red-400">
                                                {formatDateTime(sale.deleted_at)}
                                            </td>
                                            <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatCurrency(sale.total)}</td>
                                            <td className="px-6 py-3">
                                                <div className="flex justify-end">
                                                    <Link
                                                        href={route('sales.deleted.show', sale.id)}
                                                        aria-label={`Ver detalle de ${sale.code}`}
                                                        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                                                    >
                                                        <Eye className="size-4" aria-hidden="true" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}
                    <PaginationFooter data={{ ...sales, resourceLabel: 'ventas' }} />
                </div>
            </div>
        </AppLayout>
    );
}
