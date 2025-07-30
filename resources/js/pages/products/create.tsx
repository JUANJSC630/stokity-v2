import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem, type Category } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import * as Tooltip from '@radix-ui/react-tooltip';
import axios from 'axios';
import Cookies from 'js-cookie';
import { ArrowLeft, Save, Upload, UserCircle } from 'lucide-react';
import { useState } from 'react';

interface CreateProductProps {
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
        title: 'Crear Producto',
        href: '/products/create',
    },
];

export default function Create({ categories = [], branches = [], userBranchId = null }: CreateProductProps) {
    // Estado para la previsualización de la imagen
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Estado para el diálogo de error
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMsg, setDialogMsg] = useState('');

    // Obtener el valor del impuesto desde las cookies o usar 19 por defecto
    const defaultTax = (() => {
        const cookieValue = Cookies.get('stokity_product_tax');
        return cookieValue !== undefined ? Number(cookieValue) : 19;
    })();

    // Configurar formulario con Inertia
    const form = useForm<{
        name: string;
        code: string;
        description: string;
        purchase_price: number;
        sale_price: number;
        tax: number;
        stock: number;
        min_stock: number;
        category_id: string;
        branch_id: string;
        status: boolean;
        image: File | null;
    }>({
        name: '',
        code: '',
        description: '',
        purchase_price: 0,
        sale_price: 0,
        tax: defaultTax,
        stock: 0,
        min_stock: 5,
        category_id: userBranchId ? '' : '',
        branch_id: userBranchId ? userBranchId.toString() : '',
        status: true,
        image: null as File | null,
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

    // Generar código automáticamente usando axios
    const handleGenerateCode = async () => {
        if (!form.data.name) {
            setDialogMsg('Ingrese el nombre del producto primero');
            setDialogOpen(true);
            return;
        }
        form.setData('code', '');
        try {
            const response = await axios.post('/products/generate-code', {
                name: form.data.name,
            });
            form.setData('code', response.data.code);
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                setDialogMsg(error.response?.data?.error || 'No se pudo generar el código');
            } else {
                setDialogMsg('No se pudo generar el código');
            }
            setDialogOpen(true);
        }
    };

    // Función para cambiar el impuesto y guardar en cookies
    const handleTaxChange = (newTax: number) => {
        form.setData('tax', newTax);
        Cookies.set('stokity_product_tax', String(newTax), { expires: 365 });
    };

    // Manejar envío del formulario
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/products', {
            forceFormData: true,
            onSuccess: () => {
                // Redirigir automáticamente a la página de productos (esto lo maneja Inertia)
                // Se agregará un mensaje de éxito en el controlador
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Producto" />
            {/* Diálogo de error */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Error</DialogTitle>
                        <DialogDescription>{dialogMsg}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button onClick={() => setDialogOpen(false)} autoFocus>
                                Aceptar
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex h-full flex-1 flex-col gap-4 p-2 sm:p-4">
                {/* Header with back button */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
                    <Link href="/products">
                        <Button variant="ghost" size="sm" className="mr-0 flex items-center gap-1 sm:mr-4">
                            <ArrowLeft className="h-4 w-4" />
                            Volver
                        </Button>
                    </Link>
                    <h1 className="text-xl font-semibold sm:text-2xl">Crear Nuevo Producto</h1>
                </div>

                <Card className="border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                    <CardHeader>
                        <CardTitle>Información del Producto</CardTitle>
                        <CardDescription>
                            Complete la información necesaria para crear un nuevo producto. Todos los campos marcados con * son obligatorios.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Imagen */}
                            <div className="col-span-2 space-y-2">
                                <label htmlFor="image" className="text-sm font-medium">
                                    Imagen
                                </label>
                                <div className="flex flex-col items-center gap-4">
                                    <div
                                        className={`group relative aspect-square w-full max-w-xs overflow-hidden rounded-md border-2 sm:max-w-md ${
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

                                    <div className="flex w-full flex-col items-center justify-center gap-2 sm:flex-row">
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
                                    <p className="text-center text-xs text-muted-foreground">
                                        Formatos permitidos: JPG, PNG, GIF. Tamaño máximo: 2MB
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {/* Nombre del producto */}
                                <div className="space-y-2">
                                    <label htmlFor="name" className="text-sm font-medium">
                                        Nombre *
                                    </label>
                                    <Input
                                        id="name"
                                        placeholder="Nombre del producto"
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        required
                                        className="min-h-[42px] border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
                                    />
                                    {form.errors.name && <p className="text-xs text-destructive">{form.errors.name}</p>}
                                </div>

                                {/* Código del producto */}
                                <div className="space-y-2">
                                    <label htmlFor="code" className="text-sm font-medium">
                                        Código *
                                    </label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="code"
                                            placeholder="Código único del producto"
                                            value={form.data.code}
                                            onChange={(e) => form.setData('code', e.target.value)}
                                            required
                                            className="min-h-[42px] border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
                                        />
                                        <Button type="button" variant="outline" onClick={handleGenerateCode} className="w-full sm:w-auto">
                                            Generar código
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
                                                    style={{ wordBreak: 'break-word', whiteSpace: 'pre-line', fontSize: '0.95rem' }}
                                                >
                                                    <strong>¿Qué es el código del producto?</strong>
                                                    <br />
                                                    Puedes usar el botón "Generar código" para crear un código automático de 8 dígitos, o ingresar tu propio código personalizado (máximo 50 caracteres).
                                                    <br />
                                                    <strong>Ejemplos:</strong> <span className="font-mono">12345678</span>, <span className="font-mono">SKU-001</span>, <span className="font-mono">CAMISA-ROJA-M</span>
                                                    <Tooltip.Arrow className="fill-neutral-900" />
                                                </Tooltip.Content>
                                            </Tooltip.Portal>
                                        </Tooltip.Root>{' '}
                                        para identificar el producto.
                                    </p>
                                </div>

                                {/* Categoría */}
                                <div className="space-y-2">
                                    <label htmlFor="category_id" className="text-sm font-medium">
                                        Categoría *
                                    </label>
                                    <Select value={form.data.category_id.toString()} onValueChange={(value) => form.setData('category_id', value)}>
                                        <SelectTrigger
                                            id="category_id"
                                            className="min-h-[42px] border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
                                        >
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
                                <div className="space-y-2">
                                    <label htmlFor="branch_id" className="text-sm font-medium">
                                        Sucursal *
                                    </label>
                                    <Select value={form.data.branch_id.toString()} onValueChange={(value) => form.setData('branch_id', value)}>
                                        <SelectTrigger
                                            id="branch_id"
                                            className="min-h-[42px] border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
                                        >
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

                                {/* Precio de compra */}
                                <div className="space-y-2">
                                    <label htmlFor="purchase_price" className="text-sm font-medium">
                                        Precio de compra *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">$</span>
                                        <Input
                                            id="purchase_price"
                                            type="text"
                                            className="border-neutral-200 bg-white pl-6 text-neutral-900 placeholder-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
                                            value={
                                                typeof form.data.purchase_price === 'number'
                                                    ? Math.round(form.data.purchase_price).toLocaleString('es-CO')
                                                    : ''
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
                                <div className="space-y-2">
                                    <label htmlFor="sale_price" className="text-sm font-medium">
                                        Precio de venta *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">$</span>
                                        <Input
                                            id="sale_price"
                                            type="text"
                                            className="border-neutral-200 bg-white pl-6 text-neutral-900 placeholder-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
                                            value={
                                                typeof form.data.sale_price === 'number'
                                                    ? Math.round(form.data.sale_price).toLocaleString('es-CO')
                                                    : ''
                                            }
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '');
                                                form.setData('sale_price', value ? Number(value) : 0);
                                            }}
                                        />
                                    </div>
                                    {form.errors.sale_price && <p className="text-xs text-destructive">{form.errors.sale_price}</p>}
                                </div>

                                {/* Impuesto */}
                                <div className="space-y-2">
                                    <label htmlFor="tax" className="text-sm font-medium">
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
                                                className="border-neutral-200 bg-white pr-8 text-neutral-900 placeholder-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
                                                value={form.data.tax}
                                                onChange={(e) => form.setData('tax', Number(e.target.value))}
                                            />
                                            <span className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">%</span>
                                        </div>
                                        <button
                                            type="button"
                                            className={`rounded border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                                                form.data.tax === 19 
                                                    ? 'border-yellow-400 bg-yellow-200 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-200' 
                                                    : 'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                            }`}
                                            onClick={() => handleTaxChange(form.data.tax === 19 ? 0 : 19)}
                                            title={form.data.tax === 19 ? 'Poner IVA en 0%' : 'Poner IVA en 19%'}
                                        >
                                            {form.data.tax === 19 ? 'Sin IVA (0%)' : 'IVA 19%'}
                                        </button>
                                    </div>
                                    {form.errors.tax && <p className="text-xs text-destructive">{form.errors.tax}</p>}
                                    <p className="text-xs text-muted-foreground">
                                        Porcentaje de impuesto aplicado al producto (ej: 19 para IVA).
                                    </p>
                                </div>

                                {/* Stock actual */}
                                <div className="space-y-2">
                                    <label htmlFor="stock" className="text-sm font-medium">
                                        Stock actual *
                                    </label>
                                    <Input
                                        id="stock"
                                        type="number"
                                        step="1"
                                        min="0"
                                        value={form.data.stock}
                                        onChange={(e) => form.setData('stock', Number(e.target.value))}
                                        className="border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
                                    />
                                    {form.errors.stock && <p className="text-xs text-destructive">{form.errors.stock}</p>}
                                </div>

                                {/* Stock mínimo */}
                                <div className="space-y-2">
                                    <label htmlFor="min_stock" className="text-sm font-medium">
                                        Stock mínimo *
                                    </label>
                                    <Input
                                        id="min_stock"
                                        type="number"
                                        step="1"
                                        min="0"
                                        value={form.data.min_stock}
                                        onChange={(e) => form.setData('min_stock', Number(e.target.value))}
                                        className="border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
                                    />
                                    {form.errors.min_stock && <p className="text-xs text-destructive">{form.errors.min_stock}</p>}
                                    <p className="text-xs text-muted-foreground">
                                        Se mostrará alerta cuando el stock sea menor o igual a este valor.
                                    </p>
                                </div>

                                {/* Descripción */}
                                <div className="col-span-1 space-y-2 sm:col-span-2">
                                    <label htmlFor="description" className="text-sm font-medium">
                                        Descripción
                                    </label>
                                    <Textarea
                                        id="description"
                                        placeholder="Descripción detallada del producto"
                                        rows={5}
                                        value={form.data.description}
                                        onChange={(e) => form.setData('description', e.target.value)}
                                        className="border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
                                    />
                                    {form.errors.description && <p className="text-xs text-destructive">{form.errors.description}</p>}
                                </div>

                                {/* Estado */}
                                <div className="col-span-1 space-y-2 sm:col-span-2">
                                    <Label className="mb-3 block text-sm font-medium text-neutral-900 dark:text-neutral-100">Estado</Label>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="status"
                                            checked={!!form.data.status}
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

                            <div className="flex justify-end gap-2 pt-4">
                                <Link href="/products">
                                    <Button type="button" variant="outline" disabled={form.processing}>
                                        Cancelar
                                    </Button>
                                </Link>
                                <Button type="submit" className="gap-1" disabled={form.processing}>
                                    {form.processing ? (
                                        <>
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                                            <span className="ml-1">Guardando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />
                                            Guardar Producto
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
