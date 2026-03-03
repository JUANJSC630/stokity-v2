import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, Edit, ShoppingBag } from 'lucide-react';
import { useState } from 'react';

interface Client {
    id: number;
    name: string;
    document: string;
    phone: string | null;
    address: string | null;
    email: string | null;
    birthdate: string | null;
    created_at: string;
    updated_at: string;
}

interface Sale {
    id: number;
    code: string;
    total: number;
    discount_amount: number;
    status: string;
    payment_method: string;
    created_at: string;
    seller?: { name: string } | null;
}

interface PaginatedSales {
    data: Sale[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Stats {
    total_sales: number;
    total_spent: number;
    last_purchase: string | null;
}

interface Props {
    client: Client;
    sales: PaginatedSales;
    stats: Stats;
}

function formatCOP(value: number) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    completed: { label: 'Completada', variant: 'default' },
    pending: { label: 'Pendiente', variant: 'secondary' },
    cancelled: { label: 'Cancelada', variant: 'destructive' },
};

export default function Show({ client, sales, stats }: Props) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const fromSale = searchParams ? searchParams.get('fromSale') : null;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Clientes', href: '/clients' },
        { title: client.name, href: `/clients/${client.id}` },
    ];

    function handleDelete() {
        router.delete(route('clients.destroy', client.id));
        setIsDeleteDialogOpen(false);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Cliente: ${client.name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex items-center gap-2">
                    {fromSale ? (
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => (window.location.href = `/sales/${fromSale}`)}>
                            <ChevronLeft className="size-4" />
                        </Button>
                    ) : (
                        <Link href={route('clients.index')}>
                            <Button variant="outline" size="icon" className="h-8 w-8">
                                <ChevronLeft className="size-4" />
                            </Button>
                        </Link>
                    )}
                    <h1 className="text-2xl font-bold">{client.name}</h1>
                </div>

                {/* Información del cliente */}
                <Card>
                    <CardHeader>
                        <CardTitle>Información del Cliente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">Nombre</dt>
                                <dd className="mt-1 text-lg">{client.name}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">Documento</dt>
                                <dd className="mt-1 text-lg">{client.document}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">Teléfono</dt>
                                <dd className="mt-1 text-lg">{client.phone || '—'}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">Correo Electrónico</dt>
                                <dd className="mt-1 text-lg">{client.email || '—'}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">Dirección</dt>
                                <dd className="mt-1 text-lg">{client.address || '—'}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">Fecha de Nacimiento</dt>
                                <dd className="mt-1 text-lg">
                                    {client.birthdate ? new Date(client.birthdate).toLocaleDateString('es-CO') : '—'}
                                </dd>
                            </div>
                        </dl>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 border-t px-6 py-4 md:flex-row md:justify-between md:gap-0">
                        <div className="text-sm text-muted-foreground">
                            <p>Creado: {new Date(client.created_at).toLocaleDateString('es-CO')}</p>
                            <p>Última actualización: {new Date(client.updated_at).toLocaleDateString('es-CO')}</p>
                        </div>
                        <div className="flex gap-2 self-end md:self-center">
                            <Link href={route('clients.edit', client.id)}>
                                <Button variant="outline" className="flex gap-1">
                                    <Edit className="size-4" />
                                    <span>Editar</span>
                                </Button>
                            </Link>
                        </div>
                    </CardFooter>
                </Card>

                {/* Resumen de compras */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card className="border-blue-100 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/10">
                        <CardContent className="pt-4">
                            <p className="text-sm text-muted-foreground">Total compras</p>
                            <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.total_sales}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-green-100 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10">
                        <CardContent className="pt-4">
                            <p className="text-sm text-muted-foreground">Total gastado</p>
                            <p className="mt-1 text-2xl font-bold text-green-700 dark:text-green-300">{formatCOP(stats.total_spent)}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-purple-100 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-900/10">
                        <CardContent className="pt-4">
                            <p className="text-sm text-muted-foreground">Última compra</p>
                            <p className="mt-1 text-2xl font-bold text-purple-700 dark:text-purple-300">
                                {stats.last_purchase
                                    ? new Date(stats.last_purchase).toLocaleDateString('es-CO')
                                    : '—'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Historial de compras */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-2 pb-3">
                        <ShoppingBag className="size-5 text-muted-foreground" />
                        <CardTitle>Historial de Compras</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {sales.data.length === 0 ? (
                            <p className="px-6 py-8 text-center text-muted-foreground">Este cliente no tiene ventas registradas.</p>
                        ) : (
                            <>
                                {/* Tabla desktop */}
                                <div className="hidden overflow-x-auto md:block">
                                    <table className="w-full text-sm">
                                        <thead className="border-b bg-muted/40">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-semibold">Código</th>
                                                <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                                                <th className="px-4 py-3 text-left font-semibold">Vendedor</th>
                                                <th className="px-4 py-3 text-right font-semibold">Descuento</th>
                                                <th className="px-4 py-3 text-right font-semibold">Total</th>
                                                <th className="px-4 py-3 text-center font-semibold">Estado</th>
                                                <th className="px-4 py-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {sales.data.map((sale) => {
                                                const status = STATUS_LABELS[sale.status] ?? { label: sale.status, variant: 'outline' as const };
                                                return (
                                                    <tr key={sale.id} className="hover:bg-muted/20">
                                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{sale.code}</td>
                                                        <td className="px-4 py-3">
                                                            {new Date(sale.created_at).toLocaleDateString('es-CO')}
                                                        </td>
                                                        <td className="px-4 py-3 text-muted-foreground">{sale.seller?.name ?? '—'}</td>
                                                        <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                                                            {sale.discount_amount > 0 ? `− ${formatCOP(sale.discount_amount)}` : '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-semibold text-green-700 dark:text-green-300">
                                                            {formatCOP(sale.total)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <Badge variant={status.variant}>{status.label}</Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <Link href={route('sales.show', sale.id)}>
                                                                <Button variant="ghost" size="sm">Ver</Button>
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Cards móvil */}
                                <div className="flex flex-col divide-y md:hidden">
                                    {sales.data.map((sale) => {
                                        const status = STATUS_LABELS[sale.status] ?? { label: sale.status, variant: 'outline' as const };
                                        return (
                                            <div key={sale.id} className="flex items-center justify-between px-4 py-3">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-mono text-xs text-muted-foreground">{sale.code}</span>
                                                    <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                                                        {formatCOP(sale.total)}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(sale.created_at).toLocaleDateString('es-CO')}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <Badge variant={status.variant}>{status.label}</Badge>
                                                    <Link href={route('sales.show', sale.id)}>
                                                        <Button variant="ghost" size="sm">Ver</Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Paginación */}
                                {sales.last_page > 1 && (
                                    <div className="flex items-center justify-between border-t px-4 py-3">
                                        <p className="text-sm text-muted-foreground">
                                            {sales.from}–{sales.to} de {sales.total} ventas
                                        </p>
                                        <div className="flex gap-1">
                                            {sales.links
                                                .filter((l) => l.url)
                                                .map((link, i) => (
                                                    <Link key={i} href={link.url!} preserveScroll>
                                                        <Button
                                                            variant={link.active ? 'default' : 'outline'}
                                                            size="sm"
                                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                                        />
                                                    </Link>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eliminar Cliente</DialogTitle>
                        <DialogDescription>
                            ¿Estás seguro de que deseas eliminar a {client.name}? Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Eliminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
