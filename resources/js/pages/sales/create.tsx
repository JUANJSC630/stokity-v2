import { CardCreateClient } from '@/components/clients';
import PaymentMethodSelect from '@/components/PaymentMethodSelect';
import { FormPanel, INPUT_CLASS, LabeledField, OptionSelect, Section } from '@/components/sales/form-fields';
import { SwipeActions, SwipeActionsRow } from '@/components/ui/arc/swipe-actions';
import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { StaggerItem } from '@/components/ui/bencho/stagger-item';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type Branch, type BreadcrumbItem, type Client, type User } from '@/types';
import type { Product } from '@/types/product';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ChevronLeft, ImageOff, Loader2, Minus, Plus, Search, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
    branches: Branch[];
    clients: Client[];
    sellers: User[];
}

// Utilidad para formatear a COP
function formatCOP(value: string | number) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return formatCurrency(num);
}

// Utilidad para formatear números sin símbolo de moneda
function formatNumber(value: string | number) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
}

export default function Create({ branches, clients }: Props) {
    // Ordenar clientes por id descendente (más reciente arriba)
    const sortedClients = [...clients].sort((a, b) => b.id - a.id);
    // Busca el id real del cliente Anónimo si existe, si no, usa el primero
    const anonymous = sortedClients.find((c) => c.name.toLowerCase() === 'consumidor final');
    const anonymousClient = anonymous || sortedClients[0];
    const clientsWithAnonymous = anonymous ? sortedClients : [{ id: 0, name: 'Consumidor Final' }, ...sortedClients];

    const { auth } = usePage<{ auth: { user: User } }>().props;
    const onBrand = useOnBrandColor();
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Ventas',
            href: '/sales',
        },
        {
            title: 'Nueva venta',
            href: '/sales/create',
        },
    ];

    // Prevenir scroll del mouse en inputs de tipo número
    useEffect(() => {
        const preventWheel = (e: WheelEvent) => {
            if (e.target instanceof HTMLInputElement && e.target.type === 'number') {
                e.preventDefault();
            }
        };

        document.addEventListener('wheel', preventWheel, { passive: false });

        return () => {
            document.removeEventListener('wheel', preventWheel);
        };
    }, []);

    // Selecciona la sucursal por defecto según la asignada al usuario auth
    const defaultBranchId = auth.user.branch_id ? String(auth.user.branch_id) : branches[0] ? String(branches[0].id) : '';

    // Usa el tipado correcto para products y valores string
    const form = useForm({
        branch_id: defaultBranchId,
        client_id: anonymousClient ? String(anonymousClient.id) : '',
        seller_id: String(auth.user.id),
        tax: '0',
        discount_type: 'none' as 'none' | 'percentage' | 'fixed',
        discount_value: '0',
        discount_amount: '0',
        net: '0',
        total: '0',
        amount_paid: '0',
        change_amount: '0',
        payment_method: '',
        date: new Date().toLocaleString('sv-SE', { timeZone: 'America/Bogota' }).slice(0, 16), // Formato: YYYY-MM-DDThh:mm en zona horaria local
        status: 'completed',
        notes: '',
        products: [] as { id: number; quantity: number; price: number; subtotal: number }[],
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (saleProducts.length === 0) {
            toast.error('Debes agregar al menos un producto a la venta.');
            return;
        }

        // Validar que el monto pagado sea suficiente si es efectivo
        if (form.data.payment_method === 'cash') {
            const total = parseFloat(form.data.total) || 0;
            const amountPaid = parseFloat(form.data.amount_paid) || 0;

            if (amountPaid < total) {
                toast.error(`El monto pagado (${formatCOP(amountPaid)}) debe ser al menos igual al total (${formatCOP(total)})`);
                return;
            }

            // Asegurar que el cambio no sea negativo
            const change = Math.max(amountPaid - total, 0);
            form.setData('change_amount', change.toFixed(2));
        }

        const data = {
            branch_id: form.data.branch_id,
            client_id: form.data.client_id,
            seller_id: form.data.seller_id,
            net: form.data.net,
            total: form.data.total,
            amount_paid: form.data.amount_paid,
            change_amount: form.data.change_amount,
            payment_method: form.data.payment_method,
            date: form.data.date,
            status: form.data.status,
            discount_type: form.data.discount_type,
            discount_value: form.data.discount_value,
            notes: form.data.notes,
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
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const searchTimeout = React.useRef<NodeJS.Timeout | null>(null);
    const abortRef = React.useRef<AbortController | null>(null);

    React.useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (!productSearch || productSearch.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        searchTimeout.current = setTimeout(async () => {
            if (abortRef.current) abortRef.current.abort();
            abortRef.current = new AbortController();
            try {
                const res = await fetch(route('api.products.search') + '?' + new URLSearchParams({ q: productSearch }), {
                    signal: abortRef.current.signal,
                });
                if (res.ok) setSearchResults(await res.json());
            } catch (err) {
                if ((err as Error).name !== 'AbortError') console.error(err);
            } finally {
                setSearching(false);
            }
        }, 350);
    }, [productSearch]);

    // Handler para Enter en el input de búsqueda
    function handleProductSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Buscar producto exacto por código o nombre
            const search = productSearch.trim().toLowerCase();
            const found = searchResults.find((p) => p.code?.toLowerCase() === search || p.name?.toLowerCase() === search);
            if (found) {
                handleAddProduct(found);
                setProductSearch('');
            } else if (searchResults.length === 1) {
                // Si solo hay un resultado, agregarlo
                handleAddProduct(searchResults[0]);
                setProductSearch('');
            }
        }
    }

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

    function recalculateTotals(discountType = form.data.discount_type, discountVal = form.data.discount_value) {
        const net = saleProducts.reduce((sum, sp) => sum + sp.subtotal, 0);

        // Calcular impuesto por producto
        const tax = saleProducts.reduce((sum, sp) => {
            const productTax = sp.product.tax || 0;
            return sum + sp.subtotal * (productTax / 100);
        }, 0);

        const gross = net + tax;
        const dVal = parseFloat(discountVal) || 0;
        const discountAmount =
            discountType === 'percentage' ? Math.round(gross * (dVal / 100) * 100) / 100 : discountType === 'fixed' ? Math.min(dVal, gross) : 0;

        const total = Math.max(0, gross - discountAmount);

        form.setData((prev) => ({
            ...prev,
            net: net.toFixed(2),
            tax: tax.toFixed(2),
            discount_amount: discountAmount.toFixed(2),
            total: total.toFixed(2),
        }));

        // Si el método de pago es efectivo, calcular la devuelta automáticamente
        if (form.data.payment_method === 'cash') {
            const amountPaid = parseFloat(form.data.amount_paid) || 0;
            const change = amountPaid - total;
            form.setData('change_amount', change.toFixed(2));
        }
    }

    // Función para formatear el input mientras el usuario escribe
    function formatAmountPaidInput(value: string) {
        // Remover todo excepto números
        const numbersOnly = value.replace(/[^\d]/g, '');

        if (numbersOnly === '') return '';

        // Convertir a número y formatear
        const numericValue = parseInt(numbersOnly, 10);
        return new Intl.NumberFormat('es-CO', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(numericValue);
    }

    // Función para parsear el valor formateado de vuelta a número
    function parseFormattedAmount(formattedValue: string): number {
        // Remover todos los caracteres no numéricos
        const numbersOnly = formattedValue.replace(/[^\d]/g, '');
        return parseInt(numbersOnly, 10) || 0;
    }

    React.useEffect(() => {
        recalculateTotals(form.data.discount_type, form.data.discount_value);
        // eslint-disable-next-line
    }, [saleProducts, form.data.payment_method, form.data.discount_type, form.data.discount_value]);

    // Inicializar el display del monto pagado cuando cambie el total
    React.useEffect(() => {
        const numericValue = parseFloat(form.data.amount_paid) || 0;
        if (numericValue > 0) {
            setAmountPaidDisplay(formatNumber(numericValue));
        }
    }, [form.data.amount_paid]);

    // Referencia para el input de búsqueda de productos
    const productSearchRef = React.useRef<HTMLInputElement>(null);

    // Estado para mostrar el modal de crear cliente
    const [showCreateClient, setShowCreateClient] = useState(false);

    // Estado para el input de monto pagado (formato visual)
    const [amountPaidDisplay, setAmountPaidDisplay] = useState('');

    function payWith(amount: number) {
        const total = parseFloat(form.data.total) || 0;
        form.setData('amount_paid', amount.toString());
        setAmountPaidDisplay(formatNumber(amount));
        form.setData('change_amount', (amount - total).toFixed(2));
    }

    const totalValue = parseFloat(form.data.total) || 0;
    const discountApplied = form.data.discount_type !== 'none' && parseFloat(form.data.discount_amount) > 0;
    const itemCount = saleProducts.reduce((sum, sp) => sum + sp.quantity, 0);
    const query = productSearch.trim();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nueva venta" />

            <Dialog open={showCreateClient} onOpenChange={setShowCreateClient}>
                <DialogContent className="max-w-lg md:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Crear nuevo cliente</DialogTitle>
                    </DialogHeader>
                    <CardCreateClient
                        onSuccess={() => {
                            setShowCreateClient(false);
                            toast.success('Cliente creado correctamente');
                            router.reload({ only: ['clients'] });
                        }}
                        onCancel={() => setShowCreateClient(false)}
                    />
                </DialogContent>
            </Dialog>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-4 sm:p-6">
                <div className="flex items-start gap-3">
                    <Link
                        href={route('sales.index')}
                        aria-label="Volver a ventas"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted sm:h-8 sm:w-8"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="truncate text-xl leading-tight font-bold sm:text-2xl">Nueva venta</h1>
                        <p className="text-sm text-muted-foreground">Busca productos, revisa el total y registra el cobro.</p>
                    </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-[1fr_24rem] lg:items-start">
                    {/* Product picker: first on phones, side panel on desktop */}
                    <div className="order-1 lg:sticky lg:top-4 lg:order-2">
                        <Section title="Agregar productos">
                            <div className="flex flex-col gap-3 px-5 pb-5">
                                <div className="relative">
                                    <label htmlFor="product-search" className="sr-only">
                                        Buscar producto
                                    </label>
                                    <Search
                                        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <input
                                        id="product-search"
                                        type="search"
                                        inputMode="search"
                                        enterKeyHint="search"
                                        autoComplete="off"
                                        placeholder="Nombre o código del producto"
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        onKeyDown={handleProductSearchKeyDown}
                                        ref={productSearchRef}
                                        className="h-11 w-full rounded-xl border border-border/60 bg-background pr-11 pl-10 text-base focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none sm:h-10 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
                                    />
                                    {searching && (
                                        <Loader2
                                            className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                                            aria-label="Buscando"
                                        />
                                    )}
                                </div>

                                <div aria-live="polite" className="flex flex-col gap-2 lg:max-h-[60vh] lg:overflow-y-auto">
                                    {query.length < 2 ? (
                                        <p className="py-3 text-center text-sm text-muted-foreground">Escribe al menos 2 letras para buscar.</p>
                                    ) : searchResults.length === 0 && !searching ? (
                                        <p className="py-3 text-center text-sm text-muted-foreground">No se encontraron productos.</p>
                                    ) : (
                                        searchResults.map((p, index) => {
                                            const inSale = saleProducts.some((sp) => sp.product.id === p.id);
                                            const unavailable = p.stock <= 0 || inSale;
                                            return (
                                                <StaggerItem key={p.id} index={index}>
                                                    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background p-2.5">
                                                        {p.image_url ? (
                                                            <img
                                                                src={p.image_url}
                                                                alt=""
                                                                className="size-11 shrink-0 rounded-lg border border-border/60 object-cover"
                                                            />
                                                        ) : (
                                                            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                                                <ImageOff className="size-5" aria-hidden="true" />
                                                            </span>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm leading-tight font-medium">{p.name}</p>
                                                            <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                                                                <span className="font-semibold text-foreground tabular-nums">
                                                                    {formatCOP(p.sale_price)}
                                                                </span>
                                                                <span
                                                                    className={cn(
                                                                        'rounded-full px-2 py-0.5 font-medium',
                                                                        p.stock <= 0
                                                                            ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                                                                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
                                                                    )}
                                                                >
                                                                    {p.stock <= 0 ? 'Sin stock' : `Stock ${p.stock}`}
                                                                </span>
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            aria-label={`Agregar ${p.name}`}
                                                            disabled={unavailable}
                                                            onClick={() => {
                                                                handleAddProduct(p);
                                                                setProductSearch('');
                                                            }}
                                                            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary)] transition-opacity hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground"
                                                            style={unavailable ? undefined : { color: onBrand.hex }}
                                                        >
                                                            <Plus className="size-5" aria-hidden="true" />
                                                        </button>
                                                    </div>
                                                </StaggerItem>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </Section>
                    </div>

                    <div className="order-2 flex min-w-0 flex-col gap-5 lg:order-1">
                        <FormPanel title="Cliente y pago">
                            <LabeledField id="client_id" label="Cliente" required error={form.errors.client_id}>
                                <div className="flex items-center gap-2">
                                    <div className="min-w-0 flex-1">
                                        <OptionSelect
                                            id="client_id"
                                            value={form.data.client_id || ''}
                                            onValueChange={(value) => form.setData('client_id', value)}
                                            options={clientsWithAnonymous}
                                            placeholder="Seleccione cliente"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        aria-label="Crear cliente"
                                        title="Crear cliente"
                                        onClick={() => setShowCreateClient(true)}
                                        className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted sm:size-9"
                                    >
                                        <Plus className="size-4" aria-hidden="true" />
                                    </button>
                                </div>
                            </LabeledField>

                            <PaymentMethodSelect
                                value={form.data.payment_method || undefined}
                                onValueChange={(value) => form.setData('payment_method', value)}
                                error={form.errors.payment_method}
                                required
                                triggerClassName="h-11 text-base sm:h-9 sm:text-sm"
                            />
                        </FormPanel>

                        <Section
                            title="Productos en la venta"
                            action={itemCount > 0 ? <span className="text-xs text-muted-foreground tabular-nums">{itemCount} uds</span> : undefined}
                        >
                            {saleProducts.length === 0 ? (
                                <p className="px-5 pb-6 text-center text-sm text-muted-foreground">
                                    Aún no hay productos. Búscalos arriba para agregarlos.
                                </p>
                            ) : (
                                <>
                                    <div className="md:hidden">
                                        <SwipeActions label={`${saleProducts.length} producto(s) en la venta`}>
                                            {saleProducts.map((sp) => (
                                                <SwipeActionsRow
                                                    key={sp.product.id}
                                                    label={sp.product.name}
                                                    fullSwipe={false}
                                                    trailing={[
                                                        {
                                                            label: 'Quitar',
                                                            icon: <Trash2 />,
                                                            tone: 'danger',
                                                            onSelect: () => handleRemoveProduct(sp.product.id),
                                                        },
                                                    ]}
                                                >
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <p className="min-w-0 text-[15px] leading-snug font-semibold">{sp.product.name}</p>
                                                            <p className="shrink-0 text-base font-bold tabular-nums">{formatCOP(sp.subtotal)}</p>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-3">
                                                            <p className="text-xs text-muted-foreground tabular-nums">
                                                                {formatCOP(sp.product.sale_price)} c/u
                                                                {sp.product.tax ? ` · IVA ${sp.product.tax}%` : ''}
                                                            </p>
                                                            <QuantityStepper
                                                                quantity={sp.quantity}
                                                                max={sp.product.stock}
                                                                name={sp.product.name}
                                                                onChange={(qty) => handleChangeQuantity(sp.product.id, qty)}
                                                            />
                                                        </div>
                                                    </div>
                                                </SwipeActionsRow>
                                            ))}
                                        </SwipeActions>
                                    </div>

                                    <table className="hidden w-full text-sm md:table">
                                        <caption className="sr-only">Productos en la venta</caption>
                                        <thead>
                                            <tr className="border-y border-border/40 bg-muted/20 text-[11px] tracking-wide text-muted-foreground uppercase">
                                                <th scope="col" className="px-5 py-2.5 text-left font-medium">
                                                    Producto
                                                </th>
                                                <th scope="col" className="px-3 py-2.5 text-center font-medium">
                                                    Cantidad
                                                </th>
                                                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                                                    Precio
                                                </th>
                                                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                                                    Impuesto
                                                </th>
                                                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                                                    Subtotal
                                                </th>
                                                <th scope="col" className="w-14 px-5 py-2.5">
                                                    <span className="sr-only">Quitar</span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/40">
                                            {saleProducts.map((sp) => (
                                                <tr key={sp.product.id}>
                                                    <td className="px-5 py-2.5 font-medium">{sp.product.name}</td>
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex justify-center">
                                                            <QuantityStepper
                                                                quantity={sp.quantity}
                                                                max={sp.product.stock}
                                                                name={sp.product.name}
                                                                onChange={(qty) => handleChangeQuantity(sp.product.id, qty)}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right tabular-nums">{formatCOP(sp.product.sale_price)}</td>
                                                    <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums">
                                                        {sp.product.tax || 0}%
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatCOP(sp.subtotal)}</td>
                                                    <td className="px-5 py-2.5">
                                                        <button
                                                            type="button"
                                                            aria-label={`Quitar ${sp.product.name}`}
                                                            onClick={() => handleRemoveProduct(sp.product.id)}
                                                            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                                                        >
                                                            <X className="size-4" aria-hidden="true" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            )}
                        </Section>

                        <Section title="Descuento">
                            <div className="flex flex-col gap-3 px-5 pb-5">
                                <div role="group" aria-label="Tipo de descuento" className="grid grid-cols-3 gap-2">
                                    {(
                                        [
                                            ['none', 'Sin descuento'],
                                            ['percentage', 'Porcentaje %'],
                                            ['fixed', 'Monto fijo $'],
                                        ] as const
                                    ).map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            aria-pressed={form.data.discount_type === value}
                                            onClick={() => form.setData('discount_type', value)}
                                            className={cn(
                                                'flex h-11 items-center justify-center rounded-lg border px-2 text-center text-sm leading-tight font-medium transition-colors sm:h-9',
                                                form.data.discount_type === value
                                                    ? 'border-[var(--brand-primary)]/40 bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]'
                                                    : 'border-border/60 bg-card text-muted-foreground hover:bg-muted',
                                            )}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                {form.data.discount_type !== 'none' && (
                                    <div className="flex items-center gap-3">
                                        {form.data.discount_type === 'fixed' ? (
                                            <CurrencyInput
                                                aria-label="Monto del descuento"
                                                value={Number(form.data.discount_value) || 0}
                                                onChange={(v) => form.setData('discount_value', v > 0 ? String(v) : '0')}
                                                className="h-11 flex-1 bg-white text-base sm:h-9 sm:text-sm dark:bg-neutral-800"
                                                placeholder="0"
                                            />
                                        ) : (
                                            <input
                                                aria-label="Porcentaje de descuento"
                                                type="number"
                                                inputMode="decimal"
                                                min={0}
                                                max={100}
                                                step={1}
                                                placeholder="0"
                                                value={form.data.discount_value === '0' ? '' : form.data.discount_value}
                                                onChange={(e) => form.setData('discount_value', e.target.value || '0')}
                                                className={cn(INPUT_CLASS, 'flex-1')}
                                            />
                                        )}
                                        {discountApplied && (
                                            <span className="shrink-0 text-sm font-semibold text-red-600 tabular-nums dark:text-red-400">
                                                − {formatCOP(form.data.discount_amount)}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Section>

                        {form.data.payment_method === 'cash' && (
                            <Section title="Pago en efectivo">
                                <div className="flex flex-col gap-3 px-5 pb-5">
                                    <LabeledField id="amount_paid" label="Con cuánto paga" required error={form.errors.amount_paid}>
                                        <input
                                            id="amount_paid"
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="0"
                                            className={INPUT_CLASS}
                                            value={amountPaidDisplay}
                                            onChange={(e) => {
                                                const formattedValue = formatAmountPaidInput(e.target.value);
                                                setAmountPaidDisplay(formattedValue);
                                                const numericValue = parseFormattedAmount(formattedValue);
                                                form.setData('amount_paid', numericValue.toString());
                                                const total = parseFloat(form.data.total) || 0;
                                                const change = Math.max(numericValue - total, 0);
                                                form.setData('change_amount', change.toFixed(2));
                                            }}
                                            onBlur={() => {
                                                const numericValue = parseFloat(form.data.amount_paid) || 0;
                                                setAmountPaidDisplay(formatNumber(numericValue));
                                            }}
                                            required
                                        />
                                    </LabeledField>
                                    <div className="flex flex-wrap gap-2">
                                        {(
                                            [
                                                ['Exacto', totalValue, 'Pagar exacto'],
                                                ['Mil', Math.ceil(totalValue / 1000) * 1000, 'Redondear al mil'],
                                                ['5 mil', Math.ceil(totalValue / 5000) * 5000, 'Redondear a 5 mil'],
                                                ['10 mil', Math.ceil(totalValue / 10000) * 10000, 'Redondear a 10 mil'],
                                            ] as const
                                        ).map(([label, amount, title]) => (
                                            <button
                                                key={label}
                                                type="button"
                                                title={title}
                                                onClick={() => payWith(amount)}
                                                className="h-11 min-w-16 rounded-full border border-border/60 bg-card px-4 text-sm font-medium transition-colors hover:bg-muted sm:h-9"
                                            >
                                                {label}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            aria-label="Limpiar monto"
                                            title="Limpiar campo"
                                            onClick={() => {
                                                form.setData('amount_paid', '0');
                                                setAmountPaidDisplay('');
                                                form.setData('change_amount', '0.00');
                                            }}
                                            className="flex size-11 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted sm:size-9"
                                        >
                                            <X className="size-4" aria-hidden="true" />
                                        </button>
                                    </div>
                                    <div
                                        className={cn(
                                            'flex items-center justify-between rounded-xl px-4 py-3',
                                            parseFloat(form.data.change_amount) >= 0
                                                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                                                : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300',
                                        )}
                                    >
                                        <span id="change_amount" className="text-sm font-medium">
                                            Cambio
                                        </span>
                                        <span aria-labelledby="change_amount" className="text-xl font-bold tabular-nums">
                                            {formatCOP(form.data.change_amount || 0)}
                                        </span>
                                    </div>
                                    {form.errors.change_amount && <p className="text-xs text-red-500">{form.errors.change_amount}</p>}
                                </div>
                            </Section>
                        )}

                        <Section title="Notas">
                            <div className="px-5 pb-5">
                                <label htmlFor="notes" className="sr-only">
                                    Notas u observaciones
                                </label>
                                <textarea
                                    id="notes"
                                    placeholder="Observaciones internas de la venta..."
                                    value={form.data.notes}
                                    onChange={(e) => form.setData('notes', e.target.value)}
                                    rows={2}
                                    maxLength={500}
                                    className="w-full resize-none rounded-lg border border-border/60 bg-white p-3 text-base focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none sm:text-sm dark:bg-neutral-800"
                                />
                                {form.errors.notes && <p className="mt-1 text-xs text-red-500">{form.errors.notes}</p>}
                            </div>
                        </Section>

                        <Section title="Resumen">
                            <dl className="flex flex-col gap-2 px-5 pb-5">
                                <div className="flex items-center justify-between gap-4">
                                    <dt className="text-sm text-muted-foreground">Subtotal</dt>
                                    <dd className="text-sm tabular-nums">{formatCOP(form.data.net || 0)}</dd>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <dt className="text-sm text-muted-foreground">Impuesto</dt>
                                    <dd className="text-sm tabular-nums">{formatCOP(form.data.tax || 0)}</dd>
                                </div>
                                {discountApplied && (
                                    <div className="flex items-center justify-between gap-4">
                                        <dt className="text-sm text-muted-foreground">Descuento</dt>
                                        <dd className="text-sm text-red-500 tabular-nums dark:text-red-400">
                                            − {formatCOP(form.data.discount_amount)}
                                        </dd>
                                    </div>
                                )}
                                <div className="flex items-center justify-between gap-4 border-t border-border/40 pt-3">
                                    <dt className="text-base font-semibold">Total</dt>
                                    <dd className="text-2xl font-bold tracking-tight tabular-nums">
                                        <RollingNumber value={totalValue} format={formatCurrency} />
                                    </dd>
                                </div>
                                {form.errors.net && <p className="text-xs text-red-500">{form.errors.net}</p>}
                                {form.errors.total && <p className="text-xs text-red-500">{form.errors.total}</p>}
                            </dl>
                        </Section>
                    </div>
                </div>

                <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 flex items-center gap-3 border-t border-border/60 bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:static md:z-auto md:mx-0 md:justify-end md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
                    <div className="min-w-0 flex-1 md:hidden">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="truncate text-lg leading-tight font-bold tabular-nums">{formatCurrency(totalValue)}</p>
                    </div>
                    <Link
                        href={route('sales.index')}
                        className="hidden h-9 items-center justify-center rounded-lg border border-border/60 bg-card px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted md:flex"
                    >
                        Cancelar
                    </Link>
                    <button
                        type="submit"
                        title={saleProducts.length === 0 ? 'Agrega al menos un producto para registrar la venta' : undefined}
                        className="flex h-11 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary)] px-6 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 md:h-9"
                        style={{ color: onBrand.hex }}
                    >
                        Registrar venta
                    </button>
                </div>
            </form>
        </AppLayout>
    );
}

function QuantityStepper({ quantity, max, name, onChange }: { quantity: number; max: number; name: string; onChange: (quantity: number) => void }) {
    return (
        <div className="flex items-center gap-1" role="group" aria-label={`Cantidad de ${name}`}>
            <button
                type="button"
                aria-label={`Menos ${name}`}
                disabled={quantity <= 1}
                onClick={() => onChange(Math.max(1, quantity - 1))}
                className="flex size-11 items-center justify-center rounded-lg border border-border/60 bg-card transition-colors hover:bg-muted disabled:opacity-40 sm:size-9"
            >
                <Minus className="size-4" aria-hidden="true" />
            </button>
            <input
                type="number"
                inputMode="numeric"
                min={1}
                max={max}
                value={quantity}
                aria-label={`Cantidad de ${name}`}
                onChange={(e) => onChange(Math.min(Number(e.target.value), max))}
                className="h-11 w-14 rounded-lg border border-border/60 bg-background text-center text-base font-semibold tabular-nums focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none sm:h-9 sm:text-sm [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
                type="button"
                aria-label={`Más ${name}`}
                disabled={quantity >= max}
                onClick={() => onChange(Math.min(max, quantity + 1))}
                className="flex size-11 items-center justify-center rounded-lg border border-border/60 bg-card transition-colors hover:bg-muted disabled:opacity-40 sm:size-9"
            >
                <Plus className="size-4" aria-hidden="true" />
            </button>
            {quantity >= max && <span className="ml-1 text-[11px] font-semibold text-orange-500">máx.</span>}
        </div>
    );
}
