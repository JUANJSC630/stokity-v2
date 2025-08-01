import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { router } from '@inertiajs/react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';

interface Product {
    id: number;
    name: string;
    quantity: number; // Vendida en la venta
    alreadyReturned: number; // Ya devuelta
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
                        // No cerrar automáticamente, dejar que el usuario vea el mensaje
                        // y cierre manualmente para ver los productos actualizados
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

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Registrar devolución</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-2 block font-medium">Productos a devolver</label>
                        <div className="space-y-2">
                            {formProducts.map((product) => {
                                const maxReturn = product.quantity - product.alreadyReturned;
                                return (
                                    <div key={product.id} className="flex items-center gap-2">
                                        <span className="flex-1">{product.name}</span>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={maxReturn}
                                            value={product.returnQuantity}
                                            onChange={(e) =>
                                                handleQuantityChange(product.id, Math.max(0, Math.min(Number(e.target.value), maxReturn)))
                                            }
                                            className="w-20"
                                            disabled={maxReturn === 0}
                                        />
                                        <span className="text-xs text-muted-foreground">Máx: {maxReturn}</span>
                                    </div>
                                );
                            })}
                        </div>
                        {formProducts.some((p) => p.quantity - p.alreadyReturned > 0) && (
                            <div className="flex justify-end gap-2">
                                {formProducts.some((p) => p.returnQuantity > 0) && (
                                    <Button type="button" variant="outline" size="sm" onClick={handleClearAll} disabled={loading}>
                                        Limpiar todo
                                    </Button>
                                )}
                                <Button type="button" variant="outline" size="sm" onClick={handleReturnAll} disabled={loading}>
                                    Devolver todo
                                </Button>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="mb-2 block font-medium">Motivo (opcional)</label>
                        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
                    </div>
                    {error && <div className="text-sm text-red-600">{error}</div>}
                    {success && <div className="text-sm text-green-600">{success}</div>}
                    <DialogFooter>
                        {success ? (
                            <Button type="button" variant="outline" onClick={handleClose}>
                                Cerrar
                            </Button>
                        ) : (
                            <>
                                <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={loading}>
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
