import PaginationFooter from '@/components/common/PaginationFooter';
import { SearchField } from '@/components/common/search-field';
import { StaggerItem } from '@/components/ui/bencho/stagger-item';
import { useMediaQuery } from '@/hooks/use-media-query';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency, formatDateTime, formatRelativeTime } from '@/lib/format';
import { type BreadcrumbItem, type PaginatedData, type WholesaleSale } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Eye, Trash2 } from 'lucide-react';
import { useState } from 'react';

type DeletedWholesaleSale = WholesaleSale & { deleted_at: string };

interface Props {
    wholesaleSales: PaginatedData<DeletedWholesaleSale>;
    filters: { search?: string };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Mayorista', href: '/wholesale' },
    { title: 'Eliminados', href: '/wholesale/deleted' },
];

const clientName = (order: WholesaleSale): string => order.client?.name ?? 'Sin cliente';

export default function WholesaleDeleted({ wholesaleSales, filters }: Props) {
    const isWide = useMediaQuery('(min-width: 768px)');
    const [search, setSearch] = useState(filters.search ?? '');

    function applyFilters(searchParam = search) {
        router.get(
            route('wholesale.deleted.index'),
            { search: searchParam || undefined },
            { preserveState: true, preserveScroll: true, only: ['wholesaleSales'] },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pedidos mayoristas eliminados" />
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex items-start gap-3">
                    <Link
                        href={route('wholesale.index')}
                        aria-label="Volver a mayorista"
                        className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted sm:size-9"
                    >
                        <ChevronLeft className="size-4" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="flex items-center gap-2 text-xl leading-tight font-bold sm:text-2xl">
                            <Trash2 className="size-5 shrink-0 text-red-500" aria-hidden="true" />
                            Pedidos mayoristas eliminados
                        </h1>
                        <p className="text-sm text-muted-foreground">Pedidos cancelados que se archivaron — solo lectura</p>
                    </div>
                </div>

                <SearchField
                    id="wholesale-deleted-search"
                    label="Buscar pedidos eliminados"
                    placeholder="Buscar por código o cliente"
                    value={search}
                    onChange={setSearch}
                    onSubmit={() => applyFilters()}
                />

                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                    {wholesaleSales.data.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                                <Trash2 className="size-7" aria-hidden="true" />
                            </span>
                            <p className="font-semibold">No hay pedidos mayoristas eliminados</p>
                        </div>
                    ) : isWide ? (
                        <table className="w-full text-sm">
                            <caption className="sr-only">Pedidos mayoristas eliminados</caption>
                            <thead>
                                <tr className="border-b border-border/60 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                                    <th scope="col" className="px-6 py-3 font-medium">
                                        Pedido
                                    </th>
                                    <th scope="col" className="px-3 py-3 font-medium">
                                        Fecha del pedido
                                    </th>
                                    <th scope="col" className="px-3 py-3 font-medium">
                                        Eliminado el
                                    </th>
                                    <th scope="col" className="px-3 py-3 text-right font-medium">
                                        Total
                                    </th>
                                    <th scope="col" className="w-16 px-6 py-3">
                                        <span className="sr-only">Acciones</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {wholesaleSales.data.map((order) => (
                                    <tr key={order.id} className="transition-colors hover:bg-muted/40">
                                        <td className="px-6 py-3">
                                            <p className="font-medium">{clientName(order)}</p>
                                            <p className="text-xs text-muted-foreground">
                                                <span className="line-through">{order.code}</span>
                                            </p>
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{formatDateTime(order.date)}</td>
                                        <td className="px-3 py-3 whitespace-nowrap text-red-600 dark:text-red-400">
                                            {formatDateTime(order.deleted_at)}
                                        </td>
                                        <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatCurrency(order.total)}</td>
                                        <td className="px-6 py-3">
                                            <div className="flex justify-end">
                                                <Link
                                                    href={route('wholesale.deleted.show', order.id)}
                                                    aria-label="Ver detalle"
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
                    ) : (
                        <ul aria-label={`${wholesaleSales.data.length} pedido(s) eliminado(s)`} className="divide-y divide-border/40">
                            {wholesaleSales.data.map((order, index) => (
                                <li key={order.id}>
                                    <StaggerItem index={index}>
                                        <Link
                                            href={route('wholesale.deleted.show', order.id)}
                                            aria-label="Ver detalle"
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
                                                    <span className="min-w-0 truncate text-[15px] font-semibold">{clientName(order)}</span>
                                                    <span className="shrink-0 text-[15px] font-bold tabular-nums">{formatCurrency(order.total)}</span>
                                                </span>
                                                <span className="truncate text-xs text-muted-foreground line-through">{order.code}</span>
                                                <span className="truncate text-xs font-medium text-red-600 dark:text-red-400">
                                                    Eliminado {formatRelativeTime(order.deleted_at)}
                                                </span>
                                            </span>
                                            <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                                        </Link>
                                    </StaggerItem>
                                </li>
                            ))}
                        </ul>
                    )}
                    <PaginationFooter data={{ ...wholesaleSales, resourceLabel: 'pedidos eliminados' }} />
                </div>
            </div>
        </AppLayout>
    );
}
