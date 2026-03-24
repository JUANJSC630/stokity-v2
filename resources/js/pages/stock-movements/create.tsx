import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useScrollToError } from '@/hooks/use-scroll-to-error';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem, type Product, type Supplier } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import axios from 'axios';
import { ArrowLeft, Loader2, Package, Save, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type MovementType = 'ingreso' | 'out' | 'adjustment' | 'write_off' | 'supplier_return';

interface Props {
    branches: Branch[];
    suppliers: Supplier[];
    selectedProduct?: Product | null;
    selectedType?: string;
    userBranchId: number | null;
    now: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Movimientos de Stock', href: '/stock-movements' },
    { title: 'Nuevo Movimiento', href: '/stock-movements/create' },
];

export default function StockMovementCreate({ suppliers = [], selectedProduct, selectedType = 'in', now }: Props) {
    const [selectedProductData, setSelectedProductData] = useState<Product | null>(selectedProduct || null);
    const [movementType, setMovementType] = useState<MovementType>((selectedType as MovementType) || 'ingreso');

    // Product search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [searching, setSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

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

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!value.trim()) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await axios.get('/api/products/search', { params: { q: value.trim() } });
                setSearchResults(res.data);
                setShowDropdown(true);
            } catch {
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 250);
    };

    const selectProduct = (product: Product) => {
        setSelectedProductData(product);
        setData('product_id', product.id.toString());
        setSearchQuery('');
        setSearchResults([]);
        setShowDropdown(false);
    };

    const clearProduct = () => {
        setSelectedProductData(null);
        setData('product_id', '');
        setSearchQuery('');
        setSearchResults([]);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const showSupplier = ['ingreso', 'supplier_return'].includes(movementType);
    const showUnitCost = movementType === 'ingreso';

    const quantityLabel = movementType === 'ingreso'
        ? 'Cantidad a ingresar'
        : ['out', 'write_off', 'supplier_return'].includes(movementType)
          ? 'Cantidad a retirar'
          : movementType === 'adjustment'
            ? 'Nuevo stock total'
            : 'Cantidad';

    const quantityHelp = selectedProductData ? `Stock actual: ${(selectedProductData.stock ?? 0).toLocaleString()}` : '';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo Movimiento de Stock" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Nuevo Movimiento de Stock</h1>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => window.history.back()}>
                        <ArrowLeft className="h-4 w-4" />
                        Volver
                    </Button>
                </div>

                <div className="mx-auto w-full max-w-2xl">
                    <Card>
                        <CardHeader>
                            <CardTitle>Información del Movimiento</CardTitle>
                            <CardDescription>Complete los datos del movimiento de stock</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    post('/stock-movements');
                                }}
                                className="space-y-5"
                            >
                                {/* ── Buscador de producto ── */}
                                <div className="space-y-1.5">
                                    <Label>Producto *</Label>
                                    <div ref={searchRef} className="relative">
                                        {selectedProductData ? (
                                            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2.5">
                                                <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                <span className="flex-1 truncate text-sm">
                                                    <span className="font-mono text-xs text-muted-foreground">{selectedProductData.code}</span>
                                                    <span className="mx-1 text-muted-foreground">—</span>
                                                    <span className="font-medium">{selectedProductData.name}</span>
                                                </span>
                                                <span
                                                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                                                        (selectedProductData.stock ?? 0) <= 0
                                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                                            : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                                                    }`}
                                                >
                                                    Stock: {(selectedProductData.stock ?? 0).toLocaleString()}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={clearProduct}
                                                    className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                    title="Cambiar producto"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    ref={inputRef}
                                                    placeholder="Buscar por nombre o código..."
                                                    className="pr-9 pl-9"
                                                    value={searchQuery}
                                                    onChange={(e) => handleSearchChange(e.target.value)}
                                                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                                                    autoComplete="off"
                                                />
                                                {searching && (
                                                    <Loader2 className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                                                )}
                                            </div>
                                        )}

                                        {showDropdown && searchResults.length > 0 && (
                                            <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
                                                <ul className="max-h-60 overflow-y-auto py-1">
                                                    {searchResults.map((p) => (
                                                        <li key={p.id}>
                                                            <button
                                                                type="button"
                                                                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                                                                onClick={() => selectProduct(p)}
                                                            >
                                                                <span className="w-20 shrink-0 truncate font-mono text-xs text-muted-foreground">
                                                                    {p.code}
                                                                </span>
                                                                <span className="flex-1 truncate font-medium">{p.name}</span>
                                                                <span
                                                                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                                                                        (p.stock ?? 0) <= 0
                                                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                                                            : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                                                                    }`}
                                                                >
                                                                    {(p.stock ?? 0).toLocaleString()}
                                                                </span>
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {showDropdown && !searching && searchQuery.length > 0 && searchResults.length === 0 && (
                                            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover px-3 py-4 text-center text-sm text-muted-foreground shadow-md">
                                                Sin resultados para "{searchQuery}"
                                            </div>
                                        )}
                                    </div>
                                    {errors.product_id && <p className="text-sm text-red-600">{errors.product_id}</p>}
                                </div>

                                {/* Info del producto */}
                                {selectedProductData && (
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-md border bg-muted/30 px-4 py-3 text-sm md:grid-cols-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Código</p>
                                            <p className="font-medium">{selectedProductData.code}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Categoría</p>
                                            <p className="font-medium">{selectedProductData.category?.name || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Sucursal</p>
                                            <p className="font-medium">{selectedProductData.branch?.name || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Stock actual</p>
                                            <p className="font-semibold">{(selectedProductData.stock ?? 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Tipo + Proveedor en la misma fila cuando aplica */}
                                <div className={`grid gap-4 ${showSupplier ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="type">Tipo de Movimiento *</Label>
                                        <Select
                                            value={data.type}
                                            onValueChange={(v) => {
                                                setMovementType(v as MovementType);
                                                setData('type', v as MovementType);
                                            }}
                                        >
                                            <SelectTrigger id="type">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ingreso">Ingreso</SelectItem>
                                                <SelectItem value="out">Salida</SelectItem>
                                                <SelectItem value="write_off">Baja de Inventario</SelectItem>
                                                <SelectItem value="supplier_return">Devolución a Proveedor</SelectItem>
                                                <SelectItem value="adjustment">Ajuste de Stock</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.type && <p className="text-sm text-red-600">{errors.type}</p>}
                                    </div>

                                    {showSupplier && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="supplier_id">Proveedor</Label>
                                            <Select
                                                value={data.supplier_id || '__none__'}
                                                onValueChange={(v) => setData('supplier_id', v === '__none__' ? '' : v)}
                                            >
                                                <SelectTrigger id="supplier_id">
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
                                            {errors.supplier_id && <p className="text-sm text-red-600">{errors.supplier_id}</p>}
                                        </div>
                                    )}
                                </div>

                                {/* Cantidad + Costo unitario en la misma fila cuando aplica */}
                                <div className={`grid gap-4 ${showUnitCost ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="quantity">{quantityLabel} *</Label>
                                        <Input
                                            id="quantity"
                                            type="number"
                                            min={movementType === 'adjustment' ? '0' : '1'}
                                            step="1"
                                            inputMode="numeric"
                                            autoComplete="off"
                                            value={data.quantity}
                                            onChange={(e) => setData('quantity', e.target.value)}
                                            placeholder="0"
                                        />
                                        {quantityHelp && <p className="text-xs text-muted-foreground">{quantityHelp}</p>}
                                        {errors.quantity && <p className="text-sm text-red-600">{errors.quantity}</p>}
                                    </div>

                                    {showUnitCost && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="unit_cost">Costo Unitario</Label>
                                            <CurrencyInput
                                                id="unit_cost"
                                                autoComplete="off"
                                                value={Number(data.unit_cost) || 0}
                                                onChange={(v) => setData('unit_cost', v > 0 ? String(v) : '')}
                                                placeholder="0"
                                            />
                                            <p className="text-xs text-muted-foreground">Precio de compra por unidad</p>
                                            {errors.unit_cost && <p className="text-sm text-red-600">{errors.unit_cost}</p>}
                                        </div>
                                    )}
                                </div>

                                {/* Referencia + Fecha en la misma fila */}
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="reference">Referencia</Label>
                                        <Input
                                            id="reference"
                                            value={data.reference}
                                            onChange={(e) => setData('reference', e.target.value)}
                                            placeholder={
                                                movementType === 'ingreso'
                                                    ? 'Ej: Compra proveedor, Factura #001, Transferencia...'
                                                    : 'Ej: Factura #001, Ajuste mensual...'
                                            }
                                        />
                                        {errors.reference && <p className="text-sm text-red-600">{errors.reference}</p>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="movement_date">Fecha y hora *</Label>
                                        <Input
                                            id="movement_date"
                                            type="datetime-local"
                                            value={data.movement_date}
                                            onChange={(e) => setData('movement_date', e.target.value)}
                                        />
                                        {errors.movement_date && <p className="text-sm text-red-600">{errors.movement_date}</p>}
                                    </div>
                                </div>

                                {/* Notas */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="notes">Notas</Label>
                                    <Textarea
                                        id="notes"
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        placeholder="Notas adicionales sobre el movimiento..."
                                        rows={3}
                                    />
                                    {errors.notes && <p className="text-sm text-red-600">{errors.notes}</p>}
                                </div>

                                {/* Submit */}
                                <div className="flex justify-end pt-2">
                                    <Button type="submit" disabled={processing} className="gap-2">
                                        {processing ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Guardando...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4" />
                                                Guardar Movimiento
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
