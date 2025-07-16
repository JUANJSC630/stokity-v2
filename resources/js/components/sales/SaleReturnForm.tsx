import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { router } from '@inertiajs/react';
import { useState } from 'react';
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

    const handleQuantityChange = (id: number, value: number) => {
        setFormProducts(formProducts.map((p) => (p.id === id ? { ...p, returnQuantity: value } : p)));
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
                        formProducts.forEach((p) => (p.returnQuantity = 0)); // Reset form
                        onClose();
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

    return (
        <Dialog open={open} onOpenChange={onClose}>
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
                    </div>
                    <div>
                        <label className="mb-2 block font-medium">Motivo (opcional)</label>
                        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
                    </div>
                    {error && <div className="text-sm text-red-600">{error}</div>}
                    {success && <div className="text-sm text-green-600">{success}</div>}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            Registrar devolución
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
