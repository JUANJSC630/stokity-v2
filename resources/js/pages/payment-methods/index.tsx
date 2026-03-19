import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type PaymentMethod } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Edit, Eye, EyeOff, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

interface Props {
    paymentMethods: PaymentMethod[];
}

export default function PaymentMethodsIndex({ paymentMethods }: Props) {
    const [items, setItems] = useState<PaymentMethod[]>(paymentMethods);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [paymentMethodToDelete, setPaymentMethodToDelete] = useState<PaymentMethod | null>(null);

    // Drag state
    const dragIndex = useRef<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const breadcrumbs = [
        { title: 'Inicio', href: '/dashboard' },
        { title: 'Métodos de Pago', href: '/payment-methods' },
    ];

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

    // ── Drag & Drop ──────────────────────────────────────────────────────────

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
        if (from === null || from === dropIndex) return;

        const reordered = [...items];
        const [moved] = reordered.splice(from, 1);
        reordered.splice(dropIndex, 0, moved);

        // Assign new sort_order values 0-based
        const withOrder = reordered.map((item, i) => ({ ...item, sort_order: i }));
        setItems(withOrder);

        router.post(
            route('payment-methods.reorder'),
            { order: withOrder.map(({ id, sort_order }) => ({ id, sort_order })) },
            { preserveScroll: true },
        );

        dragIndex.current = null;
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        dragIndex.current = null;
        setDragOverIndex(null);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Métodos de Pago" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
                    <h1 className="text-3xl font-bold">Métodos de Pago</h1>
                    <Link href="/payment-methods/create">
                        <Button className="flex items-center gap-1">
                            <Plus className="h-4 w-4" />
                            Nuevo Método de Pago
                        </Button>
                    </Link>
                </div>

                <div className="relative overflow-hidden rounded-md bg-card shadow">
                    <div className="border-b p-4">
                        <h2 className="text-lg font-semibold">Gestionar Métodos de Pago</h2>
                        <p className="text-sm text-muted-foreground">
                            Arrastra{' '}
                            <GripVertical className="inline h-3.5 w-3.5 align-middle text-muted-foreground/70" />{' '}
                            para cambiar el orden en el que aparecen en el POS
                        </p>
                    </div>

                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto md:block">
                        {items.length === 0 ? (
                            <div className="p-6 text-center text-muted-foreground">No se encontraron métodos de pago</div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        <th className="px-4 py-3 w-10"></th>
                                        <th className="px-4 py-3">Nombre</th>
                                        <th className="px-4 py-3">Código</th>
                                        <th className="px-4 py-3">Descripción</th>
                                        <th className="px-4 py-3">Estado</th>
                                        <th className="px-4 py-3 text-right">Acciones</th>
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
                                            className={[
                                                'border-b transition-colors last:border-0',
                                                dragOverIndex === index
                                                    ? 'bg-primary/5 outline outline-2 -outline-offset-2 outline-primary/30'
                                                    : 'hover:bg-muted/30',
                                            ].join(' ')}
                                        >
                                            <td className="px-4 py-3">
                                                <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground/50 active:cursor-grabbing" />
                                            </td>
                                            <td className="px-4 py-3 font-medium">{pm.name}</td>
                                            <td className="px-4 py-3">
                                                <code className="rounded bg-muted px-2 py-1 text-xs">{pm.code}</code>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">{pm.description || '-'}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={pm.is_active ? 'default' : 'secondary'}>
                                                    {pm.is_active ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => toggleActive(pm)} title={pm.is_active ? 'Desactivar' : 'Activar'}>
                                                        {pm.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </Button>
                                                    <Link href={`/payment-methods/${pm.id}/edit`}>
                                                        <Button variant="ghost" size="sm" title="Editar">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(pm)} title="Eliminar">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Mobile cards */}
                    <div className="block md:hidden">
                        {items.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">No se encontraron métodos de pago</div>
                        ) : (
                            <div className="flex flex-col gap-3 p-3">
                                {items.map((pm, index) => (
                                    <div
                                        key={pm.id}
                                        draggable
                                        onDragStart={() => handleDragStart(index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDrop={(e) => handleDrop(e, index)}
                                        onDragEnd={handleDragEnd}
                                        className={[
                                            'rounded-lg border bg-card p-4 shadow-sm transition-colors',
                                            dragOverIndex === index ? 'border-primary/50 bg-primary/5' : '',
                                        ].join(' ')}
                                    >
                                        <div className="mb-2 flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-muted-foreground/50 active:cursor-grabbing" />
                                                <div>
                                                    <div className="font-semibold">{pm.name}</div>
                                                    <code className="rounded bg-muted px-1 text-xs">{pm.code}</code>
                                                </div>
                                            </div>
                                            <Badge variant={pm.is_active ? 'default' : 'secondary'} className="shrink-0">
                                                {pm.is_active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </div>

                                        {pm.description && (
                                            <p className="mb-2 text-sm text-muted-foreground">{pm.description}</p>
                                        )}

                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => toggleActive(pm)}>
                                                {pm.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                            <Link href={`/payment-methods/${pm.id}/edit`}>
                                                <Button variant="ghost" size="sm">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(pm)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
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
