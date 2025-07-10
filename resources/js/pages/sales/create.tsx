import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { User as BaseUser } from '@/types';
import { type BreadcrumbItem } from '@/types';
import type { Product } from '@/types/product';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import Cookies from 'js-cookie';
import { Plus, X } from 'lucide-react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';


interface Branch {
    id: number;
    name: string;
}

interface Client {
    id: number;
    name: string;
}

interface User extends BaseUser {
    branch_id?: number | null;
}

interface Props {
    branches: Branch[];
    clients: Client[];
    sellers: User[];
    products: Product[]; // <-- Agrega esto a tus props reales
}

// Utilidad para formatear a COP
function formatCOP(value: string | number) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(num);
}

export default function Create({ branches, clients, products = [] }: Props) {
    // Busca el id real del cliente Anónimo si existe, si no, usa el primero
    const anonymous = clients.find(c => c.name.toLowerCase() === 'anónimo');
    const anonymousClient = anonymous || clients[0];
    const clientsWithAnonymous = anonymous
        ? clients
        : [ { id: 0, name: 'Anónimo' }, ...clients ];

    const { auth } = usePage<{ auth: { user: User } }>().props;
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Ventas',
            href: '/sales',
        },
        {
            title: 'Nueva Venta',
            href: '/sales/create',
        },
    ];

    // Selecciona la sucursal por defecto según la asignada al usuario auth
    const defaultBranchId = auth.user.branch_id ? String(auth.user.branch_id) : (branches[0] ? String(branches[0].id) : '');

    // Usa el tipado correcto para products y valores string
    const form = useForm({
        branch_id: defaultBranchId,
        client_id: anonymousClient ? String(anonymousClient.id) : '',
        seller_id: String(auth.user.id),
        tax: '0',
        net: '0',
        total: '0',
        payment_method: 'cash',
        date: new Date().toISOString().slice(0, 16), // Formato: YYYY-MM-DDThh:mm
        status: 'completed',
        products: [] as { id: number; quantity: number; price: number; subtotal: number }[],
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (saleProducts.length === 0) {
            toast.error('Debes agregar al menos un producto a la venta.');
            return;
        }
        const data = {
            ...form.data,
            products: saleProducts.map((sp) => ({
                id: sp.product.id,
                quantity: sp.quantity,
                price: sp.product.sale_price,
                subtotal: sp.subtotal,
            })),
        };
        router.post(route('sales.store'), data, {
            onSuccess: () => {
                toast.success('Venta registrada correctamente');
            },
            onError: (errors) => {
                if (errors && typeof errors === 'object') {
                    Object.values(errors).forEach((msg) => {
                        if (msg) toast.error(String(msg));
                    });
                }
            },
        });
    }

    const [saleProducts, setSaleProducts] = useState<
        {
            product: Product;
            quantity: number;
            subtotal: number;
        }[]
    >([]);
    const [productQuantity, setProductQuantity] = useState<number>(1);
    const [productSearch, setProductSearch] = useState('');
    const [searching, setSearching] = useState(false);
    const searchTimeout = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (!productSearch || productSearch.trim().length < 2) {
            // Si el input está vacío o muy corto, no mostrar productos
            if (products.length > 0) {
                router.visit(route('sales.create'), {
                    method: 'get',
                    preserveState: true,
                    preserveScroll: true,
                    only: ['products'],
                });
            }
            return;
        }
        setSearching(true);
        searchTimeout.current = setTimeout(() => {
            router.visit(route('sales.create', { product_search: productSearch }), {
                method: 'get',
                preserveState: true,
                preserveScroll: true,
                only: ['products'],
                onFinish: () => setSearching(false),
            });
        }, 350);
        // eslint-disable-next-line
    }, [productSearch]);

    function handleAddProduct(prod: Product) {
        if (!prod) return;
        setSaleProducts((prev) => {
            const idx = prev.findIndex((sp) => sp.product.id === prod.id);
            if (idx !== -1) {
                const updated = [...prev];
                updated[idx].quantity += productQuantity;
                updated[idx].subtotal = updated[idx].quantity * prod.sale_price;
                // Mover el producto actualizado al inicio
                const [item] = updated.splice(idx, 1);
                return [item, ...updated];
            }
            // Agregar nuevo producto al inicio
            return [
                {
                    product: prod,
                    quantity: productQuantity,
                    subtotal: productQuantity * prod.sale_price,
                },
                ...prev,
            ];
        });
        setProductQuantity(1);
        // Enfocar el input de búsqueda después de agregar
        setTimeout(() => {
            productSearchRef.current?.focus();
        }, 0);
    }

    function handleRemoveProduct(id: number) {
        setSaleProducts((prev) => prev.filter((sp) => sp.product.id !== id));
    }

    function handleChangeQuantity(id: number, qty: number) {
        setSaleProducts((prev) => prev.map((sp) => (sp.product.id === id ? { ...sp, quantity: qty, subtotal: qty * sp.product.sale_price } : sp)));
    }

    const [taxPercent, setTaxPercentState] = useState<number>(() => {
        const cookieValue = Cookies.get('stokity_tax_percent');
        return cookieValue !== undefined ? Number(cookieValue) : 19;
    });

    function setTaxPercentAndCookie(value: number) {
        setTaxPercentState(value);
        Cookies.set('stokity_tax_percent', String(value), { expires: 365 });
    }

    function recalculateTotals() {
        const net = saleProducts.reduce((sum, sp) => sum + sp.subtotal, 0);
        const tax = net * (taxPercent / 100);
        form.setData('net', net.toFixed(2));
        form.setData('tax', tax.toFixed(2));
        form.setData('total', (net + tax).toFixed(2));
    }

    React.useEffect(() => {
        recalculateTotals();
        // eslint-disable-next-line
    }, [saleProducts, taxPercent]);

    // Referencia para el input de búsqueda de productos
    const productSearchRef = React.useRef<HTMLInputElement>(null);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nueva Venta" />
            <div className="flex flex-col gap-4 p-2 sm:p-4 md:flex-row md:h-[calc(100dvh-64px)] md:min-h-0">
                {/* Sección derecha: Productos disponibles */}
                <div className="order-1 flex flex-col md:order-2 md:w-[40%] w-full flex-shrink-0 md:min-h-0 md:h-full">
                    {/* Buscador arriba en móvil */}
                    <div className="mb-2 block md:hidden">
                        <Input
                            type="search"
                            placeholder="Buscar producto..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="mb-2"
                            ref={productSearchRef}
                        />
                        {searching && <div className="text-xs text-orange-500">Buscando...</div>}
                    </div>
                    <Card className="flex-1 border border-orange-200 bg-white dark:border-orange-700 dark:bg-neutral-900 overflow-hidden flex flex-col min-h-0">
                        <CardHeader>
                            <CardTitle>Productos</CardTitle>
                            <CardDescription>Busca y agrega productos a la venta</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            {/* Buscador solo visible en escritorio */}
                            <div className="mb-2 hidden md:block">
                                <Input
                                    type="search"
                                    placeholder="Buscar producto..."
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    className="mb-2"
                                    ref={productSearchRef}
                                />
                                {searching && <div className="text-xs text-orange-500">Buscando...</div>}
                            </div>
                            <div className="overflow-y-auto flex-1 min-h-0">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Imagen</th>
                                            <th>Nombre</th>
                                            <th>Stock</th>
                                            <th>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productSearch.trim().length >= 2 && products.length > 0 ? (
                                            products.map((p, idx) => (
                                                <tr key={p.id} className={idx % 2 === 0 ? 'bg-neutral-50 dark:bg-neutral-900/40' : ''}>
                                                    <td className="text-center font-mono text-xs text-neutral-500">{idx + 1}</td>
                                                    <td className="text-center">
                                                        {p.image_url && (
                                                            <img
                                                                src={p.image_url}
                                                                alt={p.name}
                                                                className="mx-auto h-8 w-8 rounded-full border border-neutral-200 object-cover shadow-sm"
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="font-medium text-neutral-800 dark:text-neutral-100">{p.name}</td>
                                                    <td className="text-center">
                                                        <span
                                                            className={`inline-block rounded px-2 py-1 text-xs font-semibold ${p.stock <= 0 ? 'bg-red-200 text-red-800' : 'bg-green-100 text-green-800'}`}
                                                        >
                                                            {p.stock}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="ghost"
                                                            disabled={p.stock <= 0 || !!saleProducts.find((sp) => sp.product.id === p.id)}
                                                            onClick={() => {
                                                                handleAddProduct(p);
                                                                setProductSearch('');
                                                            }}
                                                            className={`transition-colors hover:bg-green-100 dark:hover:bg-green-900/30 ${p.stock > 0 && !saleProducts.find((sp) => sp.product.id === p.id) ? 'text-green-600' : 'text-neutral-400'}`}
                                                            title="Agregar"
                                                        >
                                                            <Plus className="h-5 w-5" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : productSearch.trim().length >= 2 && products.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="text-center text-neutral-400">
                                                    No se encontraron productos
                                                </td>
                                            </tr>
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="text-center text-neutral-400">
                                                    Escribe para buscar productos
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                {/* Sección izquierda: Venta/factura */}
                <div className="order-2 flex-1 md:order-1 flex flex-col md:min-h-0 md:h-full md:w-[60%]">
                    <Card className="border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 flex-1 flex flex-col overflow-hidden min-h-0">
                        <CardHeader>
                            <CardTitle>Información de la Venta</CardTitle>
                            <CardDescription>Complete los detalles de la venta. Todos los campos marcados con * son obligatorios.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            <form onSubmit={handleSubmit} className="space-y-6 flex flex-col h-full min-h-0">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-2 hidden">
                                        <Label htmlFor="branch_id">
                                            Sucursal <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={form.data.branch_id}
                                            onValueChange={(value) => form.setData('branch_id', value)}
                                        >
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
                                        <Select value={form.data.client_id || ''} onValueChange={(value) => form.setData('client_id', value)}>
                                            <SelectTrigger className="w-full bg-white text-black dark:bg-neutral-800 dark:text-neutral-100">
                                                <SelectValue placeholder="Seleccione cliente" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {clientsWithAnonymous.map((client) => (
                                                    <SelectItem key={client.id} value={client.id.toString()}>
                                                        {client.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {form.errors.client_id && <p className="text-sm text-red-500">{form.errors.client_id}</p>}
                                    </div>

                                    {/* <div className="space-y-2">
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
                                    </div> */}

                                    <div className="space-y-2">
                                        <Label htmlFor="payment_method">
                                            Método de Pago <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={form.data.payment_method || ''}
                                            onValueChange={(value) => form.setData('payment_method', value)}
                                        >
                                            <SelectTrigger className="w-full bg-white text-black dark:bg-neutral-800 dark:text-neutral-100">
                                                <SelectValue placeholder="Seleccione método de pago" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cash">Efectivo</SelectItem>
                                                <SelectItem value="transfer">Transferencia</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {form.errors.payment_method && <p className="text-sm text-red-500">{form.errors.payment_method}</p>}
                                    </div>

                                    {/* <div className="space-y-2">
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
                                    </div> */}

                                    {/* <div className="space-y-2">
                                        <Label htmlFor="status">
                                            Estado <span className="text-red-500">*</span>
                                        </Label>
                                        <Select value={form.data.status || ''} onValueChange={(value) => form.setData('status', value)}>
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
                                    </div> */}
                                </div>

                                {/* Productos agregados a la venta */}
                                <div className="mt-4 space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                                    <Label>Productos en la venta</Label>
                                    {saleProducts.length > 0 ? (
                                        <>
                                            {/* Vista tabla en escritorio */}
                                            <div className="overflow-y-auto flex-1 min-h-0 hidden md:block">
                                                <table className="mt-2 w-full border-separate border-spacing-y-1 text-sm">
                                                    <thead>
                                                        <tr className="bg-neutral-50 dark:bg-neutral-800">
                                                            <th className="text-left font-semibold">Producto</th>
                                                            <th className="text-center font-semibold">Cantidad</th>
                                                            <th className="text-center font-semibold">Precio</th>
                                                            <th className="text-center font-semibold">Subtotal</th>
                                                            <th></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {saleProducts.map((sp) => (
                                                            <tr key={sp.product.id} className="rounded bg-white shadow-sm dark:bg-neutral-900">
                                                                <td className="px-2 py-1 text-left font-medium text-neutral-800 dark:text-neutral-100">
                                                                    {sp.product.name}
                                                                </td>
                                                                <td className="px-2 py-1 text-center align-middle">
                                                                    <div className="flex h-full items-center justify-center">
                                                                        <Input
                                                                            type="number"
                                                                            min={1}
                                                                            max={sp.product.stock}
                                                                            value={sp.quantity}
                                                                            onChange={(e) =>
                                                                                handleChangeQuantity(
                                                                                    sp.product.id,
                                                                                    Math.min(Number(e.target.value), sp.product.stock),
                                                                                )
                                                                            }
                                                                            className="m-0 h-7 w-14 border-0 bg-transparent p-0 text-center align-middle text-sm font-semibold shadow-none focus:border-0 focus:ring-0"
                                                                            style={{ verticalAlign: 'middle' }}
                                                                        />
                                                                    </div>
                                                                </td>
                                                                <td className="px-2 py-1 text-center font-semibold text-blue-900 dark:text-blue-200">
                                                                    {formatCOP(sp.product.sale_price)}
                                                                </td>
                                                                <td className="px-2 py-1 text-center font-semibold text-green-900 dark:text-green-200">
                                                                    {formatCOP(sp.subtotal)}
                                                                </td>
                                                                <td className="px-2 py-1 text-center">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleRemoveProduct(sp.product.id)}
                                                                        className="hover:bg-red-100 dark:hover:bg-red-900/30"
                                                                        title="Quitar producto"
                                                                    >
                                                                        <X className="h-4 w-4 text-red-500" />
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {/* Vista tarjetas en móvil */}
                                            <div className="flex flex-col gap-2 md:hidden">
                                                {saleProducts.map((sp) => (
                                                    <div key={sp.product.id} className="rounded bg-white shadow-sm dark:bg-neutral-900 p-3 flex flex-col gap-1 border border-neutral-100 dark:border-neutral-800">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-semibold text-neutral-800 dark:text-neutral-100">{sp.product.name}</span>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRemoveProduct(sp.product.id)}
                                                                className="hover:bg-red-100 dark:hover:bg-red-900/30"
                                                                title="Quitar producto"
                                                            >
                                                                <X className="h-4 w-4 text-red-500" />
                                                            </Button>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 text-xs mt-1">
                                                            <div>
                                                                <span className="font-medium text-neutral-500">Cantidad: </span>
                                                                <Input
                                                                    type="number"
                                                                    min={1}
                                                                    max={sp.product.stock}
                                                                    value={sp.quantity}
                                                                    onChange={(e) => handleChangeQuantity(sp.product.id, Math.min(Number(e.target.value), sp.product.stock))}
                                                                    className="inline-block w-14 h-7 text-center text-sm font-semibold border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-1 py-0"
                                                                    style={{ verticalAlign: 'middle' }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <span className="font-medium text-neutral-500">Precio: </span>
                                                                <span className="font-semibold text-blue-900 dark:text-blue-200">{formatCOP(sp.product.sale_price)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="font-medium text-neutral-500">Subtotal: </span>
                                                                <span className="font-semibold text-green-900 dark:text-green-200">{formatCOP(sp.subtotal)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-neutral-500">No hay productos agregados</div>
                                    )}
                                </div>

                                {/* Totales */}
                                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="taxPercent">Impuesto (%)</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                id="taxPercent"
                                                type="number"
                                                min={0}
                                                max={100}
                                                step={0.01}
                                                className="w-full border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200"
                                                value={taxPercent}
                                                onChange={(e) => setTaxPercentAndCookie(Number(e.target.value))}
                                                required
                                            />
                                            <button
                                                type="button"
                                                className={`rounded border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${taxPercent === 19 ? 'border-yellow-400 bg-yellow-200 text-yellow-900' : 'border-gray-300 bg-gray-100 text-gray-700'}`}
                                                onClick={() => setTaxPercentAndCookie(taxPercent === 19 ? 0 : 19)}
                                                title={taxPercent === 19 ? 'Poner IVA en 0%' : 'Poner IVA en 19%'}
                                            >
                                                {taxPercent === 19 ? 'Sin IVA (0%)' : 'IVA 19%'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="tax">Valor Impuesto</Label>
                                        <Input
                                            id="tax"
                                            type="text"
                                            value={formatCOP(form.data.tax || 0)}
                                            readOnly
                                            required
                                            className="border-yellow-200 bg-yellow-50 font-semibold text-yellow-900 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="net">
                                            Valor Neto <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="net"
                                            type="text"
                                            value={formatCOP(form.data.net || 0)}
                                            readOnly
                                            required
                                            className="border-blue-200 bg-blue-50 font-semibold text-blue-900 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                                        />
                                        {form.errors.net && <p className="text-sm text-red-500">{form.errors.net}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="total">
                                            Total <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="total"
                                            type="text"
                                            value={formatCOP(form.data.total || 0)}
                                            readOnly
                                            required
                                            className="border-green-200 bg-green-50 text-lg font-bold text-green-900 dark:border-green-700 dark:bg-green-900/30 dark:text-green-200"
                                        />
                                        {form.errors.total && <p className="text-sm text-red-500">{form.errors.total}</p>}
                                    </div>
                                </div>

                                {/* Botones */}
                                <div className="mt-4 flex flex-col justify-end gap-2 sm:flex-row sm:gap-0 sm:space-x-2">
                                    <Link href={route('sales.index')}>
                                        <Button variant="outline" type="button" className="w-full sm:w-auto">
                                            Cancelar
                                        </Button>
                                    </Link>
                                    <div className="w-full sm:w-auto" style={{ position: 'relative' }}>
                                        <Button
                                            type="submit"

                                            className="w-full gap-1 sm:w-auto"
                                            title={saleProducts.length === 0 ? 'Agrega al menos un producto para registrar la venta' : ''}
                                        >
                                            <span>Registrar Venta</span>
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
