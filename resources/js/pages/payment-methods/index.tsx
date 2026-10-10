import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { usePolling } from '@/hooks/use-polling';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type PaymentMethod } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Edit, Eye, EyeOff, GripVertical, Plus, Trash2, Wallet } from 'lucide-react';
import { useRef, useState } from 'react';

interface Props {
    paymentMethods: PaymentMethod[];
}

const breadcrumbs = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Métodos de Pago', href: '/payment-methods' },
];

export default function PaymentMethodsIndex({ paymentMethods }: Props) {
    usePolling(['paymentMethods'], 120_000);

    const isWide = useMediaQuery('(min-width: 768px)');
    const onBrand = useOnBrandColor();
    const [items, setItems] = useState<PaymentMethod[]>(paymentMethods);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [paymentMethodToDelete, setPaymentMethodToDelete] = useState<PaymentMethod | null>(null);

    const dragIndex = useRef<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const handleDelete = (paymentMethod: PaymentMethod) => {
        setPaymentMethodToDelete(paymentMethod);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (paymentMethodToDelete) {
            router.delete(`/payment-methods/${paymentMethodToDelete.id}`);
            setDeleteDialogOpen(false);
            setPaymentMethodToDelete(null);
        }
    };

    const toggleActive = (paymentMethod: PaymentMethod) => {
        setItems((prev) => prev.map((pm) => (pm.id === paymentMethod.id ? { ...pm, is_active: !pm.is_active } : pm)));
        router.patch(`/payment-methods/${paymentMethod.id}/toggle`, {}, { preserveScroll: true });
    };

    /** Moves one method to another position and tells the server the whole new order (0-based). */
    const moveTo = (from: number, to: number) => {
        if (from === to || to < 0 || to >= items.length) return;

        const reordered = [...items];
        const [moved] = reordered.splice(from, 1);
        reordered.splice(to, 0, moved);

        const withOrder = reordered.map((item, i) => ({ ...item, sort_order: i }));
        setItems(withOrder);

        router.post(
            route('payment-methods.reorder'),
            { order: withOrder.map(({ id, sort_order }) => ({ id, sort_order })) },
            { preserveScroll: true },
        );
    };

    const handleDragStart = (index: number) => {
        dragIndex.current = index;
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (dragIndex.current !== null && dragIndex.current !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        const from = dragIndex.current;
        dragIndex.current = null;
        setDragOverIndex(null);
        if (from === null) return;
        moveTo(from, dropIndex);
    };

    const handleDragEnd = () => {
        dragIndex.current = null;
        setDragOverIndex(null);
    };

    const iconButton =
        'flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Métodos de Pago" />

            <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Métodos de Pago</h1>
                        <p className="text-sm text-muted-foreground">Con qué te pagan tus clientes y en qué orden aparecen en el POS</p>
                    </div>
                    <Link
                        href="/payment-methods/create"
                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-semibold transition-opacity hover:opacity-90 sm:h-10"
                        style={{ color: onBrand.hex }}
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        Nuevo Método de Pago
                    </Link>
                </div>

                <section className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                    <div className="border-b border-border/60 p-4 sm:p-5">
                        <h2 className="text-base font-semibold">Gestionar Métodos de Pago</h2>
                        <p className="text-sm text-muted-foreground">
                            {isWide ? (
                                <>
                                    Arrastra <GripVertical className="inline size-3.5 align-middle text-muted-foreground/70" aria-hidden="true" />{' '}
                                    para cambiar el orden en el que aparecen en el POS
                                </>
                            ) : (
                                'Usa las flechas para cambiar el orden en el que aparecen en el POS'
                            )}
                        </p>
                    </div>

                    {items.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 px-4 py-14 text-center text-muted-foreground">
                            <Wallet className="size-10 opacity-30" aria-hidden="true" />
                            <p>No se encontraron métodos de pago</p>
                        </div>
                    ) : isWide ? (
                        <table className="w-full text-sm">
                            <caption className="sr-only">Métodos de pago</caption>
                            <thead>
                                <tr className="border-b border-border/60 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                    <th className="w-10 py-3 pl-5"></th>
                                    <th className="px-3 py-3">Nombre</th>
                                    <th className="px-3 py-3">Código</th>
                                    <th className="px-3 py-3">Descripción</th>
                                    <th className="px-3 py-3">Estado</th>
                                    <th className="py-3 pr-5 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((pm, index) => (
                                    <tr
                                        key={pm.id}
                                        draggable
                                        onDragStart={() => handleDragStart(index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDrop={(e) => handleDrop(e, index)}
                                        onDragEnd={handleDragEnd}
                                        className={cn(
                                            'border-b border-border/40 transition-colors last:border-0',
                                            dragOverIndex === index
                                                ? 'bg-muted outline-2 -outline-offset-2 outline-[var(--brand-primary)]/40'
                                                : 'hover:bg-muted/40',
                                        )}
                                    >
                                        <td className="py-3 pl-5">
                                            <GripVertical
                                                className="size-4 cursor-grab text-muted-foreground/50 active:cursor-grabbing"
                                                aria-hidden="true"
                                            />
                                        </td>
                                        <td className="px-3 py-3 font-medium">{pm.name}</td>
                                        <td className="px-3 py-3">
                                            <code className="rounded bg-muted px-2 py-1 text-xs">{pm.code}</code>
                                        </td>
                                        <td className="px-3 py-3 text-muted-foreground">{pm.description || '-'}</td>
                                        <td className="px-3 py-3">
                                            <Badge variant={pm.is_active ? 'default' : 'secondary'}>{pm.is_active ? 'Activo' : 'Inactivo'}</Badge>
                                        </td>
                                        <td className="py-3 pr-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    type="button"
                                                    className={iconButton}
                                                    onClick={() => toggleActive(pm)}
                                                    title={pm.is_active ? 'Desactivar' : 'Activar'}
                                                    aria-label={pm.is_active ? 'Desactivar' : 'Activar'}
                                                >
                                                    {pm.is_active ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                                </button>
                                                <Link
                                                    href={`/payment-methods/${pm.id}/edit`}
                                                    title="Editar"
                                                    aria-label="Editar"
                                                    className={iconButton}
                                                >
                                                    <Edit className="size-4" />
                                                </Link>
                                                <button
                                                    type="button"
                                                    className={cn(iconButton, 'hover:text-destructive')}
                                                    onClick={() => handleDelete(pm)}
                                                    title="Eliminar"
                                                    aria-label="Eliminar"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <ul className="divide-y divide-border/60">
                            {items.map((pm, index) => (
                                <li key={pm.id} className="flex flex-col gap-3 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-semibold">{pm.name}</p>
                                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{pm.code}</code>
                                            {pm.description && <p className="mt-1.5 text-sm text-muted-foreground">{pm.description}</p>}
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                                            <Badge variant={pm.is_active ? 'default' : 'secondary'}>{pm.is_active ? 'Activo' : 'Inactivo'}</Badge>
                                            <Switch
                                                checked={pm.is_active}
                                                onCheckedChange={() => toggleActive(pm)}
                                                aria-label={pm.is_active ? 'Desactivar' : 'Activar'}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-1">
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                className={cn(iconButton, 'size-11 border border-border/60')}
                                                onClick={() => moveTo(index, index - 1)}
                                                disabled={index === 0}
                                                aria-label={`Subir ${pm.name}`}
                                            >
                                                <ArrowUp className="size-4" />
                                            </button>
                                            <button
                                                type="button"
                                                className={cn(iconButton, 'size-11 border border-border/60')}
                                                onClick={() => moveTo(index, index + 1)}
                                                disabled={index === items.length - 1}
                                                aria-label={`Bajar ${pm.name}`}
                                            >
                                                <ArrowDown className="size-4" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Link
                                                href={`/payment-methods/${pm.id}/edit`}
                                                aria-label={`Editar ${pm.name}`}
                                                className={cn(iconButton, 'size-11 border border-border/60')}
                                            >
                                                <Edit className="size-4" />
                                            </Link>
                                            <button
                                                type="button"
                                                className={cn(iconButton, 'size-11 border border-border/60 hover:text-destructive')}
                                                onClick={() => handleDelete(pm)}
                                                aria-label={`Eliminar ${pm.name}`}
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Eliminación</DialogTitle>
                        <DialogDescription>
                            ¿Estás seguro de que quieres eliminar el método de pago "{paymentMethodToDelete?.name}"? Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete}>
                            Eliminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
