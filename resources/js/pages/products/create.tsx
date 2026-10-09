import { StickyActions } from '@/components/admin/sticky-actions';
import { ImageField, MoneyField, NumberField, SwitchRow, TaxField, TypeSwitch } from '@/components/products/product-fields';
import { FormPanel, INPUT_CLASS, LabeledField, OptionSelect } from '@/components/sales/form-fields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { useScrollToError } from '@/hooks/use-scroll-to-error';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type Branch, type BreadcrumbItem, type Category } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { ArrowLeft, Loader2, Save, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface CreateProductProps {
    categories: Category[];
    branches: Branch[];
    userBranchId?: number | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Catálogo', href: '/products' },
    { title: 'Crear', href: '/products/create' },
];

export default function Create({ categories = [], branches = [], userBranchId = null }: CreateProductProps) {
    const onBrand = useOnBrandColor();

    // Rastrear si el usuario ingresó explícitamente el precio de venta
    const [salePriceTouched, setSalePriceTouched] = useState(false);

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
        type: 'producto' | 'servicio';
        variable_price: boolean;
        purchase_price: number;
        sale_price: number;
        tax: number;
        stock: number | '';
        min_stock: number | '';
        category_id: string;
        branch_id: string;
        status: boolean;
        image: File | null;
    }>({
        name: '',
        code: '',
        description: '',
        type: 'producto',
        variable_price: false,
        purchase_price: 0,
        sale_price: 0,
        tax: defaultTax,
        stock: '',
        min_stock: '',
        category_id: '',
        branch_id: userBranchId ? userBranchId.toString() : '',
        status: true,
        image: null as File | null,
    });

    useScrollToError(form.errors);

    const isService = form.data.type === 'servicio';

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
        if (!salePriceTouched) {
            form.setError('sale_price', 'El precio de venta es obligatorio.');
            return;
        }
        form.post('/products', {
            forceFormData: true,
            onSuccess: () => {},
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear" />
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
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{isService ? 'Crear Servicio' : 'Crear Producto'}</h1>
                        <p className="text-sm text-muted-foreground">Completa la información. Los campos marcados con * son obligatorios.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    <div className="contents lg:col-start-2 lg:row-span-5 lg:row-start-1 lg:flex lg:flex-col lg:gap-5">
                        <FormPanel title="Imagen">
                            <ImageField error={form.errors.image} onChange={(file) => form.setData('image', file)} />
                        </FormPanel>
                        <div className="order-last">
                            <FormPanel title="Estado">
                                <SwitchRow
                                    id="status"
                                    title="Visibilidad"
                                    checked={!!form.data.status}
                                    onCheckedChange={(checked) => form.setData('status', checked)}
                                    disabled={form.processing}
                                    label={form.data.status ? 'Activo' : 'Inactivo'}
                                    hint="Los productos inactivos no se mostrarán en el sistema."
                                    error={form.errors.status}
                                />
                            </FormPanel>
                        </div>
                    </div>
                    <div className="lg:col-start-1">
                        <FormPanel title="Tipo">
                            <TypeSwitch value={form.data.type} onChange={(type) => form.setData('type', type)} />
                            {isService && (
                                <p className="text-xs text-muted-foreground sm:col-span-2">
                                    Los servicios no tienen stock. Ideal para restauraciones, reparaciones o trabajos a pedido.
                                </p>
                            )}
                        </FormPanel>
                    </div>

                    <div className="lg:col-start-1">
                        <FormPanel title="Información">
                            <LabeledField id="name" label="Nombre" required error={form.errors.name}>
                                <input
                                    id="name"
                                    placeholder="Ej: Bolso de cuero café"
                                    value={form.data.name}
                                    onChange={(e) => {
                                        form.setData('name', e.target.value);
                                        form.clearErrors('name');
                                    }}
                                    required
                                    className={INPUT_CLASS}
                                />
                            </LabeledField>

                            <LabeledField id="code" label="Código" required error={form.errors.code}>
                                <div className="flex gap-2">
                                    <input
                                        id="code"
                                        placeholder="Ej: SKU-001 o usa 'Generar'"
                                        value={form.data.code}
                                        onChange={(e) => {
                                            form.setData('code', e.target.value);
                                            form.clearErrors('code');
                                        }}
                                        required
                                        className={INPUT_CLASS}
                                    />
                                    <Button type="button" variant="outline" onClick={handleGenerateCode} className="h-11 shrink-0 gap-1.5 sm:h-9">
                                        <Sparkles className="size-4" aria-hidden="true" />
                                        Generar código
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Usa «Generar código» para crear uno de 8 dígitos o escribe el tuyo (máximo 50 caracteres), por ejemplo SKU-001 o
                                    CAMISA-ROJA-M.
                                </p>
                            </LabeledField>

                            <LabeledField id="category_id" label="Categoría" required error={form.errors.category_id}>
                                <OptionSelect
                                    id="category_id"
                                    value={form.data.category_id.toString()}
                                    onValueChange={(value) => {
                                        form.setData('category_id', value);
                                        form.clearErrors('category_id');
                                    }}
                                    options={categories}
                                    placeholder="Seleccionar categoría"
                                />
                            </LabeledField>

                            <LabeledField id="branch_id" label="Sucursal" required error={form.errors.branch_id}>
                                <OptionSelect
                                    id="branch_id"
                                    value={form.data.branch_id.toString()}
                                    onValueChange={(value) => {
                                        form.setData('branch_id', value);
                                        form.clearErrors('branch_id');
                                    }}
                                    options={branches}
                                    placeholder="Seleccionar sucursal"
                                />
                            </LabeledField>

                            <LabeledField id="description" label="Descripción" error={form.errors.description} className="sm:col-span-2">
                                <Textarea
                                    id="description"
                                    placeholder="Ej: Bolso artesanal en cuero legítimo, cierre metálico, correa ajustable..."
                                    rows={4}
                                    value={form.data.description}
                                    onChange={(e) => {
                                        form.setData('description', e.target.value);
                                        form.clearErrors('description');
                                    }}
                                    className="text-base sm:text-sm"
                                />
                            </LabeledField>
                        </FormPanel>
                    </div>

                    <div className="lg:col-start-1">
                        <FormPanel title="Precios" description="El precio de venta es el que aparece en el POS y en las facturas.">
                            <MoneyField
                                id="purchase_price"
                                label={isService ? 'Costo del servicio' : 'Precio de compra'}
                                value={form.data.purchase_price}
                                error={form.errors.purchase_price}
                                hint="Lo que te cuesta comprar o producir el artículo. Se usa para calcular el margen de ganancia."
                                onChange={(v) => {
                                    form.setData('purchase_price', v);
                                    form.clearErrors('purchase_price');
                                }}
                            />
                            <MoneyField
                                id="sale_price"
                                label={isService ? 'Precio base' : 'Precio de venta'}
                                required
                                value={form.data.sale_price}
                                error={form.errors.sale_price}
                                hint="Precio al que se vende al cliente."
                                onChange={(v) => {
                                    form.setData('sale_price', v);
                                    form.clearErrors('sale_price');
                                    setSalePriceTouched(true);
                                }}
                            />
                            <TaxField
                                value={form.data.tax}
                                error={form.errors.tax}
                                hint="Porcentaje de impuesto aplicado al producto (ej: 19 para IVA)."
                                onInput={(value) => {
                                    form.setData('tax', value);
                                    form.clearErrors('tax');
                                }}
                                onToggle={() => handleTaxChange(form.data.tax === 19 ? 0 : 19)}
                            />
                            {isService && (
                                <SwitchRow
                                    id="variable_price"
                                    title="Precio variable"
                                    checked={form.data.variable_price}
                                    onCheckedChange={(checked) => form.setData('variable_price', checked)}
                                    label={
                                        form.data.variable_price ? 'Sí — el vendedor ingresa el precio al vender' : 'No — usar el precio base siempre'
                                    }
                                    hint="Activa esto si el precio varía según el trabajo (ej: restauraciones a cotizar)."
                                />
                            )}
                        </FormPanel>
                    </div>

                    {!isService && (
                        <div className="lg:col-start-1">
                            <FormPanel title="Inventario">
                                <NumberField
                                    id="stock"
                                    label="Stock inicial"
                                    required
                                    placeholder="Ej: 50"
                                    value={form.data.stock}
                                    error={form.errors.stock}
                                    hint="Unidades disponibles al crear el producto. Puede ser 0 si aún no hay inventario."
                                    onChange={(value) => {
                                        form.setData('stock', value);
                                        form.clearErrors('stock');
                                    }}
                                />
                                <NumberField
                                    id="min_stock"
                                    label="Stock mínimo"
                                    required
                                    placeholder="Ej: 5"
                                    value={form.data.min_stock}
                                    error={form.errors.min_stock}
                                    hint="Se avisa de bajo stock cuando las unidades sean iguales o menores a este valor."
                                    onChange={(value) => {
                                        form.setData('min_stock', value);
                                        form.clearErrors('min_stock');
                                    }}
                                />
                            </FormPanel>
                        </div>
                    )}

                    <div className="order-[10000] lg:col-span-2">
                        <StickyActions>
                            <Link href="/products">
                                <Button type="button" variant="outline" disabled={form.processing} className="h-11 sm:h-10">
                                    Cancelar
                                </Button>
                            </Link>
                            <button
                                type="submit"
                                disabled={form.processing}
                                className={cn(
                                    'flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 sm:h-10',
                                )}
                                style={{ color: onBrand.hex }}
                            >
                                {form.processing ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="size-4" aria-hidden="true" />
                                        Guardar Producto
                                    </>
                                )}
                            </button>
                        </StickyActions>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
