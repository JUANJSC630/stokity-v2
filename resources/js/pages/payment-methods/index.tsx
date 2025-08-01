import { Table } from '@/components/common/Table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type PaymentMethod } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Edit, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
    paymentMethods: PaymentMethod[];
}

export default function PaymentMethodsIndex({ paymentMethods }: Props) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [paymentMethodToDelete, setPaymentMethodToDelete] = useState<PaymentMethod | null>(null);

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
        router.patch(`/payment-methods/${paymentMethod.id}/toggle`);
    };

    const moveUp = (paymentMethod: PaymentMethod) => {
        router.patch(`/payment-methods/${paymentMethod.id}`, {
            ...paymentMethod,
            sort_order: Math.max(0, paymentMethod.sort_order - 1),
        });
    };

    const moveDown = (paymentMethod: PaymentMethod) => {
        router.patch(`/payment-methods/${paymentMethod.id}`, {
            ...paymentMethod,
            sort_order: paymentMethod.sort_order + 1,
        });
    };

    const columns = [
        {
            key: 'sort_order' as keyof PaymentMethod,
            title: 'Orden',
            render: (value: unknown, row: PaymentMethod) => (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => moveUp(row)} disabled={row.sort_order === 0}>
                        <ArrowUp className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-medium">{row.sort_order}</span>
                    <Button variant="ghost" size="sm" onClick={() => moveDown(row)}>
                        <ArrowDown className="h-3 w-3" />
                    </Button>
                </div>
            ),
        },
        {
            key: 'name' as keyof PaymentMethod,
            title: 'Nombre',
            render: (value: unknown, row: PaymentMethod) => <div className="font-medium">{row.name}</div>,
        },
        {
            key: 'code' as keyof PaymentMethod,
            title: 'Código',
            render: (value: unknown, row: PaymentMethod) => <code className="rounded bg-muted px-2 py-1 text-sm">{row.code}</code>,
        },
        {
            key: 'description' as keyof PaymentMethod,
            title: 'Descripción',
            render: (value: unknown, row: PaymentMethod) => row.description || '-',
        },
        {
            key: 'is_active' as keyof PaymentMethod,
            title: 'Estado',
            render: (value: unknown, row: PaymentMethod) => (
                <Badge variant={row.is_active ? 'default' : 'secondary'}>{row.is_active ? 'Activo' : 'Inactivo'}</Badge>
            ),
        },
        {
            key: 'id' as keyof PaymentMethod,
            title: 'Acciones',
            render: (value: unknown, row: PaymentMethod) => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(row)}>
                        {row.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Link href={`/payment-methods/${row.id}/edit`}>
                        <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                        </Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(row)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

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
                        <p className="text-sm text-muted-foreground">Configura los métodos de pago disponibles en el sistema</p>
                    </div>

                    {/* Tabla solo visible en escritorio */}
                    <div className="hidden overflow-x-auto md:block">
                        <Table columns={columns} data={paymentMethods} />
                    </div>

                    {/* Tarjetas para móvil */}
                    <div className="block md:hidden">
                        {paymentMethods.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">No se encontraron métodos de pago</div>
                        ) : (
                            <div className="flex flex-col gap-4 p-2">
                                {paymentMethods.map((paymentMethod) => (
                                    <div key={paymentMethod.id} className="rounded-lg border bg-card p-4 shadow-sm">
                                        <div className="mb-2 flex items-center justify-between">
                                            <div className="text-base font-semibold">{paymentMethod.name}</div>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => toggleActive(paymentMethod)}>
                                                    {paymentMethod.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                                <Link href={`/payment-methods/${paymentMethod.id}/edit`}>
                                                    <Button variant="ghost" size="sm">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(paymentMethod)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-medium">Código:</span>{' '}
                                            <code className="rounded bg-muted px-1 text-xs">{paymentMethod.code}</code>
                                        </div>
                                        <div className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-medium">Descripción:</span> {paymentMethod.description || '-'}
                                        </div>
                                        <div className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-medium">Orden:</span> {paymentMethod.sort_order}
                                        </div>
                                        <div className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-medium">Estado:</span>
                                            <Badge variant={paymentMethod.is_active ? 'default' : 'secondary'} className="ml-1">
                                                {paymentMethod.is_active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </div>
                                        <div className="mt-2 flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => moveUp(paymentMethod)}
                                                disabled={paymentMethod.sort_order === 0}
                                            >
                                                <ArrowUp className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => moveDown(paymentMethod)}>
                                                <ArrowDown className="h-3 w-3" />
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
