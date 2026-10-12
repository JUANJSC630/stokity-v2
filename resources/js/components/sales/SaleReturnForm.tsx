import { Badge } from '@/components/ui/badge';
import { DragStepper } from '@/components/ui/bencho/drag-stepper';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { router } from '@inertiajs/react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';

interface Product {
    id: number;
    name: string;
    quantity: number; // Vendida en la venta
    alreadyReturned: number; // Ya devuelta
    isService?: boolean; // Servicio — no afecta stock
}

interface SaleReturnFormProps {
    saleId: number;
    products: Product[];
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function SaleReturnForm({ saleId, products, open, onClose, onSuccess }: SaleReturnFormProps) {
    const [formProducts, setFormProducts] = useState(products.map((p) => ({ ...p, returnQuantity: 0 })));
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Actualizar formProducts cuando cambien los productos o cuando se abra el modal
    React.useEffect(() => {
        if (open) {
            setFormProducts(products.map((p) => ({ ...p, returnQuantity: 0 })));
            setReason('');
            setError(null);
            setSuccess(null);
        }
    }, [products, open]);

    const handleQuantityChange = (id: number, value: number) => {
        setFormProducts(formProducts.map((p) => (p.id === id ? { ...p, returnQuantity: value } : p)));
    };

    const handleReturnAll = () => {
        setFormProducts(
            formProducts.map((p) => ({
                ...p,
                returnQuantity: p.quantity - p.alreadyReturned,
            })),
        );
        toast.success('Todos los productos han sido seleccionados para devolución');
    };

    const handleClearAll = () => {
        setFormProducts(
            formProducts.map((p) => ({
                ...p,
                returnQuantity: 0,
            })),
        );
        toast.success('Todas las cantidades han sido limpiadas');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        const selected = formProducts.filter((p) => p.returnQuantity > 0);
        if (selected.length === 0) {
            setError('Selecciona al menos un producto y cantidad a devolver.');
            setLoading(false);
            return;
        }
        try {
            await router.post(
                `/sales/${saleId}/returns`,
                {
                    products: selected.map((p) => ({ product_id: p.id, quantity: p.returnQuantity })),
                    reason,
                },
                {
                    onSuccess: () => {
                        setSuccess('Devolución registrada correctamente.');
                        toast.success('Devolución registrada correctamente.');
                        setLoading(false);
                        if (onSuccess) onSuccess();
                        // Auto-cerrar tras 2 segundos para que el usuario vea la confirmación
                        setTimeout(() => onClose(), 2000);
                    },
                    onError: (errors: unknown) => {
                        setError('Error al registrar la devolución.');
                        toast.error('Error al registrar la devolución.');
                        console.error(errors);
                        setLoading(false);
                    },
                    preserveScroll: true,
                },
            );
        } catch (err: unknown) {
            setError('Error inesperado.');
            setLoading(false);
            console.error(err);
        }
    };

    const handleClose = () => {
        // Limpiar el estado cuando se cierre el modal
        setReason('');
        setError(null);
        setSuccess(null);
        setFormProducts(products.map((p) => ({ ...p, returnQuantity: 0 })));
        onClose();
    };

    const canReturnSomething = formProducts.some((p) => p.quantity - p.alreadyReturned > 0);

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-h-[90svh] gap-4 overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Registrar devolución</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium">Productos a devolver</label>
                        <ul className="space-y-2">
                            {formProducts.map((product) => {
                                const maxReturn = product.quantity - product.alreadyReturned;
                                return (
                                    <li key={product.id} className="flex flex-col gap-2 rounded-xl border border-border/60 p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="min-w-0 flex-1 text-sm font-medium">
                                                {product.name}
                                                {product.isService && (
                                                    <Badge variant="secondary" className="ml-2 text-xs">
                                                        Servicio
                                                    </Badge>
                                                )}
                                            </span>
                                            <span className="shrink-0 text-xs text-muted-foreground">Máx: {maxReturn}</span>
                                        </div>
                                        {maxReturn > 0 ? (
                                            <DragStepper
                                                value={product.returnQuantity}
                                                onChange={(value) => handleQuantityChange(product.id, value)}
                                                min={0}
                                                max={maxReturn}
                                                sweepRange={Math.max(maxReturn, 1)}
                                                label={`Cantidad a devolver de ${product.name}`}
                                            />
                                        ) : (
                                            <p className="text-xs text-muted-foreground">Ya se devolvió por completo.</p>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                        {canReturnSomething && (
                            <div className="mt-3 flex flex-wrap justify-end gap-2">
                                {formProducts.some((p) => p.returnQuantity > 0) && (
                                    <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={handleClearAll} disabled={loading}>
                                        Limpiar todo
                                    </Button>
                                )}
                                <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={handleReturnAll} disabled={loading}>
                                    Devolver todo
                                </Button>
                            </div>
                        )}
                    </div>
                    <div>
                        <label htmlFor="return-reason" className="mb-2 block text-sm font-medium">
                            Motivo (opcional)
                        </label>
                        <Textarea
                            id="return-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={2}
                            className="text-base sm:text-sm"
                        />
                    </div>
                    {error && (
                        <div role="alert" className="text-sm text-red-600">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div role="status" className="text-sm text-green-600">
                            {success}
                        </div>
                    )}
                    <DialogFooter className="gap-2 sm:gap-2">
                        {success ? (
                            <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={handleClose}>
                                Cerrar
                            </Button>
                        ) : (
                            <>
                                <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={handleClose} disabled={loading}>
                                    Cancelar
                                </Button>
                                <Button type="submit" className="h-11 sm:h-9" disabled={loading}>
                                    Registrar devolución
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
