import { CardCreateClient } from '@/components/clients';
import PaymentMethodSelect from '@/components/PaymentMethodSelect';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/format';
import { type Branch, type Client } from '@/types';
import { router } from '@inertiajs/react';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export interface WholesaleItemInput {
    description: string;
    quantity: number;
    unit_price: number;
}

export interface WholesaleFormValues {
    branch_id: string;
    client_id: string;
    payment_method: string;
    date: string;
    notes: string;
    estimated_cost: number;
    items: WholesaleItemInput[];
}

interface Props {
    clients: Client[];
    branches: Branch[];
    initialValues: WholesaleFormValues;
    submitUrl: string;
    submitMethod: 'post' | 'put';
    submitLabel: string;
    errors?: Record<string, string>;
}

const emptyItem: WholesaleItemInput = { description: '', quantity: 1, unit_price: 0 };

export default function WholesaleOrderForm({ clients, branches, initialValues, submitUrl, submitMethod, submitLabel, errors = {} }: Props) {
    const [values, setValues] = useState<WholesaleFormValues>(initialValues);
    const [showCreateClient, setShowCreateClient] = useState(false);
    const [processing, setProcessing] = useState(false);

    const total = values.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

    function updateItem(index: number, patch: Partial<WholesaleItemInput>) {
        setValues((prev) => ({
            ...prev,
            items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
        }));
    }

    function addItem() {
        setValues((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));
    }

    function removeItem(index: number) {
        setValues((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (values.items.length === 0 || values.items.some((item) => !item.description.trim() || item.quantity < 1)) {
            toast.error('Agrega al menos una línea con descripción y cantidad válidas.');
            return;
        }

        setProcessing(true);
        const payload = {
            branch_id: values.branch_id,
            client_id: values.client_id,
            payment_method: values.payment_method,
            date: values.date,
            notes: values.notes,
            estimated_cost: values.estimated_cost || null,
            items: values.items.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
            })),
        };
        router[submitMethod](submitUrl, payload, {
            onError: (formErrors) => {
                Object.values(formErrors).forEach((msg) => msg && toast.error(String(msg)));
            },
            onFinish: () => setProcessing(false),
        });
    }

    return (
        <>
            <Dialog open={showCreateClient} onOpenChange={setShowCreateClient}>
                <DialogContent className="max-w-lg md:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Crear Nuevo Cliente</DialogTitle>
                    </DialogHeader>
                    <CardCreateClient
                        variant="wholesale"
                        onSuccess={() => {
                            setShowCreateClient(false);
                            toast.success('Cliente creado correctamente');
                            router.reload({ only: ['clients'] });
                        }}
                        onCancel={() => setShowCreateClient(false)}
                    />
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle>Datos del pedido</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {branches.length > 1 && (
                                <div className="space-y-2">
                                    <Label htmlFor="branch_id">
                                        Sucursal <span className="text-red-500">*</span>
                                    </Label>
                                    <Select value={values.branch_id} onValueChange={(v) => setValues((prev) => ({ ...prev, branch_id: v }))}>
                                        <SelectTrigger id="branch_id" className="w-full">
                                            <SelectValue placeholder="Seleccione sucursal" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {branches.map((branch) => (
                                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                                    {branch.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.branch_id && <p className="text-sm text-red-500">{errors.branch_id}</p>}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="client_id">
                                    Cliente <span className="text-red-500">*</span>
                                </Label>
                                <div className="flex flex-row items-center gap-2">
                                    <div className="flex-1">
                                        <Select value={values.client_id} onValueChange={(v) => setValues((prev) => ({ ...prev, client_id: v }))}>
                                            <SelectTrigger id="client_id" className="w-full">
                                                <SelectValue placeholder="Seleccione cliente" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {clients.map((client) => (
                                                    <SelectItem key={client.id} value={client.id.toString()}>
                                                        {client.name}
                                                        {client.is_wholesale ? ' · Mayorista' : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button type="button" size="icon" variant="outline" onClick={() => setShowCreateClient(true)} title="Crear cliente">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                {errors.client_id && <p className="text-sm text-red-500">{errors.client_id}</p>}
                            </div>

                            <PaymentMethodSelect
                                value={values.payment_method || undefined}
                                onValueChange={(v) => setValues((prev) => ({ ...prev, payment_method: v }))}
                                error={errors.payment_method}
                                required
                            />

                            <div className="space-y-2">
                                <Label htmlFor="date">
                                    Fecha del pedido <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={values.date}
                                    onChange={(e) => setValues((prev) => ({ ...prev, date: e.target.value }))}
                                    required
                                />
                                {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
                            </div>
                        </div>

                        {/* Líneas del pedido */}
                        <div className="mt-2 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Artículos del pedido</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Una línea por cada tipo de artículo. Describe cualquier detalle personalizado (color, material, etc.) en la
                                        descripción.
                                    </p>
                                </div>
                                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                                    <Plus className="mr-1 h-4 w-4" />
                                    Agregar artículo
                                </Button>
                            </div>

                            {/* Encabezados de columna — solo en escritorio, donde las filas no repiten el label de cada campo */}
                            <div className="hidden gap-2 px-3 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[1fr_100px_140px_120px_auto]">
                                <span>Descripción del artículo</span>
                                <span>Cantidad</span>
                                <span>Precio unitario</span>
                                <span>Subtotal</span>
                                <span />
                            </div>

                            <div className="flex flex-col gap-2">
                                {values.items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="grid grid-cols-1 items-start gap-2 rounded-md border p-3 sm:grid-cols-[1fr_100px_140px_120px_auto]"
                                    >
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground sm:hidden">Descripción del artículo</Label>
                                            <Input
                                                placeholder="Ej: Manillas negras, pepas color verde a pedido"
                                                value={item.description}
                                                onChange={(e) => updateItem(index, { description: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground sm:hidden">Cantidad</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                placeholder="1"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, { quantity: Math.max(1, Number(e.target.value)) })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground sm:hidden">Precio unitario</Label>
                                            <CurrencyInput
                                                value={item.unit_price}
                                                onChange={(v) => updateItem(index, { unit_price: v })}
                                                placeholder="Precio por unidad"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground sm:hidden">Subtotal</Label>
                                            <div className="flex h-9 items-center text-sm font-semibold">
                                                {formatCurrency(item.quantity * item.unit_price)}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-end sm:pt-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                disabled={values.items.length === 1}
                                                onClick={() => removeItem(index)}
                                                title="Quitar este artículo"
                                            >
                                                <X className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end border-t pt-3">
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Total del pedido</p>
                                <p className="text-2xl font-bold">{formatCurrency(total)}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="estimated_cost">Costo de materiales (opcional)</Label>
                            <CurrencyInput
                                id="estimated_cost"
                                value={values.estimated_cost}
                                onChange={(v) => setValues((prev) => ({ ...prev, estimated_cost: v }))}
                                placeholder="0"
                            />
                            <p className="text-xs text-muted-foreground">
                                Lo que te costó hacer o comprar este pedido (opcional). Es solo para tu control interno — el cliente nunca lo ve.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notas (opcional)</Label>
                            <Textarea
                                id="notes"
                                placeholder="Ej: fecha de entrega acordada, instrucciones especiales del pedido..."
                                value={values.notes}
                                onChange={(e) => setValues((prev) => ({ ...prev, notes: e.target.value }))}
                                rows={2}
                                maxLength={500}
                                className="resize-none"
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button type="submit" disabled={processing}>
                                {submitLabel}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </>
    );
}
