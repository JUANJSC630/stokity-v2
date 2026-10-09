import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OrderMarker, OrderStatusPill } from '@/components/wholesale/wholesale-meta';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency } from '@/lib/format';
import { type BreadcrumbItem, type WholesaleSale } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, Archive, ChevronLeft, Pencil, XCircle } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';

interface Props {
    wholesaleSale: WholesaleSale & { deleted_at?: string | null };
    canUpdate: boolean;
    canDelete: boolean;
    deleted?: boolean;
}

const ACTION =
    'flex h-11 items-center justify-center gap-2 rounded-xl border border-border/60 bg-card px-4 text-sm font-medium transition-colors hover:bg-muted sm:h-10';
const KEEP_BUTTON = 'h-12 rounded-xl border border-border/60 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50';

function Fact({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 text-right font-medium break-words">{children}</dd>
        </div>
    );
}

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
                    <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <AlertCircle className="size-5" aria-hidden="true" />
                        Cancelar pedido mayorista
                    </DialogTitle>
                    <DialogDescription>
                        Se cancelará el pedido <strong>{wholesaleSale.code}</strong> y su monto dejará de contar en los ingresos de Finanzas. El
                        pedido seguirá visible en la lista (marcado como "Cancelado") hasta que decidas eliminarlo.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={onClose} disabled={submitting} className={KEEP_BUTTON}>
                        No, volver
                    </button>
                    <button
                        type="button"
                        onClick={handleCancel}
                        disabled={submitting}
                        className="h-12 rounded-xl bg-red-600 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                        {submitting ? 'Cancelando...' : 'Sí, cancelar pedido'}
                    </button>
                </div>
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
                    <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <Archive className="size-5" aria-hidden="true" />
                        Eliminar pedido mayorista
                    </DialogTitle>
                    <DialogDescription>
                        El pedido <strong>{wholesaleSale.code}</strong> desaparecerá de la lista de Mayorista. Queda guardado en "Pedidos eliminados"
                        por si necesitas consultarlo después.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={onClose} disabled={submitting} className={KEEP_BUTTON}>
                        No, volver
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={submitting}
                        className="h-12 rounded-xl bg-red-600 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                        {submitting ? 'Eliminando...' : 'Sí, eliminar pedido'}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function WholesaleShow({ wholesaleSale, canUpdate, canDelete, deleted = false }: Props) {
    const [cancelOpen, setCancelOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
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

            <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-6">
                {deleted && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                        <Archive className="size-4 shrink-0" aria-hidden="true" />
                        <span>
                            Este pedido fue eliminado
                            {wholesaleSale.deleted_at ? ` el ${format(new Date(wholesaleSale.deleted_at), 'd MMM yyyy', { locale: es })}` : ''}. Es de
                            solo lectura.
                        </span>
                    </div>
                )}

                <div className="flex items-start gap-3">
                    <Link
                        href={deleted ? '/wholesale/deleted' : '/wholesale'}
                        aria-label="Volver a mayorista"
                        className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted sm:size-9"
                    >
                        <ChevronLeft className="size-4" aria-hidden="true" />
                    </Link>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="font-mono text-xl font-bold tracking-tight sm:text-2xl">{wholesaleSale.code}</h1>
                            <OrderStatusPill status={wholesaleSale.status} />
                        </div>
                        <p className="text-sm text-muted-foreground">{wholesaleSale.client?.name ?? 'Sin cliente'}</p>
                    </div>
                </div>

                <div className="grid items-start gap-5 lg:grid-cols-[1fr_22rem]">
                    <div className="order-2 flex min-w-0 flex-col gap-5 lg:order-1">
                        <section className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                            <h2 className="px-5 pt-4 pb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Detalle del pedido</h2>

                            <table className="hidden w-full text-sm md:table">
                                <caption className="sr-only">Artículos del pedido</caption>
                                <thead>
                                    <tr className="border-y border-border/40 bg-muted/30 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                                        <th scope="col" className="px-5 py-2.5 font-medium">
                                            Descripción
                                        </th>
                                        <th scope="col" className="px-3 py-2.5 text-center font-medium">
                                            Cantidad
                                        </th>
                                        <th scope="col" className="px-3 py-2.5 text-right font-medium">
                                            Precio unitario
                                        </th>
                                        <th scope="col" className="px-5 py-2.5 text-right font-medium">
                                            Subtotal
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {wholesaleSale.items.map((item) => (
                                        <tr key={item.id}>
                                            <td className="px-5 py-3">{item.description}</td>
                                            <td className="px-3 py-3 text-center tabular-nums">{item.quantity}</td>
                                            <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(item.unit_price)}</td>
                                            <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatCurrency(item.subtotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <ul aria-label="Artículos del pedido" className="divide-y divide-border/40 border-t border-border/60 md:hidden">
                                {wholesaleSale.items.map((item) => (
                                    <li key={item.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                                        <div className="min-w-0">
                                            <p className="text-[15px] leading-snug font-medium">{item.description}</p>
                                            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                                                {item.quantity} × {formatCurrency(item.unit_price)}
                                            </p>
                                        </div>
                                        <span className="shrink-0 text-base font-bold tabular-nums">{formatCurrency(item.subtotal)}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        {(wholesaleSale.estimated_cost !== null || wholesaleSale.notes) && (
                            <section className="space-y-3 rounded-2xl border border-border/60 bg-card p-5">
                                {wholesaleSale.estimated_cost !== null && (
                                    <p className="text-sm text-muted-foreground">
                                        Costo de materiales (interno): {formatCurrency(wholesaleSale.estimated_cost)}
                                    </p>
                                )}
                                {wholesaleSale.notes && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Notas</p>
                                        <p className="text-sm">{wholesaleSale.notes}</p>
                                    </div>
                                )}
                            </section>
                        )}
                    </div>

                    <div className="order-1 flex min-w-0 flex-col gap-5 lg:sticky lg:top-4 lg:order-2">
                        <section className="rounded-2xl border border-border/60 bg-card p-5">
                            <div className="flex items-center gap-4">
                                <OrderMarker status={wholesaleSale.status} />
                                <div className="min-w-0">
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Total</p>
                                    <p className="text-3xl leading-tight font-bold tracking-tight tabular-nums">
                                        <RollingNumber value={Number(wholesaleSale.total)} format={formatCurrency} intro />
                                    </p>
                                </div>
                            </div>

                            {!deleted && (isCompleted ? canUpdate || canDelete : isCancelled && canDelete) && (
                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    {isCompleted && canUpdate && (
                                        <Link href={`/wholesale/${wholesaleSale.id}/edit`} className={ACTION}>
                                            <Pencil className="size-4" aria-hidden="true" />
                                            Editar
                                        </Link>
                                    )}
                                    {isCompleted && canDelete && (
                                        <button
                                            type="button"
                                            onClick={() => setCancelOpen(true)}
                                            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 sm:h-10 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                                        >
                                            <XCircle className="size-4" aria-hidden="true" />
                                            Cancelar pedido
                                        </button>
                                    )}
                                    {isCancelled && canDelete && (
                                        <button
                                            type="button"
                                            onClick={() => setDeleteOpen(true)}
                                            className="col-span-2 flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 sm:h-10 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                                        >
                                            <Archive className="size-4" aria-hidden="true" />
                                            Eliminar
                                        </button>
                                    )}
                                </div>
                            )}
                        </section>

                        <section className="rounded-2xl border border-border/60 bg-card">
                            <h2 className="px-5 pt-4 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Datos</h2>
                            <dl className="divide-y divide-border/40 px-5 pb-2">
                                <Fact label="Vendedor">{wholesaleSale.seller?.name ?? '—'}</Fact>
                                <Fact label="Sucursal">{wholesaleSale.branch?.name ?? '—'}</Fact>
                                <Fact label="Fecha">{format(new Date(wholesaleSale.date), 'd MMM yyyy', { locale: es })}</Fact>
                                <Fact label="Método de pago">
                                    <span className="capitalize">{wholesaleSale.payment_method}</span>
                                </Fact>
                            </dl>
                        </section>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
