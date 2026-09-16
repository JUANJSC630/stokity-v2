import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency } from '@/lib/format';
import { type BreadcrumbItem, type WholesaleSale } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, Archive, Pencil, XCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
    wholesaleSale: WholesaleSale & { deleted_at?: string | null };
    canUpdate: boolean;
    canDelete: boolean;
    deleted?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline'; className?: string }> = {
    completed: { label: 'Completado', variant: 'secondary', className: 'bg-green-600 text-white hover:bg-green-700' },
    cancelled: { label: 'Cancelado', variant: 'outline' },
};

function CancelModal({ open, onClose, wholesaleSale }: { open: boolean; onClose: () => void; wholesaleSale: WholesaleSale }) {
    const [submitting, setSubmitting] = useState(false);

    function handleCancel() {
        setSubmitting(true);
        router.post(
            `/wholesale/${wholesaleSale.id}/cancel`,
            {},
            {
                onSuccess: () => {
                    toast.success('Pedido mayorista cancelado');
                    onClose();
                },
                onError: (errors) => {
                    Object.values(errors).forEach((e) => toast.error(e as string));
                    setSubmitting(false);
                },
                onFinish: () => setSubmitting(false),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-500">
                        <AlertCircle className="h-5 w-5" />
                        Cancelar pedido mayorista
                    </DialogTitle>
                    <DialogDescription>
                        Se cancelará el pedido <strong>{wholesaleSale.code}</strong> y su monto dejará de contar en los ingresos de Finanzas. El
                        pedido seguirá visible en la lista (marcado como "Cancelado") hasta que decidas eliminarlo.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={submitting}>
                        No, volver
                    </Button>
                    <Button variant="destructive" onClick={handleCancel} disabled={submitting}>
                        {submitting ? 'Cancelando...' : 'Sí, cancelar pedido'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DeleteModal({ open, onClose, wholesaleSale }: { open: boolean; onClose: () => void; wholesaleSale: WholesaleSale }) {
    const [submitting, setSubmitting] = useState(false);

    function handleDelete() {
        setSubmitting(true);
        router.delete(`/wholesale/${wholesaleSale.id}`, {
            onSuccess: () => {
                toast.success('Pedido mayorista eliminado');
                onClose();
            },
            onError: (errors) => {
                Object.values(errors).forEach((e) => toast.error(e as string));
                setSubmitting(false);
            },
            onFinish: () => setSubmitting(false),
        });
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-500">
                        <Archive className="h-5 w-5" />
                        Eliminar pedido mayorista
                    </DialogTitle>
                    <DialogDescription>
                        El pedido <strong>{wholesaleSale.code}</strong> desaparecerá de la lista de Mayorista. Queda guardado en "Pedidos
                        eliminados" por si necesitas consultarlo después.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={submitting}>
                        No, volver
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                        {submitting ? 'Eliminando...' : 'Sí, eliminar pedido'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function WholesaleShow({ wholesaleSale, canUpdate, canDelete, deleted = false }: Props) {
    const [cancelOpen, setCancelOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const statusCfg = STATUS_CONFIG[wholesaleSale.status] ?? STATUS_CONFIG.completed;
    const isCompleted = wholesaleSale.status === 'completed';
    const isCancelled = wholesaleSale.status === 'cancelled';

    const breadcrumbs: BreadcrumbItem[] = deleted
        ? [
              { title: 'Inicio', href: '/dashboard' },
              { title: 'Mayorista', href: '/wholesale' },
              { title: 'Eliminados', href: '/wholesale/deleted' },
              { title: wholesaleSale.code, href: `/wholesale/deleted/${wholesaleSale.id}` },
          ]
        : [
              { title: 'Inicio', href: '/dashboard' },
              { title: 'Mayorista', href: '/wholesale' },
              { title: wholesaleSale.code, href: `/wholesale/${wholesaleSale.id}` },
          ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Pedido ${wholesaleSale.code}`} />

            {!deleted && (
                <>
                    <CancelModal open={cancelOpen} onClose={() => setCancelOpen(false)} wholesaleSale={wholesaleSale} />
                    <DeleteModal open={deleteOpen} onClose={() => setDeleteOpen(false)} wholesaleSale={wholesaleSale} />
                </>
            )}

            <div className="mx-auto w-full max-w-3xl space-y-6 p-4 lg:p-6">
                {deleted && (
                    <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                        <Archive className="h-4 w-4 shrink-0" />
                        <span>
                            Este pedido fue eliminado
                            {wholesaleSale.deleted_at ? ` el ${format(new Date(wholesaleSale.deleted_at), 'd MMM yyyy', { locale: es })}` : ''}. Es
                            de solo lectura.
                        </span>
                    </div>
                )}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">{wholesaleSale.code}</h1>
                            <Badge variant={statusCfg.variant} className={statusCfg.className}>
                                {statusCfg.label}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{wholesaleSale.client?.name ?? 'Sin cliente'}</p>
                    </div>
                    {!deleted && (
                        <div className="flex gap-2">
                            {isCompleted && canUpdate && (
                                <Button variant="outline" asChild>
                                    <Link href={`/wholesale/${wholesaleSale.id}/edit`}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Editar
                                    </Link>
                                </Button>
                            )}
                            {isCompleted && canDelete && (
                                <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Cancelar pedido
                                </Button>
                            )}
                            {isCancelled && canDelete && (
                                <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                                    <Archive className="mr-2 h-4 w-4" />
                                    Eliminar
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Detalle del pedido</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                            <div>
                                <p className="text-muted-foreground">Vendedor</p>
                                <p className="font-medium">{wholesaleSale.seller?.name ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Sucursal</p>
                                <p className="font-medium">{wholesaleSale.branch?.name ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Fecha</p>
                                <p className="font-medium">{format(new Date(wholesaleSale.date), 'd MMM yyyy', { locale: es })}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Método de pago</p>
                                <p className="font-medium capitalize">{wholesaleSale.payment_method}</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr className="text-left">
                                        <th className="px-3 py-2 font-medium">Descripción</th>
                                        <th className="px-3 py-2 text-center font-medium">Cantidad</th>
                                        <th className="px-3 py-2 text-right font-medium">Precio unitario</th>
                                        <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {wholesaleSale.items.map((item) => (
                                        <tr key={item.id} className="border-t">
                                            <td className="px-3 py-2">{item.description}</td>
                                            <td className="px-3 py-2 text-center">{item.quantity}</td>
                                            <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                                            <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end border-t pt-3">
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Total</p>
                                <p className="text-2xl font-bold">{formatCurrency(wholesaleSale.total)}</p>
                            </div>
                        </div>

                        {wholesaleSale.estimated_cost !== null && (
                            <p className="text-sm text-muted-foreground">Costo de materiales (interno): {formatCurrency(wholesaleSale.estimated_cost)}</p>
                        )}

                        {wholesaleSale.notes && (
                            <div>
                                <p className="text-sm text-muted-foreground">Notas</p>
                                <p className="text-sm">{wholesaleSale.notes}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
