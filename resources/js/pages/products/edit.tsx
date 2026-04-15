import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useScrollToError } from '@/hooks/use-scroll-to-error';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem, type Category, type Product, type Supplier, type SupplierProduct } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import * as Tooltip from '@radix-ui/react-tooltip';
import axios from 'axios';
import { AlertTriangle, ArrowLeft, Plus, Save, Sparkles, Trash2, Upload, UserCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SupplierLink {
    supplier_id: number;
    name: string;
    purchase_price: string;
    supplier_code: string;
    is_default: boolean;
}

interface EditProductProps {
    product: Product & { suppliers?: SupplierProduct[] };
    categories: Category[];
    branches: Branch[];
    suppliers?: Supplier[];
    userBranchId?: number | null;
}

export default function EditProduct({ product, categories = [], branches = [], suppliers = [], userBranchId = null }: EditProductProps) {
    const isService = product.type === 'servicio';

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Catálogo', href: '/products' },
        { title: isService ? 'Editar Servicio' : 'Editar Producto', href: `/products/${product.id}/edit` },
    ];

    const { flash } = usePage<{ flash: { error?: string } }>().props;

    const [imagePreview, setImagePreview] = useState<string | null>(product.image_url || null);
    const [isDragging, setIsDragging] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMsg, setDialogMsg] = useState('');

    useEffect(() => {
        if (flash?.error) setDeleteError(flash.error);
    }, [flash?.error]);

    const [supplierLinks, setSupplierLinks] = useState<SupplierLink[]>(
        (product.suppliers ?? []).map((s) => ({
            supplier_id: s.id,
            name: s.name,
            purchase_price: s.pivot.purchase_price != null ? String(s.pivot.purchase_price) : '',
            supplier_code: s.pivot.supplier_code ?? '',
            is_default: s.pivot.is_default,
        })),
    );
    const [supplierToAdd, setSupplierToAdd] = useState('');
    const [syncingSuppliers, setSyncingSuppliers] = useState(false);

    const addSupplierLink = () => {
        const id = Number(supplierToAdd);
        if (!id || supplierLinks.some((s) => s.supplier_id === id)) return;
        const sup = suppliers.find((s) => s.id === id);
        if (!sup) return;
        setSupplierLinks([...supplierLinks, { supplier_id: sup.id, name: sup.name, purchase_price: '', supplier_code: '', is_default: false }]);
        setSupplierToAdd('');
    };

    const removeSupplierLink = (id: number) => setSupplierLinks(supplierLinks.filter((s) => s.supplier_id !== id));
    const setDefault = (id: number) => setSupplierLinks(supplierLinks.map((s) => ({ ...s, is_default: s.supplier_id === id })));

    const handleSyncSuppliers = (e: React.FormEvent) => {
        e.preventDefault();
        setSyncingSuppliers(true);
        router.post(
            route('products.sync-suppliers', product.id),
            {
                suppliers: supplierLinks.map((s) => ({
                    supplier_id: s.supplier_id,
                    purchase_price: s.purchase_price !== '' ? s.purchase_price : null,
                    supplier_code: s.supplier_code || null,
                    is_default: s.is_default,
                })),
            },
            { onFinish: () => setSyncingSuppliers(false) },
        );
    };

    const form = useForm({
        name: product.name,
        code: product.code,
        description: product.description || '',
        purchase_price: Number(product.purchase_price),
        sale_price: Number(product.sale_price),
        tax: Number(product.tax || 19),
        min_stock: product.min_stock,
        category_id: product.category_id,
        branch_id: product.branch_id,
        status: product.status,
        type: product.type as 'producto' | 'servicio',
        variable_price: product.variable_price,
        image: null as File | null,
        _method: 'PUT',
    });

    useScrollToError(form.errors);

    const handleGenerateCode = async () => {
        if (!form.data.name) {
            setDialogMsg('Ingrese el nombre primero');
            setDialogOpen(true);
            return;
        }
        form.setData('code', '');
        try {
            const response = await axios.post('/products/generate-code', { name: form.data.name });
            form.setData('code', response.data.code);
        } catch (error) {
            setDialogMsg(axios.isAxiosError(error) ? error.response?.data?.error || 'No se pudo generar el código' : 'No se pudo generar el código');
            setDialogOpen(true);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        form.setData('image', file);
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(`/products/${product.id}`, { forceFormData: true });
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            form.setData('image', file);
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleDelete = () => {
        if (product.stock > 0) {
            setDeleteError(
                `Este producto tiene ${product.stock} unidades en inventario. Debes dar de baja el stock desde Movimientos de Stock antes de eliminarlo.`,
            );
            return;
        }
        router.delete(`/products/${product.id}`, {
            preserveState: true,
            onSuccess: () => {
                setShowDeleteModal(false);
                setDeleteError(null);
            },
        });
    };

    const handleCloseDeleteModal = () => {
        setShowDeleteModal(false);
        setDeleteError(null);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isService ? 'Editar Servicio' : 'Editar Producto'} />

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Error</DialogTitle>
                        <DialogDescription>{dialogMsg}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setDialogOpen(false)} autoFocus>
                            Aceptar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center">
                    <Link href="/products">
                        <Button variant="ghost" size="sm" className="mr-4 flex items-center gap-1">
                            <ArrowLeft className="h-4 w-4" />
                            Volver
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-semibold">{isService ? 'Editar Servicio' : 'Editar Producto'}</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{isService ? 'Información del Servicio' : 'Información del Producto'}</CardTitle>
                        <CardDescription>Actualiza los datos. Todos los campos marcados con * son obligatorios.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Imagen */}
                            <div className="space-y-2">
                                <label htmlFor="image" className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                    Imagen
                                </label>
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`group relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border-2 ${
                                            isDragging ? 'border-dashed border-primary' : 'border-sidebar-border'
                                        } bg-muted transition-all duration-200 hover:border-primary`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                    >
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Vista previa" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                                                <UserCircle className="size-8" strokeWidth={1.5} />
                                                <p className="text-center text-[10px]">Sin imagen</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label
                                            htmlFor="image"
                                            className="flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary/90 dark:text-black"
                                        >
                                            <Upload className="size-4" />
                                            Subir imagen
                                            <input id="image" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                                        </label>
                                        {form.errors.image && <p className="text-xs text-red-500">{form.errors.image}</p>}
                                        <p className="text-xs text-muted-foreground">JPG, PNG, GIF · máx 2MB</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                {/* Nombre */}
                                <div className="w-full space-y-2">
                                    <label htmlFor="name" className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                        Nombre *
                                    </label>
                                    <Input
                                        id="name"
                                        placeholder="Nombre"
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                    />
                                    {form.errors.name && <p className="text-xs text-destructive">{form.errors.name}</p>}
                                </div>

                                {/* Código */}
                                <div className="w-full space-y-2">
                                    <label htmlFor="code" className="text-sm font-medium">
                                        Código *
                                    </label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="code"
                                            placeholder="Código único"
                                            value={form.data.code}
                                            onChange={(e) => form.setData('code', e.target.value)}
                                        />
                                        <Button type="button" variant="secondary" size="icon" title="Generar código" onClick={handleGenerateCode}>
                                            <Sparkles className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {form.errors.code && <p className="text-xs text-destructive">{form.errors.code}</p>}
                                    <p className="text-xs text-muted-foreground">
                                        Código o{' '}
                                        <Tooltip.Root>
                                            <Tooltip.Trigger asChild>
                                                <span className="cursor-pointer font-semibold text-primary underline decoration-dotted">SKU</span>
                                            </Tooltip.Trigger>
                                            <Tooltip.Portal>
                                                <Tooltip.Content
                                                    side="top"
                                                    className="z-50 max-w-xs rounded bg-neutral-900 px-3 py-2 text-xs break-words whitespace-pre-line text-white shadow-lg sm:max-w-sm sm:text-sm"
                                                    sideOffset={6}
                                                >
                                                    <strong>¿Qué es el código?</strong>
                                                    <br />
                                                    Puedes usar el botón "Generar código" o ingresar uno personalizado (máx 50 caracteres).
                                                    <br />
                                                    <strong>Ejemplos:</strong> <span className="font-mono">12345678</span>,{' '}
                                                    <span className="font-mono">SKU-001</span>
                                                    <Tooltip.Arrow className="fill-neutral-900" />
                                                </Tooltip.Content>
                                            </Tooltip.Portal>
                                        </Tooltip.Root>{' '}
                                        para identificar el {isService ? 'servicio' : 'producto'}.
                                    </p>
                                </div>

                                {/* Precio de compra / Costo del servicio */}
                                <div className="w-full space-y-2">
                                    <label htmlFor="purchase_price" className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                        {isService ? 'Costo del servicio' : 'Precio de compra *'}
                                    </label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
                                            $
                                        </span>
                                        <CurrencyInput
                                            id="purchase_price"
                                            className="w-full pl-6"
                                            value={form.data.purchase_price}
                                            onChange={(v) => form.setData('purchase_price', v)}
                                        />
                                    </div>
                                    {form.errors.purchase_price && <p className="text-xs text-destructive">{form.errors.purchase_price}</p>}
                                </div>

                                {/* Precio de venta / Precio base */}
                                <div className="w-full space-y-2">
                                    <label htmlFor="sale_price" className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                        {isService ? 'Precio base *' : 'Precio de venta *'}
                                    </label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
                                            $
                                        </span>
                                        <CurrencyInput
                                            id="sale_price"
                                            className="w-full pl-6"
                                            value={form.data.sale_price}
                                            onChange={(v) => form.setData('sale_price', v)}
                                        />
                                    </div>
                                    {form.errors.sale_price && <p className="text-xs text-destructive">{form.errors.sale_price}</p>}
                                    {isService && (
                                        <p className="text-xs text-muted-foreground">
                                            {form.data.variable_price
                                                ? 'Referencia — el vendedor puede modificarlo en cada venta.'
                                                : 'Precio fijo aplicado en el POS.'}
                                        </p>
                                    )}
                                </div>

                                {/* Precio variable — solo servicios */}
                                {isService && (
                                    <div className="w-full space-y-2 md:col-span-2">
                                        <Label className="text-sm font-medium">Precio variable</Label>
                                        <div className="flex items-center gap-3">
                                            <Switch
                                                id="variable_price"
                                                checked={form.data.variable_price}
                                                onCheckedChange={(checked) => form.setData('variable_price', checked)}
                                            />
                                            <Label htmlFor="variable_price" className="font-normal">
                                                {form.data.variable_price
                                                    ? 'Activado — el vendedor ingresa el precio en cada venta'
                                                    : 'Desactivado — precio fijo'}
                                            </Label>
                                        </div>
                                    </div>
                                )}

                                {/* Impuesto */}
                                <div className="w-full space-y-2">
                                    <label htmlFor="tax" className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                        Impuesto (%) *
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                id="tax"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                className="w-full pr-8"
                                                value={form.data.tax}
                                                onChange={(e) => form.setData('tax', Number(e.target.value))}
                                            />
                                            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
                                                %
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            className={`rounded border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                                                form.data.tax === 19
                                                    ? 'border-yellow-400 bg-yellow-200 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-200'
                                                    : 'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                            }`}
                                            onClick={() => form.setData('tax', form.data.tax === 19 ? 0 : 19)}
                                        >
                                            {form.data.tax === 19 ? 'Sin IVA (0%)' : 'IVA 19%'}
                                        </button>
                                    </div>
                                    {form.errors.tax && <p className="text-xs text-destructive">{form.errors.tax}</p>}
                                    <p className="text-xs text-muted-foreground">Porcentaje de impuesto (ej: 19 para IVA).</p>
                                </div>

                                {/* Stock actual y mínimo — solo productos físicos */}
                                {!isService && (
                                    <>
                                        <div className="w-full space-y-2">
                                            <label className="text-sm font-medium">Stock actual</label>
                                            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                                                <span className="font-semibold">{product.stock}</span>
                                                <span className="text-muted-foreground">unidades</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                El stock se actualiza mediante{' '}
                                                <a href="/stock-movements/create" className="underline">
                                                    movimientos de stock
                                                </a>
                                                .
                                            </p>
                                        </div>

                                        <div className="w-full space-y-2">
                                            <label htmlFor="min_stock" className="text-sm font-medium">
                                                Stock mínimo *
                                            </label>
                                            <Input
                                                id="min_stock"
                                                type="number"
                                                min="0"
                                                step="1"
                                                className="w-full"
                                                value={form.data.min_stock}
                                                onChange={(e) => form.setData('min_stock', parseInt(e.target.value))}
                                            />
                                            {form.errors.min_stock && <p className="text-xs text-destructive">{form.errors.min_stock}</p>}
                                            <p className="text-xs text-muted-foreground">
                                                Se mostrará alerta cuando el stock sea menor o igual a este valor.
                                            </p>
                                        </div>
                                    </>
                                )}

                                {/* Categoría */}
                                <div className="w-full space-y-2">
                                    <label htmlFor="category_id" className="text-sm font-medium">
                                        Categoría *
                                    </label>
                                    <Select
                                        value={form.data.category_id.toString()}
                                        onValueChange={(value) => form.setData('category_id', parseInt(value))}
                                    >
                                        <SelectTrigger id="category_id">
                                            <SelectValue placeholder="Seleccionar categoría" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((category) => (
                                                <SelectItem key={category.id} value={category.id.toString()}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.errors.category_id && <p className="text-xs text-destructive">{form.errors.category_id}</p>}
                                </div>

                                {/* Sucursal */}
                                <div className="w-full space-y-2">
                                    <label htmlFor="branch_id" className="text-sm font-medium">
                                        Sucursal *
                                    </label>
                                    <Select
                                        value={form.data.branch_id.toString()}
                                        onValueChange={(value) => form.setData('branch_id', parseInt(value))}
                                        disabled={userBranchId !== null && !branches.some((b) => b.id === userBranchId)}
                                    >
                                        <SelectTrigger id="branch_id">
                                            <SelectValue placeholder="Seleccionar sucursal" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {branches.map((branch) => (
                                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                                    {branch.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.errors.branch_id && <p className="text-xs text-destructive">{form.errors.branch_id}</p>}
                                </div>

                                {/* Descripción */}
                                <div className="w-full space-y-2 md:col-span-2">
                                    <label htmlFor="description" className="text-sm font-medium">
                                        Descripción
                                    </label>
                                    <Textarea
                                        id="description"
                                        placeholder={isService ? 'Descripción detallada del servicio' : 'Descripción detallada del producto'}
                                        rows={5}
                                        value={form.data.description}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => form.setData('description', e.target.value)}
                                    />
                                    {form.errors.description && <p className="text-xs text-destructive">{form.errors.description}</p>}
                                </div>

                                {/* Estado */}
                                <div className="w-full space-y-2 md:col-span-2">
                                    <Label className="mb-3 block text-sm font-medium text-neutral-900 dark:text-neutral-100">Estado</Label>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="status"
                                            checked={form.data.status}
                                            onCheckedChange={(checked) => form.setData('status', checked)}
                                            disabled={form.processing}
                                        />
                                        <Label htmlFor="status" className="font-normal text-neutral-900 dark:text-neutral-100">
                                            {form.data.status ? 'Activo' : 'Inactivo'}
                                        </Label>
                                    </div>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        Los {isService ? 'servicios' : 'productos'} inactivos no se mostrarán en el sistema
                                    </p>
                                    {form.errors.status && <p className="text-xs text-destructive">{form.errors.status}</p>}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 pt-4 md:flex-row md:justify-end">
                                <Link href="/products">
                                    <Button type="button" variant="outline" className="w-full md:w-auto">
                                        Cancelar
                                    </Button>
                                </Link>
                                <Button type="button" variant="destructive" onClick={() => setShowDeleteModal(true)} className="w-full md:w-auto">
                                    Eliminar
                                </Button>
                                <Button type="submit" className="w-full gap-1 md:w-auto" disabled={form.processing}>
                                    <Save className="h-4 w-4" />
                                    Guardar Cambios
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Proveedores — solo productos físicos */}
                {!isService && suppliers.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Proveedores</CardTitle>
                            <CardDescription>
                                Vincula uno o más proveedores a este producto con precio acordado y código del catálogo.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSyncSuppliers} className="space-y-4">
                                {supplierLinks.length > 0 && (
                                    <div className="space-y-3">
                                        {supplierLinks.map((link) => (
                                            <div key={link.supplier_id} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
                                                <div className="min-w-[120px] flex-1 text-sm font-medium">{link.name}</div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs text-muted-foreground">$</span>
                                                    <CurrencyInput
                                                        placeholder="Precio"
                                                        className="h-8 w-28 text-sm"
                                                        value={link.purchase_price ? Number(link.purchase_price) : 0}
                                                        onChange={(v) =>
                                                            setSupplierLinks(
                                                                supplierLinks.map((s) =>
                                                                    s.supplier_id === link.supplier_id
                                                                        ? { ...s, purchase_price: v > 0 ? String(v) : '' }
                                                                        : s,
                                                                ),
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <Input
                                                    placeholder="Cód. proveedor"
                                                    className="h-8 w-32 text-sm"
                                                    value={link.supplier_code}
                                                    onChange={(e) =>
                                                        setSupplierLinks(
                                                            supplierLinks.map((s) =>
                                                                s.supplier_id === link.supplier_id ? { ...s, supplier_code: e.target.value } : s,
                                                            ),
                                                        )
                                                    }
                                                />
                                                <div className="flex items-center gap-1.5">
                                                    <Switch
                                                        checked={link.is_default}
                                                        onCheckedChange={() => setDefault(link.supplier_id)}
                                                        id={`default-${link.supplier_id}`}
                                                    />
                                                    <Label htmlFor={`default-${link.supplier_id}`} className="text-xs whitespace-nowrap">
                                                        Predeterminado
                                                    </Label>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={() => removeSupplierLink(link.supplier_id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <Select value={supplierToAdd} onValueChange={setSupplierToAdd}>
                                        <SelectTrigger className="h-8 flex-1 text-sm">
                                            <SelectValue placeholder="Agregar proveedor..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suppliers
                                                .filter((s) => !supplierLinks.some((l) => l.supplier_id === s.id))
                                                .map((s) => (
                                                    <SelectItem key={s.id} value={String(s.id)}>
                                                        {s.name}
                                                        {s.nit ? ` — ${s.nit}` : ''}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-8 gap-1"
                                        onClick={addSupplierLink}
                                        disabled={!supplierToAdd}
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Agregar
                                    </Button>
                                </div>

                                <div className="flex justify-end">
                                    <Button type="submit" size="sm" className="gap-1" disabled={syncingSuppliers}>
                                        <Save className="h-4 w-4" />
                                        {syncingSuppliers ? 'Guardando...' : 'Guardar proveedores'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                <Dialog open={showDeleteModal} onOpenChange={(open) => { if (!open) handleCloseDeleteModal(); }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>¿Eliminar {isService ? 'servicio' : 'producto'}?</DialogTitle>
                            <DialogDescription>
                                Esta acción enviará el {isService ? 'servicio' : 'producto'} a la papelera. ¿Deseas continuar?
                            </DialogDescription>
                        </DialogHeader>

                        {deleteError ? (
                            <div className="flex items-start gap-3 rounded-md bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-300">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                                <p className="text-sm">{deleteError}</p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 rounded-md bg-amber-50 p-3 text-amber-800">
                                <AlertTriangle className="h-5 w-5" />
                                <p className="text-sm">El {isService ? 'servicio' : 'producto'} será enviado a la papelera. Puedes restaurarlo más tarde.</p>
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={handleCloseDeleteModal}>
                                {deleteError ? 'Cerrar' : 'Cancelar'}
                            </Button>
                            {!deleteError && (
                                <Button variant="destructive" onClick={handleDelete} disabled={form.processing}>
                                    Eliminar
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
