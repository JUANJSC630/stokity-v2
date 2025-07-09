import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem, type Category, type Product } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { ArrowLeft, Save, Upload, UserCircle } from 'lucide-react';
import { useState } from 'react';

interface EditProductProps {
    product: Product;
    categories: Category[];
    branches: Branch[];
    userBranchId?: number | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Productos',
        href: '/products',
    },
    {
        title: 'Editar Producto',
        href: '#', // Will be replaced dynamically
    },
];

export default function EditProduct({ product, categories = [], branches = [], userBranchId = null }: EditProductProps) {
    // Actualizar la ruta en migas de pan
    breadcrumbs[1].href = `/products/${product.id}/edit`;

    // Estado para la previsualización de la imagen
    const [imagePreview, setImagePreview] = useState<string | null>(product.image_url || null);
    const [isDragging, setIsDragging] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Configurar formulario con Inertia
    const form = useForm({
        name: product.name,
        code: product.code,
        description: product.description || '',
        purchase_price: Number(product.purchase_price),
        sale_price: Number(product.sale_price),
        stock: product.stock,
        min_stock: product.min_stock,
        category_id: product.category_id,
        branch_id: product.branch_id,
        status: product.status,
        image: null as File | null,
        _method: 'PUT', // Para simular PUT request con FormData
    });

    // Manejar cambio de imagen
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        form.setData('image', file);

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Manejar envío del formulario
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(`/products/${product.id}`, {
            forceFormData: true,
            onSuccess: () => {
                // Redirigir automáticamente a la página de productos (esto lo maneja Inertia)
            },
        });
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
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Manejar eliminación del producto
    const handleDelete = () => {
        form.delete(`/products/${product.id}`, {
            onSuccess: () => setShowDeleteModal(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Producto" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header with back button */}
                <div className="flex items-center">
                    <Link href="/products">
                        <Button variant="ghost" size="sm" className="mr-4 flex items-center gap-1">
                            <ArrowLeft className="h-4 w-4" />
                            Volver
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-semibold">Editar Producto</h1>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Información del Producto</CardTitle>
                        <CardDescription>Actualiza los datos del producto. Todos los campos marcados con * son obligatorios.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Imagen */}
                            <div className="flex w-full flex-col items-center space-y-2">
                                <label htmlFor="image" className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                    Imagen
                                </label>
                                <div
                                    className={`group relative aspect-square w-full max-w-xs overflow-hidden rounded-md border-2 ${
                                        isDragging ? 'border-dashed border-primary' : 'border-sidebar-border'
                                    } bg-muted transition-all duration-200 hover:border-primary`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Vista previa" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-muted-foreground">
                                            <UserCircle className="size-12" strokeWidth={1.5} />
                                            <p className="text-center text-xs">Sin imagen</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <label
                                        htmlFor="image"
                                        className="flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary/90 dark:text-black"
                                    >
                                        <Upload className="size-4" />
                                        Subir imagen
                                        <input id="image" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                                    </label>
                                </div>
                                {form.errors.image && <p className="mt-1 text-xs text-red-500">{form.errors.image}</p>}
                                <p className="text-center text-xs text-muted-foreground">Formatos permitidos: JPG, PNG, GIF. Tamaño máximo: 2MB</p>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                {/* Nombre del producto */}
                                <div className="w-full space-y-2">
                                    <label htmlFor="name" className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                        Nombre *
                                    </label>
                                    <Input
                                        id="name"
                                        placeholder="Nombre del producto"
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                    />
                                    {form.errors.name && <p className="text-xs text-destructive">{form.errors.name}</p>}
                                </div>

                                {/* Código del producto */}
                                <div className="w-full space-y-2">
                                    <label htmlFor="code" className="text-sm font-medium">
                                        Código *
                                    </label>
                                    <Input
                                        id="code"
                                        placeholder="Código único del producto"
                                        value={form.data.code}
                                        onChange={(e) => form.setData('code', e.target.value)}
                                    />
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
                                                    style={{ wordBreak: 'break-word', whiteSpace: 'pre-line', fontSize: '0.95rem' }}
                                                >
                                                    <strong>¿Qué es el SKU?</strong>
                                                    <br />
                                                    El SKU (Stock Keeping Unit) es un código único para identificar productos en inventario.
                                                    <br />
                                                    <strong>Ejemplo:</strong> <span className="font-mono">CAMISA-ROJA-M</span>
                                                    <Tooltip.Arrow className="fill-neutral-900" />
                                                </Tooltip.Content>
                                            </Tooltip.Portal>
                                        </Tooltip.Root>{' '}
                                        para identificar el producto.
                                    </p>
                                </div>

                                {/* Precio de compra */}
                                <div className="w-full space-y-2">
                                    <label htmlFor="purchase_price" className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                        Precio de compra *
                                    </label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
                                            $
                                        </span>
                                        <Input
                                            id="purchase_price"
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            className="w-full pl-6"
                                            value={
                                                typeof form.data.purchase_price === 'number' && !isNaN(form.data.purchase_price)
                                                    ? Math.round(form.data.purchase_price).toLocaleString('es-CO')
                                                    : '0'
                                            }
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '');
                                                form.setData('purchase_price', value ? Number(value) : 0);
                                            }}
                                        />
                                    </div>
                                    {form.errors.purchase_price && <p className="text-xs text-destructive">{form.errors.purchase_price}</p>}
                                </div>

                                {/* Precio de venta */}
                                <div className="w-full space-y-2">
                                    <label htmlFor="sale_price" className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                        Precio de venta *
                                    </label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
                                            $
                                        </span>
                                        <Input
                                            id="sale_price"
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            className="w-full pl-6"
                                            value={
                                                typeof form.data.sale_price === 'number' && !isNaN(form.data.sale_price)
                                                    ? Math.round(form.data.sale_price).toLocaleString('es-CO')
                                                    : '0'
                                            }
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '');
                                                form.setData('sale_price', value ? Number(value) : 0);
                                            }}
                                        />
                                    </div>
                                    {form.errors.sale_price && <p className="text-xs text-destructive">{form.errors.sale_price}</p>}
                                </div>

                                {/* Stock actual */}
                                <div className="w-full space-y-2">
                                    <label htmlFor="stock" className="text-sm font-medium">
                                        Stock actual *
                                    </label>
                                    <Input
                                        id="stock"
                                        type="number"
                                        min="0"
                                        step="1"
                                        className="w-full"
                                        value={form.data.stock}
                                        onChange={(e) => form.setData('stock', parseInt(e.target.value))}
                                    />
                                    {form.errors.stock && <p className="text-xs text-destructive">{form.errors.stock}</p>}
                                </div>

                                {/* Stock mínimo */}
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
                                        placeholder="Descripción detallada del producto"
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
                                        Los productos inactivos no se mostrarán en el sistema
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
                {/* Modal de confirmación de eliminación */}
                <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>¿Eliminar producto?</DialogTitle>
                            <DialogDescription>Esta acción enviará el producto a la papelera. ¿Deseas continuar?</DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                                Cancelar
                            </Button>
                            <Button variant="destructive" onClick={handleDelete} disabled={form.processing}>
                                Eliminar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
