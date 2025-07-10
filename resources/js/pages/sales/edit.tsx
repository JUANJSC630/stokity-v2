import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Branch {
    id: number;
    name: string;
}

interface Client {
    id: number;
    name: string;
}

interface User {
    id: number;
    name: string;
}

interface Sale {
    id: number;
    branch_id: number;
    code: string;
    client_id: number;
    seller_id: number;
    tax: number;
    net: number;
    total: number;
    payment_method: string;
    date: string;
    status: string;
}

interface Props {
    sale: Sale;
    branches: Branch[];
    clients: Client[];
    sellers: User[];
}

// Utilidad para formatear a COP
function formatCOP(value: string | number) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(num);
}

// Utilidad para limpiar formato COP a número string
function unformatCOP(value: string) {
    return value
        .replace(/[^\d.,-]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
}

export default function Edit({ sale, branches, clients, sellers }: Props) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Ventas',
            href: '/sales',
        },
        {
            title: `Venta: ${sale.code}`,
            href: `/sales/${sale.id}`,
        },
        {
            title: 'Editar',
            href: `/sales/${sale.id}/edit`,
        },
    ];

    const form = useForm({
        branch_id: sale.branch_id.toString(),
        client_id: sale.client_id.toString(),
        seller_id: sale.seller_id.toString(),
        tax: sale.tax.toString(),
        net: sale.net.toString(),
        total: sale.total.toString(),
        payment_method: sale.payment_method,
        date: new Date(sale.date).toISOString().slice(0, 16), // Formato: YYYY-MM-DDThh:mm
        status: sale.status,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.put(route('sales.update', sale.id));
    }

    function handleDelete() {
        router.delete(route('sales.destroy', sale.id));
        setIsDeleteDialogOpen(false);
    }

    // Calcular total cuando cambia net o tax
    function calculateTotal(netValue: string, taxValue: string) {
        const net = parseFloat(netValue) || 0;
        const tax = parseFloat(taxValue) || 0;
        return (net + tax).toFixed(2);
    }

    // Actualizar total cuando cambia net o tax
    function updateTotal() {
        form.setData('total', calculateTotal(form.data.net, form.data.tax));
    }

    // Actualizar tax cuando cambia net (asumiendo impuesto del 19%)
    function updateTax(netValue: string) {
        const net = parseFloat(netValue) || 0;
        const tax = (net * 0.19).toFixed(2);
        form.setData('tax', tax);
        form.setData('total', calculateTotal(netValue, tax));
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar Venta: ${sale.code}`} />
            <div className="flex h-full flex-1 flex-col gap-4 p-2 sm:p-4">
                {/* Header with back button */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
                    <Link href={route('sales.index')}>
                        <Button variant="ghost" size="sm" className="mr-0 flex items-center gap-1 sm:mr-4">
                            <ArrowLeft className="h-4 w-4" />
                            Volver
                        </Button>
                    </Link>
                    <h1 className="text-xl font-semibold sm:text-2xl">Editar Venta: {sale.code}</h1>
                </div>

                <Card className="border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                    <CardHeader>
                        <CardTitle>Información de la Venta</CardTitle>
                        <CardDescription>Actualice los detalles de la venta. Todos los campos marcados con * son obligatorios.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="code">Código de Venta</Label>
                                    <Input
                                        id="code"
                                        type="text"
                                        className="bg-white text-black dark:bg-neutral-800 dark:text-neutral-100"
                                        value={sale.code}
                                        disabled
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="branch_id">
                                        Sucursal <span className="text-red-500">*</span>
                                    </Label>
                                    <Select value={form.data.branch_id} onValueChange={(value) => form.setData('branch_id', value)}>
                                        <SelectTrigger className="w-full bg-white text-black dark:bg-neutral-800 dark:text-neutral-100">
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
                                    {form.errors.branch_id && <p className="text-sm text-red-500">{form.errors.branch_id}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="client_id">
                                        Cliente <span className="text-red-500">*</span>
                                    </Label>
                                    <Select value={form.data.client_id} onValueChange={(value) => form.setData('client_id', value)}>
                                        <SelectTrigger className="w-full bg-white text-black dark:bg-neutral-800 dark:text-neutral-100">
                                            <SelectValue placeholder="Seleccione cliente" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clients.map((client) => (
                                                <SelectItem key={client.id} value={client.id.toString()}>
                                                    {client.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.errors.client_id && <p className="text-sm text-red-500">{form.errors.client_id}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="seller_id">
                                        Vendedor <span className="text-red-500">*</span>
                                    </Label>
                                    <Select value={form.data.seller_id} onValueChange={(value) => form.setData('seller_id', value)}>
                                        <SelectTrigger className="w-full bg-white text-black dark:bg-neutral-800 dark:text-neutral-100">
                                            <SelectValue placeholder="Seleccione vendedor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sellers.map((seller) => (
                                                <SelectItem key={seller.id} value={seller.id.toString()}>
                                                    {seller.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.errors.seller_id && <p className="text-sm text-red-500">{form.errors.seller_id}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="payment_method">
                                        Método de Pago <span className="text-red-500">*</span>
                                    </Label>
                                    <Select value={form.data.payment_method} onValueChange={(value) => form.setData('payment_method', value)}>
                                        <SelectTrigger className="w-full bg-white text-black dark:bg-neutral-800 dark:text-neutral-100">
                                            <SelectValue placeholder="Seleccione método de pago" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cash">Efectivo</SelectItem>
                                            <SelectItem value="credit_card">Tarjeta de crédito</SelectItem>
                                            <SelectItem value="debit_card">Tarjeta débito</SelectItem>
                                            <SelectItem value="transfer">Transferencia</SelectItem>
                                            <SelectItem value="other">Otro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {form.errors.payment_method && <p className="text-sm text-red-500">{form.errors.payment_method}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="date">
                                        Fecha y Hora <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="date"
                                        type="datetime-local"
                                        className="bg-white text-black dark:bg-neutral-800 dark:text-neutral-100"
                                        value={form.data.date}
                                        onChange={(e) => form.setData('date', e.target.value)}
                                        required
                                    />
                                    {form.errors.date && <p className="text-sm text-red-500">{form.errors.date}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="status">
                                        Estado <span className="text-red-500">*</span>
                                    </Label>
                                    <Select value={form.data.status} onValueChange={(value) => form.setData('status', value)}>
                                        <SelectTrigger className="w-full bg-white text-black dark:bg-neutral-800 dark:text-neutral-100">
                                            <SelectValue placeholder="Seleccione estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="completed">Completada</SelectItem>
                                            <SelectItem value="pending">Pendiente</SelectItem>
                                            <SelectItem value="cancelled">Cancelada</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {form.errors.status && <p className="text-sm text-red-500">{form.errors.status}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="net">
                                        Valor Neto <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="net"
                                        type="text"
                                        inputMode="decimal"
                                        className="bg-white text-black dark:bg-neutral-800 dark:text-neutral-100"
                                        value={formatCOP(form.data.net)}
                                        onChange={(e) => {
                                            const raw = unformatCOP(e.target.value);
                                            form.setData('net', raw);
                                            updateTax(raw);
                                        }}
                                        required
                                    />
                                    {form.errors.net && <p className="text-sm text-red-500">{form.errors.net}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="tax">
                                        Impuesto <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="tax"
                                        type="text"
                                        inputMode="decimal"
                                        className="bg-white text-black dark:bg-neutral-800 dark:text-neutral-100"
                                        value={formatCOP(form.data.tax)}
                                        onChange={(e) => {
                                            const raw = unformatCOP(e.target.value);
                                            form.setData('tax', raw);
                                            updateTotal();
                                        }}
                                        required
                                    />
                                    {form.errors.tax && <p className="text-sm text-red-500">{form.errors.tax}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="total">
                                        Total <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="total"
                                        type="text"
                                        className="bg-white text-black dark:bg-neutral-800 dark:text-neutral-100"
                                        value={formatCOP(form.data.total)}
                                        readOnly
                                        required
                                    />
                                    {form.errors.total && <p className="text-sm text-red-500">{form.errors.total}</p>}
                                </div>
                            </div>

                            <div className="mt-4 flex flex-col justify-end gap-2 sm:flex-row sm:gap-0 sm:space-x-2">
                                <Link href={route('sales.index')}>
                                    <Button variant="outline" type="button" className="w-full sm:w-auto">
                                        Cancelar
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={form.processing} className="w-full gap-1 sm:w-auto">
                                    <Save className="size-4" />
                                    <span>Actualizar Venta</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full gap-1 text-red-500 hover:text-red-600 sm:w-auto"
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                >
                                    <Trash2 className="size-4" />
                                    <span>Eliminar</span>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eliminar Venta</DialogTitle>
                        <DialogDescription>
                            ¿Estás seguro de que deseas eliminar la venta {sale.code}? Esta acción no se puede deshacer.
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
