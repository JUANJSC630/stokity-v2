import { StickyActions } from '@/components/admin/sticky-actions';
import { FormPanel, INPUT_CLASS, LabeledField, SELECT_TRIGGER } from '@/components/sales/form-fields';
import { MovementTypePicker, ProductPicker, QuantityField, StockPreview } from '@/components/stock/movement-form-fields';
import { MovementTypePill, signedQuantity, type MovementType } from '@/components/stock/stock-meta';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { useScrollToError } from '@/hooks/use-scroll-to-error';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem, type Product, type Supplier } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { ArrowLeft, Loader2, Package, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
    branches: Branch[];
    suppliers: Supplier[];
    selectedProduct?: Product | null;
    selectedType?: string;
    userBranchId: number | null;
    now: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Movimientos de Stock', href: '/stock-movements' },
    { title: 'Nuevo Movimiento', href: '/stock-movements/create' },
];

export default function StockMovementCreate({ suppliers = [], selectedProduct, selectedType = 'in', now }: Props) {
    const onBrand = useOnBrandColor();
    const [selectedProductData, setSelectedProductData] = useState<Product | null>(selectedProduct || null);
    const [movementType, setMovementType] = useState<MovementType>((selectedType as MovementType) || 'ingreso');

    useEffect(() => {
        const preventWheel = (e: WheelEvent) => {
            if (e.target instanceof HTMLInputElement && e.target.type === 'number') e.preventDefault();
        };
        document.addEventListener('wheel', preventWheel, { passive: false });
        return () => document.removeEventListener('wheel', preventWheel);
    }, []);

    const { data, setData, post, processing, errors } = useForm({
        product_id: selectedProduct?.id?.toString() || '',
        type: ((selectedType as MovementType) || 'ingreso') as MovementType,
        quantity: '',
        unit_cost: '',
        supplier_id: '',
        reference: '',
        notes: '',
        from_product: selectedProduct ? '1' : '',
        movement_date: now,
    });

    useScrollToError(errors);

    const selectProduct = (product: Product) => {
        setSelectedProductData(product);
        setData('product_id', product.id.toString());
    };

    const clearProduct = () => {
        setSelectedProductData(null);
        setData('product_id', '');
    };

    const showSupplier = ['ingreso', 'supplier_return'].includes(movementType);
    const showUnitCost = movementType === 'ingreso';

    const quantityLabel =
        movementType === 'ingreso'
            ? 'Cantidad a ingresar'
            : ['out', 'write_off', 'supplier_return'].includes(movementType)
              ? 'Cantidad a retirar'
              : movementType === 'adjustment'
                ? 'Nuevo stock total'
                : 'Cantidad';

    const quantityHelp = selectedProductData ? `Stock actual: ${(selectedProductData.stock ?? 0).toLocaleString()}` : '';
    const hasQuantity = data.quantity !== '' && !Number.isNaN(Number(data.quantity));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo Movimiento de Stock" />

            <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex items-start gap-3">
                    <button
                        type="button"
                        aria-label="Volver"
                        onClick={() => window.history.back()}
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Nuevo Movimiento de Stock</h1>
                        <p className="text-sm text-muted-foreground">Registra una entrada, salida, baja, devolución o ajuste del inventario.</p>
                    </div>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        post('/stock-movements');
                    }}
                    className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]"
                >
                    <div className="flex flex-col gap-5">
                        <FormPanel title="Producto">
                            <ProductPicker selected={selectedProductData} onSelect={selectProduct} onClear={clearProduct} error={errors.product_id} />

                            {selectedProductData && (
                                <dl className="grid grid-cols-3 gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm sm:col-span-2">
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Código</dt>
                                        <dd className="font-medium">{selectedProductData.code}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Categoría</dt>
                                        <dd className="font-medium">{selectedProductData.category?.name || '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Sucursal</dt>
                                        <dd className="font-medium">{selectedProductData.branch?.name || '—'}</dd>
                                    </div>
                                </dl>
                            )}
                        </FormPanel>

                        <FormPanel title="Movimiento">
                            <MovementTypePicker
                                value={data.type}
                                onChange={(type) => {
                                    setMovementType(type);
                                    setData('type', type);
                                }}
                            />
                            {errors.type && (
                                <p role="alert" className="text-xs text-red-500 sm:col-span-2">
                                    {errors.type}
                                </p>
                            )}

                            {showSupplier && (
                                <LabeledField id="supplier_id" label="Proveedor" error={errors.supplier_id}>
                                    <Select
                                        value={data.supplier_id || '__none__'}
                                        onValueChange={(v) => setData('supplier_id', v === '__none__' ? '' : v)}
                                    >
                                        <SelectTrigger id="supplier_id" className={SELECT_TRIGGER}>
                                            <SelectValue placeholder="Sin proveedor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">Sin proveedor</SelectItem>
                                            {suppliers.map((s) => (
                                                <SelectItem key={s.id} value={s.id.toString()}>
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </LabeledField>
                            )}

                            <QuantityField
                                id="quantity"
                                label={quantityLabel}
                                value={data.quantity}
                                onChange={(value) => setData('quantity', value)}
                                min={movementType === 'adjustment' ? 0 : 1}
                                hint={quantityHelp}
                                error={errors.quantity}
                            />

                            {showUnitCost && (
                                <LabeledField id="unit_cost" label="Costo Unitario" error={errors.unit_cost}>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">$</span>
                                        <CurrencyInput
                                            id="unit_cost"
                                            autoComplete="off"
                                            className={`${INPUT_CLASS} pl-7`}
                                            value={Number(data.unit_cost) || 0}
                                            onChange={(v) => setData('unit_cost', v > 0 ? String(v) : '')}
                                            placeholder="0"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Precio de compra por unidad</p>
                                </LabeledField>
                            )}
                        </FormPanel>

                        <FormPanel title="Detalles">
                            <LabeledField id="reference" label="Referencia" error={errors.reference}>
                                <input
                                    id="reference"
                                    value={data.reference}
                                    onChange={(e) => setData('reference', e.target.value)}
                                    placeholder={
                                        movementType === 'ingreso'
                                            ? 'Ej: Compra proveedor, Factura #001, Transferencia...'
                                            : 'Ej: Factura #001, Ajuste mensual...'
                                    }
                                    className={INPUT_CLASS}
                                />
                            </LabeledField>

                            <LabeledField id="movement_date" label="Fecha y hora" required error={errors.movement_date}>
                                <input
                                    id="movement_date"
                                    type="datetime-local"
                                    value={data.movement_date}
                                    onChange={(e) => setData('movement_date', e.target.value)}
                                    className={INPUT_CLASS}
                                />
                            </LabeledField>

                            <LabeledField id="notes" label="Notas" error={errors.notes} className="sm:col-span-2">
                                <Textarea
                                    id="notes"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    placeholder="Notas adicionales sobre el movimiento..."
                                    rows={3}
                                    className="text-base sm:text-sm"
                                />
                            </LabeledField>
                        </FormPanel>
                    </div>

                    <aside
                        aria-label="Resumen del movimiento"
                        className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-5 lg:sticky lg:top-4"
                    >
                        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Resumen</h2>
                        {selectedProductData ? (
                            <div className="flex items-center gap-3">
                                <Package className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold">{selectedProductData.name}</p>
                                    <p className="font-mono text-xs text-muted-foreground">{selectedProductData.code}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Elige un producto para ver cómo quedará su stock.</p>
                        )}
                        <div className="flex items-center justify-between gap-3">
                            <MovementTypePill type={movementType} />
                            {hasQuantity && (
                                <span className="text-lg font-bold tabular-nums">{signedQuantity(movementType, Number(data.quantity))}</span>
                            )}
                        </div>
                        {selectedProductData && (
                            <StockPreview type={movementType} current={selectedProductData.stock ?? 0} quantity={data.quantity} />
                        )}
                    </aside>

                    <div className="lg:col-span-2">
                        <StickyActions>
                            <Button type="button" variant="outline" className="h-11 sm:h-10" onClick={() => window.history.back()}>
                                Cancelar
                            </Button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 sm:h-10"
                                style={{ color: onBrand.hex }}
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="size-4" aria-hidden="true" />
                                        Guardar Movimiento
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
