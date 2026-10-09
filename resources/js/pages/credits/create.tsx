import PaymentMethodSelect from '@/components/PaymentMethodSelect';
import { INPUT_CLASS } from '@/components/sales/form-fields';
import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type Client } from '@/types';
import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import {
    ArrowLeft,
    ArrowRight,
    Calendar,
    Check,
    ChevronLeft,
    Clock,
    HandCoins,
    Layers,
    Minus,
    Package,
    Plus,
    Search,
    ShoppingBag,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

interface CreditProduct {
    id: number;
    name: string;
    code: string;
    sale_price: number;
    stock: number;
    reserved_stock: number;
    available_stock: number;
    image_url: string;
    type: string;
    tax: number;
    variable_price: boolean;
}

interface Props {
    clients: Client[];
    products: CreditProduct[];
    branchId: number | null;
}

interface CartItem {
    product: CreditProduct;
    quantity: number;
    unit_price: number;
    subtotal: number;
}

type CreditType = 'layaway' | 'installments' | 'due_date' | 'hold';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Créditos', href: '/credits' },
    { title: 'Nuevo crédito', href: '/credits/create' },
];

function cop(value: number): string {
    return formatCurrency(Number(value));
}

const TYPE_CONFIG: Record<CreditType, { label: string; description: string; icon: typeof HandCoins; color: string }> = {
    layaway: {
        label: 'Separado',
        description: 'El cliente aparta con un abono. El producto se entrega al completar el pago.',
        icon: ShoppingBag,
        color: '',
    },
    installments: {
        label: 'Cuotas',
        description: 'El producto se entrega de inmediato. El cliente paga en cuotas mensuales.',
        icon: Layers,
        color: '',
    },
    due_date: {
        label: 'Fecha acordada',
        description: 'El producto se entrega de inmediato. El cliente paga en una fecha acordada.',
        icon: Calendar,
        color: '',
    },
    hold: {
        label: 'Reservado',
        description: 'Solo se reserva. Sin abono. El cliente regresa a pagar y recoger.',
        icon: Clock,
        color: '',
    },
};

// ─── Step components ────────────────────────────────────────────────────────────

const STEP_LABELS = ['Cliente y productos', 'Condiciones', 'Confirmar'];

function StepIndicator({ current, total }: { current: number; total: number }) {
    return (
        <ol className="flex items-center gap-2" aria-label="Pasos del crédito">
            {Array.from({ length: total }, (_, i) => (
                <li key={i} className="flex items-center gap-2" aria-current={i === current ? 'step' : undefined}>
                    <span
                        className={cn(
                            'flex size-8 items-center justify-center rounded-full text-sm font-bold transition-colors',
                            i < current
                                ? 'bg-emerald-500 text-white'
                                : i === current
                                  ? 'bg-[var(--brand-primary)] text-white'
                                  : 'bg-muted text-muted-foreground',
                        )}
                    >
                        {i < current ? <Check className="size-4" aria-hidden="true" /> : i + 1}
                    </span>
                    <span className={cn('hidden text-sm font-medium xl:inline', i === current ? 'text-foreground' : 'text-muted-foreground')}>
                        {STEP_LABELS[i]}
                    </span>
                    {i < total - 1 && (
                        <span className={cn('h-0.5 w-6 rounded-full', i < current ? 'bg-emerald-500' : 'bg-muted')} aria-hidden="true" />
                    )}
                </li>
            ))}
        </ol>
    );
}

const hasStockLimit = (product: CreditProduct): boolean => product.type !== 'servicio';

