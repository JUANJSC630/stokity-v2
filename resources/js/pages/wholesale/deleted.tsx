import PaginationFooter from '@/components/common/PaginationFooter';
import { Table, type Column } from '@/components/common/Table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { type BreadcrumbItem, type PaginatedData, type WholesaleSale } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';

type DeletedWholesaleSale = WholesaleSale & { deleted_at: string };

interface Props {
    wholesaleSales: PaginatedData<DeletedWholesaleSale>;
    filters: { search?: string };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Mayorista', href: '/wholesale' },
    { title: 'Eliminados', href: route('wholesale.deleted.index') },
];

export default function WholesaleDeleted({ wholesaleSales, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    function applyFilters(searchParam = search) {
        router.get(
            route('wholesale.deleted.index'),
            { search: searchParam || undefined },
            { preserveState: true, preserveScroll: true, only: ['wholesaleSales'] },
        );
    }

    const columns: Column<DeletedWholesaleSale>[] = [
        {
            key: 'code',
            title: 'Código',
            render: (_, row) => <span className="text-muted-foreground line-through">{row.code}</span>,
        },
        { key: 'client', title: 'Cliente', render: (_, row) => row.client?.name ?? 'Sin cliente' },
        { key: 'total', title: 'Total', render: (_, row) => <span className="font-semibold">{formatCurrency(row.total)}</span> },
        { key: 'date', title: 'Fecha del pedido', render: (_, row) => formatDateTime(row.date) },
        {
            key: 'deleted_at',
            title: 'Eliminado el',
            render: (_, row) => <span className="text-red-600 dark:text-red-400">{formatDateTime(row.deleted_at)}</span>,
        },
        {
            key: 'id',
            title: 'Acciones',
            render: (_, row) => (
                <Link
                    href={route('wholesale.deleted.show', row.id)}
                    className="text-primary text-xs underline underline-offset-2 hover:opacity-80"
                >
                    Ver detalle
                </Link>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pedidos mayoristas eliminados" />
            <div className="mx-auto w-full max-w-7xl space-y-4 p-4 lg:p-6">
                <div className="flex items-center gap-3">
                    <Link
                        href={route('wholesale.index')}
                        className="border-border/60 bg-card text-muted-foreground hover:bg-muted flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold">
                            <Trash2 className="h-5 w-5 text-red-500" />
                            Pedidos mayoristas eliminados
                        </h1>
                        <p className="text-sm text-muted-foreground">Pedidos cancelados que se archivaron — solo lectura</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Buscar</CardTitle>
                        <CardDescription>Filtra por código o cliente</CardDescription>
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
                                <Search className="text-muted-foreground absolute top-2 left-2.5 h-3.5 w-3.5" />
                                <Input
                                    type="search"
                                    placeholder="Buscar por código o cliente"
                                    className="h-8 pl-8 text-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="border-border/60 bg-card hover:bg-muted rounded-lg border px-3 py-1.5 text-xs font-medium">
                                Buscar
                            </button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0">
                        <Table data={wholesaleSales.data} columns={columns} emptyMessage="No hay pedidos mayoristas eliminados" />
                        <PaginationFooter data={{ ...wholesaleSales, resourceLabel: 'pedidos eliminados' }} />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
