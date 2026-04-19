import PaginationFooter from '@/components/common/PaginationFooter';
import { Table, type Column } from '@/components/common/Table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { type BreadcrumbItem, type Sale } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Ventas', href: '/sales' },
    { title: 'Eliminadas', href: route('sales.deleted.index') },
];

interface PageProps {
    sales: {
        data: (Sale & { deleted_at: string })[];
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

export default function Deleted({ sales, filters }: PageProps) {
    const [search, setSearch] = useState(filters.search || '');

    const applyFilters = (searchParam = search) => {
        const params = new URLSearchParams();
        if (searchParam) params.append('search', searchParam);
        router.visit(`${route('sales.deleted.index')}?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
            only: ['sales'],
        });
    };

    const columns: Column<Sale & { deleted_at: string; actions: null }>[] = [
        { key: 'code', title: 'Código', render: (_: unknown, row: Sale) => <span className="line-through text-muted-foreground">{row.code}</span> },
        { key: 'client', title: 'Cliente', render: (_: unknown, row: Sale) => row.client?.name || 'Consumidor Final' },
        { key: 'total', title: 'Total', render: (_: unknown, row: Sale) => <span className="font-semibold">{formatCurrency(row.total)}</span> },
        { key: 'date', title: 'Fecha venta', render: (_: unknown, row: Sale) => formatDateTime(row.date) },
        {
            key: 'deleted_at',
            title: 'Eliminada el',
            render: (_: unknown, row: Sale & { deleted_at: string }) => (
                <span className="text-red-600 dark:text-red-400">{formatDateTime(row.deleted_at)}</span>
            ),
        },
        {
            key: 'actions',
            title: 'Acciones',
            render: (_: unknown, row: Sale) => (
                <Link
                    href={route('sales.deleted.show', row.id)}
                    className="flex items-center gap-1 text-xs text-primary underline underline-offset-2 hover:opacity-80"
                >
                    Ver detalle
                </Link>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ventas Eliminadas" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center gap-3">
                    <Link
                        href={route('sales.index')}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold">
                            <Trash2 className="h-5 w-5 text-red-500" />
                            Ventas Eliminadas
                        </h1>
                        <p className="text-sm text-muted-foreground">Historial de ventas eliminadas — solo visible para administradores</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Buscar</CardTitle>
                        <CardDescription>Filtra por código, cliente o vendedor</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                applyFilters();
                            }}
                            className="flex gap-2"
                        >
                            <div className="relative flex-1">
                                <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Buscar por código, cliente o vendedor"
                                    className="h-8 pl-8 text-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted">
                                Buscar
                            </button>
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch('');
                                        applyFilters('');
                                    }}
                                    className="rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
                                >
                                    Limpiar
                                </button>
                            )}
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0">
                        <Table
                            data={sales.data as (Sale & { deleted_at: string; actions: null })[]}
                            columns={columns}
                            emptyMessage="No hay ventas eliminadas en este período"
                        />
                        <PaginationFooter data={sales} />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