export default function CreditCreate({ clients, products, branchId }: Props) {
    const onBrand = useOnBrandColor();
    const [step, setStep] = useState(0);

    // Step 1 — Client + Products
    const [clientId, setClientId] = useState<string>('');
    const [clientSearch, setClientSearch] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);

    // Step 2 — Type + Conditions
    const [creditType, setCreditType] = useState<CreditType | null>(null);
    const [installmentsCount, setInstallmentsCount] = useState(3);
    const [dueDate, setDueDate] = useState('');
    const [initialPayment, setInitialPayment] = useState(0);
    const [initialPaymentMethod, setInitialPaymentMethod] = useState('efectivo');
    const [notes, setNotes] = useState('');

    const [submitting, setSubmitting] = useState(false);

    const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.subtotal, 0), [cart]);

    const filteredClients = useMemo(
        () =>
            clientSearch
                ? clients.filter((c) => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.document?.includes(clientSearch))
                : clients.slice(0, 20),
        [clients, clientSearch],
    );

    const filteredProducts = useMemo(
        () =>
            productSearch
                ? products.filter(
                      (p) => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.code.toLowerCase().includes(productSearch.toLowerCase()),
                  )
                : products.slice(0, 30),
        [products, productSearch],
    );

    function addToCart(product: CreditProduct) {
        if (hasStockLimit(product) && product.available_stock < 1) {
            toast.error(`${product.name} no tiene stock disponible`);
            return;
        }
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                if (hasStockLimit(product) && existing.quantity + 1 > product.available_stock) {
                    toast.error(`Stock disponible de ${product.name}: ${product.available_stock}`);
                    return prev;
                }
                return prev.map((item) =>
                    item.product.id === product.id ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unit_price } : item,
                );
            }
            const price = Number(product.sale_price);
            return [...prev, { product, quantity: 1, unit_price: price, subtotal: price }];
        });
    }

    function updateCartItem(productId: number, quantity: number) {
        if (quantity <= 0) {
            setCart((prev) => prev.filter((item) => item.product.id !== productId));
        } else {
            setCart((prev) =>
                prev.map((item) => {
                    if (item.product.id !== productId) {
                        return item;
                    }
                    const capped = hasStockLimit(item.product) ? Math.min(quantity, item.product.available_stock) : quantity;
                    return { ...item, quantity: capped, subtotal: capped * item.unit_price };
                }),
            );
        }
    }

    function updateCartPrice(productId: number, price: number) {
        setCart((prev) =>
            prev.map((item) => (item.product.id === productId ? { ...item, unit_price: price, subtotal: item.quantity * price } : item)),
        );
    }

    function removeFromCart(productId: number) {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    }

    function canNext(): boolean {
        if (step === 0) return !!clientId && cart.length > 0;
        if (step === 1) {
            if (!creditType) return false;
            if (creditType === 'installments' && (!installmentsCount || installmentsCount < 1)) return false;
            if (creditType === 'due_date' && !dueDate) return false;
            if (initialPayment > cartTotal) return false;
            return true;
        }
        return true;
    }

    function handleSubmit() {
        if (!creditType || !clientId || cart.length === 0 || !branchId) return;
        setSubmitting(true);

        router.post(
            '/credits',
            {
                type: creditType,
                client_id: parseInt(clientId),
                branch_id: branchId,
                due_date: dueDate || null,
                installments_count: creditType === 'installments' ? installmentsCount : null,
                initial_payment: initialPayment > 0 ? initialPayment : null,
                initial_payment_method: initialPayment > 0 ? initialPaymentMethod : null,
                notes: notes || null,
                items: cart.map((item) => ({
                    product_id: item.product.id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    subtotal: item.subtotal,
                })),
            },
            {
                onSuccess: () => toast.success('Crédito registrado'),
                onError: (errors) => {
                    Object.values(errors).forEach((e) => toast.error(e as string));
                    setSubmitting(false);
                },
                onFinish: () => setSubmitting(false),
            },
        );
    }

    const selectedClient = clients.find((c) => c.id === parseInt(clientId));
    const unitCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo crédito" />

            <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => router.visit('/credits')}
                            aria-label="Volver a créditos"
                            className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted sm:size-9"
                        >
                            <ChevronLeft className="size-4" aria-hidden="true" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Nuevo crédito</h1>
                            <p className="text-sm text-muted-foreground">
                                Paso {step + 1} de 3 · {STEP_LABELS[step]}
                            </p>
                        </div>
                    </div>
                    <StepIndicator current={step} total={3} />
                </div>

                <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
                    <div className="flex min-w-0 flex-col gap-5">
                        {/* ═══ STEP 0: Client + Products ═══ */}
                        {step === 0 && (
                            <div className="flex flex-col gap-5">
                                <section className="space-y-3 rounded-2xl border border-border/60 bg-card p-5">
                                    <h2 className="text-base font-semibold">Cliente</h2>
                                    <div className="relative">
                                        <Search
                                            className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                        <input
                                            placeholder="Buscar cliente por nombre o documento..."
                                            value={clientSearch}
                                            onChange={(e) => setClientSearch(e.target.value)}
                                            className={cn(INPUT_CLASS, 'pl-10')}
                                        />
                                    </div>
                                    {!clientId ? (
                                        <div className="max-h-56 space-y-1 overflow-y-auto">
                                            {filteredClients.map((c) => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => {
                                                        setClientId(String(c.id));
                                                        setClientSearch('');
                                                    }}
                                                    className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                                                >
                                                    <span className="font-medium">{c.name}</span>
                                                    {c.document && <span className="text-muted-foreground">{c.document}</span>}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between rounded-xl bg-[var(--brand-primary-soft)] px-4 py-3">
                                            <div>
                                                <p className="font-medium">{selectedClient?.name}</p>
                                                {selectedClient?.document && (
                                                    <p className="text-sm text-muted-foreground">{selectedClient.document}</p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setClientId('')}
                                                aria-label="Cambiar cliente"
                                                className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-background/60 hover:text-foreground sm:size-9"
                                            >
                                                <X className="size-4" aria-hidden="true" />
                                            </button>
                                        </div>
                                    )}
                                </section>

                                <section className="space-y-3 rounded-2xl border border-border/60 bg-card p-5">
                                    <h2 className="text-base font-semibold">Productos</h2>
                                    <div className="relative">
                                        <Search
                                            className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                        <input
                                            placeholder="Buscar producto por nombre o código..."
                                            value={productSearch}
                                            onChange={(e) => setProductSearch(e.target.value)}
                                            className={cn(INPUT_CLASS, 'pl-10')}
                                        />
                                    </div>
                                    {productSearch && (
                                        <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border/60 p-2">
                                            {filteredProducts.length === 0 ? (
                                                <p className="py-4 text-center text-sm text-muted-foreground">No se encontraron productos</p>
                                            ) : (
                                                filteredProducts.map((p) => {
                                                    const inCart = cart.find((item) => item.product.id === p.id);
                                                    const outOfStock = hasStockLimit(p) && p.available_stock < 1;
                                                    return (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            disabled={outOfStock}
                                                            onClick={() => {
                                                                addToCart(p);
                                                                setProductSearch('');
                                                            }}
                                                            className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                                                        >
                                                            <Package className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                                            <span className="min-w-0 flex-1 truncate">{p.name}</span>
                                                            <span className="text-muted-foreground tabular-nums">{cop(p.sale_price)}</span>
                                                            {p.type !== 'servicio' && (
                                                                <span className="rounded-full border border-border/60 px-2 py-0.5 text-xs">
                                                                    {outOfStock ? 'Sin stock' : `Disp: ${p.available_stock}`}
                                                                </span>
                                                            )}
                                                            {inCart && (
                                                                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-white">
                                                                    En carrito
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}

                                    {cart.length > 0 && (
                                        <div className="space-y-2 pt-2">
                                            <div className="overflow-hidden rounded-xl border border-border/60">
                                                <div className="hidden grid-cols-[1fr_120px_110px_110px_40px] gap-2 bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground md:grid">
                                                    <span>Producto</span>
                                                    <span className="text-center">Cant.</span>
                                                    <span className="text-right">Precio</span>
                                                    <span className="text-right">Subtotal</span>
                                                    <span />
                                                </div>
                                                {cart.map((item) => (
                                                    <div
                                                        key={item.product.id}
                                                        className="border-t border-border/60 px-3 py-3 first:border-t-0 md:first:border-t"
                                                    >
                                                        <div className="flex items-center justify-between gap-2 md:hidden">
                                                            <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.product.name}</span>
                                                            <span className="shrink-0 text-sm font-semibold tabular-nums">{cop(item.subtotal)}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeFromCart(item.product.id)}
                                                                aria-label={`Quitar ${item.product.name}`}
                                                                className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600"
                                                            >
                                                                <X className="size-4" aria-hidden="true" />
                                                            </button>
                                                        </div>
                                                        <div className="mt-1 flex items-center gap-2 md:hidden">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                value={item.quantity}
                                                                onChange={(e) => updateCartItem(item.product.id, parseInt(e.target.value) || 0)}
                                                                aria-label={`Cantidad de ${item.product.name}`}
                                                                className="h-11 w-20 rounded-lg border border-border/60 bg-background text-center text-base font-semibold"
                                                            />
                                                            {item.product.variable_price ? (
                                                                <CurrencyInput
                                                                    value={item.unit_price}
                                                                    onChange={(v) => updateCartPrice(item.product.id, v)}
                                                                    className="h-11 flex-1 text-right text-base"
                                                                />
                                                            ) : (
                                                                <span className="flex-1 text-right text-sm text-muted-foreground">
                                                                    {cop(item.unit_price)} c/u
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="hidden grid-cols-[1fr_120px_110px_110px_40px] items-center gap-2 md:grid">
                                                            <span className="truncate text-sm font-medium">{item.product.name}</span>
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    aria-label={`Menos ${item.product.name}`}
                                                                    onClick={() => updateCartItem(item.product.id, item.quantity - 1)}
                                                                    className="flex size-8 items-center justify-center rounded-md border border-border/60 hover:bg-muted"
                                                                >
                                                                    <Minus className="size-3" aria-hidden="true" />
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    value={item.quantity}
                                                                    onChange={(e) => updateCartItem(item.product.id, parseInt(e.target.value) || 0)}
                                                                    aria-label={`Cantidad de ${item.product.name}`}
                                                                    className="h-8 w-12 rounded-md border border-border/60 bg-background text-center text-sm font-semibold [&::-webkit-inner-spin-button]:appearance-none"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    aria-label={`Más ${item.product.name}`}
                                                                    onClick={() => updateCartItem(item.product.id, item.quantity + 1)}
                                                                    className="flex size-8 items-center justify-center rounded-md border border-border/60 hover:bg-muted"
                                                                >
                                                                    <Plus className="size-3" aria-hidden="true" />
                                                                </button>
                                                            </div>
                                                            {item.product.variable_price ? (
                                                                <CurrencyInput
                                                                    value={item.unit_price}
                                                                    onChange={(v) => updateCartPrice(item.product.id, v)}
                                                                    className="h-8 text-right text-sm"
                                                                />
                                                            ) : (
                                                                <span className="text-right text-sm tabular-nums">{cop(item.unit_price)}</span>
                                                            )}
                                                            <span className="text-right text-sm font-semibold tabular-nums">
                                                                {cop(item.subtotal)}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeFromCart(item.product.id)}
                                                                aria-label={`Quitar ${item.product.name}`}
                                                                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600"
                                                            >
                                                                <X className="size-4" aria-hidden="true" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-end px-1">
                                                <span className="text-lg font-bold tabular-nums">Total: {cop(cartTotal)}</span>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            </div>
                        )}

                        {/* ═══ STEP 1: Type + Conditions ═══ */}
                        {step === 1 && (
                            <div className="flex flex-col gap-5">
                                <div>
                                    <h2 className="mb-3 text-base font-semibold">Modalidad del crédito</h2>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {(Object.entries(TYPE_CONFIG) as [CreditType, (typeof TYPE_CONFIG)[CreditType]][]).map(([key, cfg]) => {
                                            const Icon = cfg.icon;
                                            const selected = creditType === key;
                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => {
                                                        setCreditType(key);
                                                        if (key === 'installments') {
                                                            const d = new Date();
                                                            d.setMonth(d.getMonth() + installmentsCount);
                                                            setDueDate(format(d, 'yyyy-MM-dd'));
                                                        } else if (key !== 'due_date') {
                                                            setDueDate('');
                                                        }
                                                    }}
                                                    aria-pressed={selected}
                                                    className={cn(
                                                        'rounded-2xl border-2 p-4 text-left transition-colors',
                                                        selected
                                                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)]'
                                                            : 'border-border/60 bg-card hover:bg-muted/50',
                                                    )}
                                                >
                                                    <div className="mb-1 flex items-center gap-2">
                                                        <Icon
                                                            className={cn('size-5', selected && 'text-[var(--brand-primary)]')}
                                                            aria-hidden="true"
                                                        />
                                                        <span className="font-semibold">{cfg.label}</span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{cfg.description}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {creditType && (
                                    <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-5">
                                        <h2 className="text-base font-semibold">Condiciones</h2>

                                        {creditType === 'installments' && (
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-medium">Número de cuotas</label>
                                                <Select
                                                    value={String(installmentsCount)}
                                                    onValueChange={(v) => {
                                                        const n = parseInt(v);
                                                        setInstallmentsCount(n);
                                                        const d = new Date();
                                                        d.setMonth(d.getMonth() + n);
                                                        setDueDate(format(d, 'yyyy-MM-dd'));
                                                    }}
                                                >
                                                    <SelectTrigger className="h-11 w-full text-base sm:h-10 sm:text-sm">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {[1, 2, 3, 4, 5, 6, 8, 10, 12, 18, 24].map((n) => (
                                                            <SelectItem key={n} value={String(n)}>
                                                                {n} {n === 1 ? 'cuota' : 'cuotas'} — {cop(Math.round(cartTotal / n))} c/u
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        {(creditType === 'due_date' || creditType === 'installments') && (
                                            <div className="space-y-1.5">
                                                <label htmlFor="credit-due-date" className="text-sm font-medium">
                                                    {creditType === 'installments' ? 'Fecha de última cuota' : 'Fecha límite de pago'}
                                                </label>
                                                <input
                                                    id="credit-due-date"
                                                    type="date"
                                                    value={dueDate}
                                                    min={format(new Date(), 'yyyy-MM-dd')}
                                                    onChange={(e) => setDueDate(e.target.value)}
                                                    className={INPUT_CLASS}
                                                />
                                            </div>
                                        )}

                                        {creditType !== 'hold' && (
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-medium">Abono inicial (opcional)</label>
                                                <CurrencyInput value={initialPayment} onChange={setInitialPayment} className={INPUT_CLASS} />
                                                {initialPayment > 0 && (
                                                    <div className="space-y-1.5 pt-1">
                                                        <label className="text-sm font-medium">Método de pago del abono</label>
                                                        <PaymentMethodSelect
                                                            value={initialPaymentMethod}
                                                            onValueChange={setInitialPaymentMethod}
                                                            triggerClassName="h-11 text-base sm:h-9 sm:text-sm"
                                                        />
                                                    </div>
                                                )}
                                                {initialPayment > cartTotal && (
                                                    <p className="text-sm text-red-500">El abono no puede superar el total ({cop(cartTotal)})</p>
                                                )}
                                            </div>
                                        )}

                                        <div className="space-y-1.5">
                                            <label htmlFor="credit-notes" className="text-sm font-medium">
                                                Notas (opcional)
                                            </label>
                                            <textarea
                                                id="credit-notes"
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                placeholder="Observaciones sobre el crédito..."
                                                rows={2}
                                                className="w-full rounded-lg border border-border/60 bg-background p-3 text-base focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none sm:text-sm"
                                            />
                                        </div>
                                    </section>
                                )}
                            </div>
                        )}

                        {/* ═══ STEP 2: Confirmation ═══ */}
                        {step === 2 && creditType && (
                            <div className="rounded-2xl border border-border/60 bg-card p-5">
                                <div className="space-y-4">
                                    <h2 className="text-lg font-bold">Resumen del crédito</h2>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Cliente</p>
                                            <p className="font-medium">{selectedClient?.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Modalidad</p>
                                            <p className="font-medium">{TYPE_CONFIG[creditType].label}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total</p>
                                            <p className="text-xl font-bold">{cop(cartTotal)}</p>
                                        </div>
                                        {initialPayment > 0 && (
                                            <div>
                                                <p className="text-sm text-muted-foreground">Abono inicial</p>
                                                <p className="font-medium text-emerald-600">{cop(initialPayment)}</p>
                                            </div>
                                        )}
                                        {initialPayment > 0 && (
                                            <div>
                                                <p className="text-sm text-muted-foreground">Saldo restante</p>
                                                <p className="font-medium text-orange-600">{cop(cartTotal - initialPayment)}</p>
                                            </div>
                                        )}
                                        {creditType === 'installments' && (
                                            <div>
                                                <p className="text-sm text-muted-foreground">Cuotas</p>
                                                <p className="font-medium">
                                                    {installmentsCount} x {cop(Math.round((cartTotal - initialPayment) / installmentsCount))}
                                                </p>
                                            </div>
                                        )}
                                        {dueDate && (
                                            <div>
                                                <p className="text-sm text-muted-foreground">Fecha límite</p>
                                                <p className="font-medium">{format(new Date(dueDate + 'T12:00:00'), 'dd/MM/yyyy')}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="overflow-hidden rounded-xl border border-border/60">
                                        <div className="bg-muted/50 px-3 py-2 text-sm font-medium">
                                            {cart.length} producto{cart.length !== 1 ? 's' : ''}
                                        </div>
                                        {cart.map((item) => (
                                            <div
                                                key={item.product.id}
                                                className="flex items-center justify-between border-t border-border/60 px-3 py-2 text-sm"
                                            >
                                                <span>
                                                    {item.product.name} <span className="text-muted-foreground">x{item.quantity}</span>
                                                </span>
                                                <span className="font-medium tabular-nums">{cop(item.subtotal)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {(creditType === 'layaway' || creditType === 'hold') && (
                                        <div className="rounded-xl bg-muted p-3 text-sm">
                                            <p className="font-medium">Los productos quedarán reservados</p>
                                            <p className="text-muted-foreground">
                                                No se descontarán del inventario hasta que el cliente complete el pago.
                                            </p>
                                        </div>
                                    )}
                                    {(creditType === 'installments' || creditType === 'due_date') && (
                                        <div className="rounded-xl bg-muted p-3 text-sm">
                                            <p className="font-medium">Los productos se entregarán de inmediato</p>
                                            <p className="text-muted-foreground">Se creará una venta y el inventario se descontará ahora mismo.</p>
                                        </div>
                                    )}

                                    {notes && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Notas</p>
                                            <p className="text-sm">{notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 flex items-center justify-between gap-3 border-t border-border/60 bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:z-auto lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
                            <button
                                type="button"
                                onClick={() => (step === 0 ? router.visit('/credits') : setStep(step - 1))}
                                disabled={submitting}
                                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border/60 bg-card px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50 sm:h-10"
                            >
                                <ArrowLeft className="size-4" aria-hidden="true" />
                                {step === 0 ? 'Cancelar' : 'Atrás'}
                            </button>

                            {step < 2 ? (
                                <button
                                    type="button"
                                    onClick={() => setStep(step + 1)}
                                    disabled={!canNext()}
                                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 sm:h-10"
                                    style={{ color: onBrand.hex }}
                                >
                                    Siguiente
                                    <ArrowRight className="size-4" aria-hidden="true" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={submitting || !canNext()}
                                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 sm:h-10"
                                >
                                    {submitting ? 'Registrando...' : 'Confirmar crédito'}
                                    <Check className="size-4" aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Live summary: always in view on wide screens so the total and the plan are never out of sight */}
                    <aside
                        aria-label="Resumen en vivo"
                        className="hidden rounded-2xl border border-border/60 bg-card p-5 lg:sticky lg:top-4 lg:block"
                    >
                        <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Tu crédito</h2>
                        <dl className="space-y-3 text-sm">
                            <div className="flex justify-between gap-3">
                                <dt className="text-muted-foreground">Cliente</dt>
                                <dd className="min-w-0 truncate text-right font-medium">{selectedClient?.name ?? 'Sin elegir'}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-muted-foreground">Productos</dt>
                                <dd className="font-medium tabular-nums">{cart.length === 0 ? 'Ninguno' : `${cart.length} · ${unitCount} uds`}</dd>
                            </div>
                            {creditType && (
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted-foreground">Modalidad</dt>
                                    <dd className="font-medium">{TYPE_CONFIG[creditType].label}</dd>
                                </div>
                            )}
                            <div className="border-t border-border/60 pt-3">
                                <div className="flex items-baseline justify-between gap-3">
                                    <dt className="text-muted-foreground">Total del crédito</dt>
                                    <dd className="text-2xl font-bold tracking-tight tabular-nums">
                                        <RollingNumber value={cartTotal} format={cop} />
                                    </dd>
                                </div>
                            </div>
                            {initialPayment > 0 && (
                                <>
                                    <div className="flex justify-between gap-3 text-emerald-700 dark:text-emerald-400">
                                        <dt>Con abono de</dt>
                                        <dd className="font-medium tabular-nums">{cop(initialPayment)}</dd>
                                    </div>
                                    <div className="flex justify-between gap-3 text-orange-700 dark:text-orange-400">
                                        <dt>Quedaría un saldo de</dt>
                                        <dd className="font-medium tabular-nums">{cop(Math.max(0, cartTotal - initialPayment))}</dd>
                                    </div>
                                </>
                            )}
                        </dl>
                        <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                            <HandCoins className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                            Se actualiza mientras eliges. Nada se guarda hasta confirmar el último paso.
                        </p>
                    </aside>
                </div>
            </div>
        </AppLayout>
    );
}
