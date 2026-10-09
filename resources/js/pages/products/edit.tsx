import { StickyActions } from '@/components/admin/sticky-actions';
import { ImageField, MoneyField, NumberField, SwitchRow, TaxField } from '@/components/products/product-fields';
import { FormPanel, INPUT_CLASS, LabeledField, OptionSelect, Section } from '@/components/sales/form-fields';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { useScrollToError } from '@/hooks/use-scroll-to-error';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type Branch, type BreadcrumbItem, type Category, type Product, type Supplier, type SupplierProduct } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { AlertTriangle, ArrowLeft, Loader2, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
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
    const onBrand = useOnBrandColor();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inicio', href: '/dashboard' },
        { title: 'Catálogo', href: '/products' },
        { title: isService ? 'Editar Servicio' : 'Editar Producto', href: `/products/${product.id}/edit` },
    ];

    const { flash } = usePage<{ flash: { error?: string } }>().props;

    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMsg, setDialogMsg] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

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
    const updateSupplierLink = (id: number, changes: Partial<SupplierLink>) =>
        setSupplierLinks(supplierLinks.map((s) => (s.supplier_id === id ? { ...s, ...changes } : s)));

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
        min_stock: product.min_stock as number | '',
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(`/products/${product.id}`, { forceFormData: true });
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

    const noun = isService ? 'servicio' : 'producto';

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

            <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex items-start gap-3">
                    <Link
                        href="/products"
                        aria-label="Volver"
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{isService ? 'Editar Servicio' : 'Editar Producto'}</h1>
                        <p className="truncate text-sm text-muted-foreground">
                            {product.name} · <span className="font-mono">{product.code}</span>
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    <div className="contents lg:col-start-2 lg:row-span-5 lg:row-start-1 lg:flex lg:flex-col lg:gap-5">
                        <FormPanel title="Imagen">
                            <ImageField
                                initialPreview={product.image_url || null}
                                error={form.errors.image}
                                onChange={(file) => form.setData('image', file)}
                            />
                        </FormPanel>
                        <div className="order-last">
                            <FormPanel title="Estado">
                                <SwitchRow
                                    id="status"
                                    title="Visibilidad"
                                    checked={form.data.status}
                                    onCheckedChange={(checked) => form.setData('status', checked)}
                                    disabled={form.processing}
                                    label={form.data.status ? 'Activo' : 'Inactivo'}
                                    hint={`Los ${isService ? 'servicios' : 'productos'} inactivos no se mostrarán en el sistema.`}
                                    error={form.errors.status}
                                />
                            </FormPanel>
                        </div>
                    </div>

                    <div className="lg:col-start-1">
                        <FormPanel title="Información" description="Actualiza los datos. Los campos marcados con * son obligatorios.">
                            <LabeledField id="name" label="Nombre" required error={form.errors.name}>
                                <input
                                    id="name"
                                    placeholder="Nombre"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    className={INPUT_CLASS}
                                />
                            </LabeledField>

                            <LabeledField id="code" label="Código" required error={form.errors.code}>
                                <div className="flex gap-2">
                                    <input
                                        id="code"
                                        placeholder="Código único"
                                        value={form.data.code}
                                        onChange={(e) => form.setData('code', e.target.value)}
                                        className={INPUT_CLASS}
                                    />
                                    <Button
                                        aria-label="Generar código"
                                        type="button"
                                        variant="outline"
                                        title="Generar código"
                                        onClick={handleGenerateCode}
                                        className="size-11 shrink-0 sm:size-9"
                                    >
                                        <Sparkles className="size-4" aria-hidden="true" />
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">Código o SKU para identificar el {noun}. Máximo 50 caracteres.</p>
                            </LabeledField>

                            <LabeledField id="category_id" label="Categoría" required error={form.errors.category_id}>
                                <OptionSelect
                                    id="category_id"
                                    value={form.data.category_id.toString()}
                                    onValueChange={(value) => form.setData('category_id', parseInt(value))}
                                    options={categories}
                                    placeholder="Seleccionar categoría"
                                />
                            </LabeledField>

                            <LabeledField id="branch_id" label="Sucursal" required error={form.errors.branch_id}>
                                <OptionSelect
                                    id="branch_id"
                                    value={form.data.branch_id.toString()}
                                    onValueChange={(value) => form.setData('branch_id', parseInt(value))}
                                    options={branches}
                                    placeholder="Seleccionar sucursal"
                                    disabled={userBranchId !== null && !branches.some((b) => b.id === userBranchId)}
                                />
                            </LabeledField>

                            <LabeledField id="description" label="Descripción" error={form.errors.description} className="sm:col-span-2">
                                <Textarea
                                    id="description"
                                    placeholder={isService ? 'Descripción detallada del servicio' : 'Descripción detallada del producto'}
                                    rows={4}
                                    value={form.data.description}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => form.setData('description', e.target.value)}
                                    className="text-base sm:text-sm"
                                />
                            </LabeledField>
                        </FormPanel>
                    </div>

                    <div className="lg:col-start-1">
                        <FormPanel title="Precios">
                            <MoneyField
                                id="purchase_price"
                                label={isService ? 'Costo del servicio' : 'Precio de compra'}
                                required={!isService}
                                value={form.data.purchase_price}
                                error={form.errors.purchase_price}
                                hint="Lo que te cuesta comprar o producir el artículo."
                                onChange={(v) => form.setData('purchase_price', v)}
                            />
                            <MoneyField
                                id="sale_price"
                                label={isService ? 'Precio base' : 'Precio de venta'}
                                required
                                value={form.data.sale_price}
                                error={form.errors.sale_price}
                                hint={
                                    isService
                                        ? form.data.variable_price
                                            ? 'Referencia — el vendedor puede modificarlo en cada venta.'
                                            : 'Precio fijo aplicado en el POS.'
                                        : 'Precio al que se vende al cliente.'
                                }
                                onChange={(v) => form.setData('sale_price', v)}
                            />
                            <TaxField
                                value={form.data.tax}
                                error={form.errors.tax}
                                hint="Porcentaje de impuesto (ej: 19 para IVA)."
                                onInput={(value) => form.setData('tax', value)}
                                onToggle={() => form.setData('tax', form.data.tax === 19 ? 0 : 19)}
                            />
                            {isService && (
                                <SwitchRow
                                    id="variable_price"
                                    title="Precio variable"
                                    checked={form.data.variable_price}
                                    onCheckedChange={(checked) => form.setData('variable_price', checked)}
                                    label={
                                        form.data.variable_price
                                            ? 'Activado — el vendedor ingresa el precio en cada venta'
                                            : 'Desactivado — precio fijo'
                                    }
                                />
                            )}
                        </FormPanel>
                    </div>

                    {!isService && (
                        <div className="lg:col-start-1">
                            <FormPanel title="Inventario">
                                <div className="space-y-1.5">
                                    <p className="text-xs font-medium">Stock actual</p>
                                    <div className="flex h-11 items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 text-sm sm:h-9">
                                        <span className="font-semibold tabular-nums">{product.stock}</span>
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
                                <NumberField
                                    id="min_stock"
                                    label="Stock mínimo"
                                    required
                                    value={form.data.min_stock}
                                    error={form.errors.min_stock}
                                    hint="Se avisa de bajo stock cuando las unidades sean iguales o menores a este valor."
                                    onChange={(value) => form.setData('min_stock', value)}
                                />
                            </FormPanel>
                        </div>
                    )}

                    <div className="order-[10000] lg:col-span-2">
                        <StickyActions>
                            <Link href="/products">
                                <Button type="button" variant="outline" className="h-11 sm:h-10">
                                    Cancelar
                                </Button>
                            </Link>
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 sm:h-10"
                                style={{ color: onBrand.hex }}
                            >
                                {form.processing ? (
                                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                ) : (
                                    <Save className="size-4" aria-hidden="true" />
                                )}
                                Guardar Cambios
                            </button>
                        </StickyActions>
                    </div>
                </form>

                {/* Proveedores — solo productos físicos */}
                {!isService && suppliers.length > 0 && (
                    <Section
                        title="Proveedores"
                        description="Vincula uno o más proveedores a este producto con precio acordado y código del catálogo."
                    >
                        <form onSubmit={handleSyncSuppliers} className="flex flex-col gap-4 px-5 pb-5">
                            {supplierLinks.length > 0 && (
                                <ul className="flex flex-col gap-3">
                                    {supplierLinks.map((link) => (
                                        <li key={link.supplier_id} className="flex flex-col gap-3 rounded-xl border border-border/60 p-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="min-w-0 truncate text-sm font-semibold">{link.name}</span>
                                                <Button
                                                    aria-label={`Quitar proveedor ${link.name}`}
                                                    type="button"
                                                    variant="ghost"
                                                    className="size-11 shrink-0 text-destructive hover:text-destructive sm:size-9"
                                                    onClick={() => removeSupplierLink(link.supplier_id)}
                                                >
                                                    <Trash2 className="size-4" aria-hidden="true" />
                                                </Button>
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-3">
                                                <div className="relative">
                                                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
                                                        $
                                                    </span>
                                                    <CurrencyInput
                                                        placeholder="Precio"
                                                        className={cn(INPUT_CLASS, 'pl-7')}
                                                        value={link.purchase_price ? Number(link.purchase_price) : 0}
                                                        onChange={(v) =>
                                                            updateSupplierLink(link.supplier_id, { purchase_price: v > 0 ? String(v) : '' })
                                                        }
                                                    />
                                                </div>
                                                <input
                                                    placeholder="Cód. proveedor"
                                                    className={INPUT_CLASS}
                                                    value={link.supplier_code}
                                                    onChange={(e) => updateSupplierLink(link.supplier_id, { supplier_code: e.target.value })}
                                                />
                                                <div className="flex min-h-11 items-center gap-2.5 rounded-lg border border-border/60 px-3 sm:min-h-9">
                                                    <Switch
                                                        checked={link.is_default}
                                                        onCheckedChange={() => setDefault(link.supplier_id)}
                                                        id={`default-${link.supplier_id}`}
                                                    />
                                                    <label htmlFor={`default-${link.supplier_id}`} className="text-sm whitespace-nowrap">
                                                        Predeterminado
                                                    </label>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <div className="flex items-center gap-2">
                                <div className="min-w-0 flex-1">
                                    <Select value={supplierToAdd} onValueChange={setSupplierToAdd}>
                                        <SelectTrigger className="h-11 w-full bg-white text-base text-black sm:h-9 sm:text-sm dark:bg-neutral-800 dark:text-neutral-100">
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
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11 shrink-0 gap-1.5 sm:h-9"
                                    onClick={addSupplierLink}
                                    disabled={!supplierToAdd}
                                >
                                    <Plus className="size-4" aria-hidden="true" />
                                    Agregar
                                </Button>
                            </div>

                            <div className="flex justify-end">
                                <Button type="submit" className="h-11 gap-2 sm:h-10" disabled={syncingSuppliers}>
                                    <Save className="size-4" aria-hidden="true" />
                                    {syncingSuppliers ? 'Guardando...' : 'Guardar proveedores'}
                                </Button>
                            </div>
                        </form>
                    </Section>
                )}

                <Section title="Zona de peligro" description={`El ${noun} se envía a la papelera y puedes restaurarlo más tarde.`}>
                    <div className="px-5 pb-5">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowDeleteModal(true)}
                            className="h-11 w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 sm:h-10 sm:w-auto dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                            <Trash2 className="size-4" aria-hidden="true" />
                            Eliminar
                        </Button>
                    </div>
                </Section>

                <Dialog
                    open={showDeleteModal}
                    onOpenChange={(open) => {
                        if (!open) handleCloseDeleteModal();
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>¿Eliminar {noun}?</DialogTitle>
                            <DialogDescription>Esta acción enviará el {noun} a la papelera. ¿Deseas continuar?</DialogDescription>
                        </DialogHeader>

                        {deleteError ? (
                            <div className="flex items-start gap-3 rounded-md bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-300">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                                <p className="text-sm">{deleteError}</p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 rounded-md bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                                <AlertTriangle className="h-5 w-5" />
                                <p className="text-sm">El {noun} será enviado a la papelera. Puedes restaurarlo más tarde.</p>
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
