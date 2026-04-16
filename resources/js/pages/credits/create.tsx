import PaymentMethodSelect from '@/components/PaymentMethodSelect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Client } from '@/types';
import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { ArrowLeft, ArrowRight, Calendar, Check, Clock, HandCoins, Layers, Package, Search, ShoppingBag, X } from 'lucide-react';
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
    return `$ ${Number(value).toLocaleString('es-CO')}`;
}

const TYPE_CONFIG: Record<CreditType, { label: string; description: string; icon: typeof HandCoins; color: string }> = {
    layaway: {
        label: 'Separado',
        description: 'El cliente aparta con un abono. El producto se entrega al completar el pago.',
        icon: ShoppingBag,
        color: 'border-blue-500 bg-blue-50 dark:bg-blue-950',
    },
    installments: {
        label: 'Cuotas',
        description: 'El producto se entrega de inmediato. El cliente paga en cuotas mensuales.',
        icon: Layers,
        color: 'border-purple-500 bg-purple-50 dark:bg-purple-950',
    },
    due_date: {
        label: 'Fecha acordada',
        description: 'El producto se entrega de inmediato. El cliente paga en una fecha acordada.',
        icon: Calendar,
        color: 'border-amber-500 bg-amber-50 dark:bg-amber-950',
    },
    hold: {
        label: 'Reservado',
        description: 'Solo se reserva. Sin abono. El cliente regresa a pagar y recoger.',
        icon: Clock,
        color: 'border-gray-500 bg-gray-50 dark:bg-gray-950',
    },
};

// ─── Step components ────────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex items-center gap-2">
            {Array.from({ length: total }, (_, i) => (
                <div key={i} className="flex items-center gap-2">
                    <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                            i < current
                                ? 'bg-green-500 text-white'
                                : i === current
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground'
                        }`}
                    >
                        {i < current ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    {i < total - 1 && <div className={`h-0.5 w-8 ${i < current ? 'bg-green-500' : 'bg-muted'}`} />}
                </div>
            ))}
        </div>
    );
}

export default function CreditCreate({ clients, products, branchId }: Props) {
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
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
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
                prev.map((item) => (item.product.id === productId ? { ...item, quantity, subtotal: quantity * item.unit_price } : item)),
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
            if (creditType === 'installments' && (!installmentsCount || installmentsCount < 2)) return false;
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo crédito" />

            <div className="mx-auto w-full max-w-4xl space-y-6 p-4 lg:p-6">
                {/* Header with stepper */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold tracking-tight">Nuevo crédito</h1>
                    <StepIndicator current={step} total={3} />
                </div>

                {/* ═══ STEP 0: Client + Products ═══ */}
                {step === 0 && (
                    <div className="space-y-6">
                        {/* Client selection */}
                        <Card>
                            <CardContent className="space-y-3 pt-6">
                                <Label className="text-base font-semibold">Cliente</Label>
                                <Input
                                    placeholder="Buscar cliente por nombre o documento..."
                                    value={clientSearch}
                                    onChange={(e) => setClientSearch(e.target.value)}
                                    className="mb-2"
                                />
                                {!clientId ? (
                                    <div className="max-h-40 space-y-1 overflow-y-auto">
                                        {filteredClients.map((c) => (
                                            <button
                                                key={c.id}
                                                onClick={() => {
                                                    setClientId(String(c.id));
                                                    setClientSearch('');
                                                }}
                                                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                                            >
                                                <span className="font-medium">{c.name}</span>
                                                {c.document && <span className="text-muted-foreground">{c.document}</span>}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between rounded-md bg-muted px-4 py-3">
                                        <div>
                                            <p className="font-medium">{selectedClient?.name}</p>
                                            {selectedClient?.document && <p className="text-sm text-muted-foreground">{selectedClient.document}</p>}
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => setClientId('')}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Product search + add */}
                        <Card>
                            <CardContent className="space-y-3 pt-6">
                                <Label className="text-base font-semibold">Productos</Label>
                                <div className="relative">
                                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar producto por nombre o código..."
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                {productSearch && (
                                    <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                                        {filteredProducts.length === 0 ? (
                                            <p className="py-4 text-center text-sm text-muted-foreground">No se encontraron productos</p>
                                        ) : (
                                            filteredProducts.map((p) => {
                                                const inCart = cart.find((item) => item.product.id === p.id);
                                                return (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => {
                                                            addToCart(p);
                                                            setProductSearch('');
                                                        }}
                                                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                                                    >
                                                        <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                        <span className="min-w-0 flex-1 truncate">{p.name}</span>
                                                        <span className="text-muted-foreground">{cop(p.sale_price)}</span>
                                                        {p.type !== 'servicio' && (
                                                            <Badge variant="outline" className="text-xs">
                                                                Disp: {p.available_stock}
                                                            </Badge>
                                                        )}
                                                        {inCart && <Badge className="bg-green-600 text-xs">En carrito</Badge>}
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                )}

                                {/* Cart */}
                                {cart.length > 0 && (
                                    <div className="space-y-2 pt-2">
                                        <div className="rounded-md border">
                                            {/* Header — desktop only */}
                                            <div className="hidden grid-cols-[1fr_80px_100px_100px_40px] gap-2 bg-muted/50 px-3 py-2 text-xs font-medium md:grid">
                                                <span>Producto</span>
                                                <span className="text-center">Cant.</span>
                                                <span className="text-right">Precio</span>
                                                <span className="text-right">Subtotal</span>
                                                <span />
                                            </div>
                                            {cart.map((item) => (
                                                <div key={item.product.id} className="border-t px-3 py-2">
                                                    {/* Mobile layout */}
                                                    <div className="flex items-center justify-between gap-2 md:hidden">
                                                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.product.name}</span>
                                                        <span className="flex-shrink-0 text-sm font-semibold">{cop(item.subtotal)}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 flex-shrink-0 p-0"
                                                            onClick={() => removeFromCart(item.product.id)}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                    <div className="mt-1 flex items-center gap-2 md:hidden">
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            value={item.quantity}
                                                            onChange={(e) => updateCartItem(item.product.id, parseInt(e.target.value) || 0)}
                                                            className="h-8 w-20 text-center text-sm"
                                                        />
                                                        {item.product.variable_price ? (
                                                            <CurrencyInput
                                                                value={item.unit_price}
                                                                onChange={(v) => updateCartPrice(item.product.id, v)}
                                                                className="h-8 flex-1 text-right text-sm"
                                                            />
                                                        ) : (
                                                            <span className="flex-1 text-right text-sm text-muted-foreground">
                                                                {cop(item.unit_price)} c/u
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Desktop layout */}
                                                    <div className="hidden grid-cols-[1fr_80px_100px_100px_40px] items-center gap-2 md:grid">
                                                        <span className="truncate text-sm">{item.product.name}</span>
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            value={item.quantity}
                                                            onChange={(e) => updateCartItem(item.product.id, parseInt(e.target.value) || 0)}
                                                            className="h-8 text-center text-sm"
                                                        />
                                                        {item.product.variable_price ? (
                                                            <CurrencyInput
                                                                value={item.unit_price}
                                                                onChange={(v) => updateCartPrice(item.product.id, v)}
                                                                className="h-8 text-right text-sm"
                                                            />
                                                        ) : (
                                                            <span className="text-right text-sm">{cop(item.unit_price)}</span>
                                                        )}
                                                        <span className="text-right text-sm font-medium">{cop(item.subtotal)}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            onClick={() => removeFromCart(item.product.id)}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-end px-3">
                                            <span className="text-lg font-bold">Total: {cop(cartTotal)}</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* ═══ STEP 1: Type + Conditions ═══ */}
                {step === 1 && (
                    <div className="space-y-6">
                        {/* Type selection */}
                        <div>
                            <Label className="mb-3 block text-base font-semibold">Modalidad del crédito</Label>
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
                                            className={`rounded-lg border-2 p-4 text-left transition-all ${selected ? cfg.color : 'border-transparent hover:border-muted-foreground/20'}`}
                                        >
                                            <div className="mb-1 flex items-center gap-2">
                                                <Icon className="h-5 w-5" />
                                                <span className="font-semibold">{cfg.label}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{cfg.description}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Conditions */}
                        {creditType && (
                            <Card>
                                <CardContent className="space-y-4 pt-6">
                                    <Label className="text-base font-semibold">Condiciones</Label>

                                    {creditType === 'installments' && (
                                        <div className="space-y-2">
                                            <Label>Número de cuotas</Label>
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
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {[2, 3, 4, 5, 6, 8, 10, 12, 18, 24].map((n) => (
                                                        <SelectItem key={n} value={String(n)}>
                                                            {n} cuotas — {cop(Math.round(cartTotal / n))} c/u
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {(creditType === 'due_date' || creditType === 'installments') && (
                                        <div className="space-y-2">
                                            <Label>{creditType === 'installments' ? 'Fecha de última cuota' : 'Fecha límite de pago'}</Label>
                                            <Input
                                                type="date"
                                                value={dueDate}
                                                min={format(new Date(), 'yyyy-MM-dd')}
                                                onChange={(e) => setDueDate(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    {creditType !== 'hold' && (
                                        <div className="space-y-2">
                                            <Label>Abono inicial (opcional)</Label>
                                            <CurrencyInput value={initialPayment} onChange={setInitialPayment} />
                                            {initialPayment > 0 && (
                                                <div className="space-y-2">
                                                    <Label>Método de pago del abono</Label>
                                                    <PaymentMethodSelect value={initialPaymentMethod} onValueChange={setInitialPaymentMethod} />
                                                </div>
                                            )}
                                            {initialPayment > cartTotal && (
                                                <p className="text-sm text-red-500">El abono no puede superar el total ({cop(cartTotal)})</p>
                                            )}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label>Notas (opcional)</Label>
                                        <Textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Observaciones sobre el crédito..."
                                            rows={2}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* ═══ STEP 2: Confirmation ═══ */}
                {step === 2 && creditType && (
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="space-y-4 pt-6">
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
                                            <p className="font-medium text-green-600">{cop(initialPayment)}</p>
                                        </div>
                                    )}
                                    {initialPayment > 0 && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Saldo restante</p>
                                            <p className="font-medium text-orange-500">{cop(cartTotal - initialPayment)}</p>
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

                                {/* Products summary */}
                                <div className="rounded-md border">
                                    <div className="bg-muted/50 px-3 py-2 text-sm font-medium">
                                        {cart.length} producto{cart.length !== 1 ? 's' : ''}
                                    </div>
                                    {cart.map((item) => (
                                        <div key={item.product.id} className="flex items-center justify-between border-t px-3 py-2 text-sm">
                                            <span>
                                                {item.product.name} <span className="text-muted-foreground">x{item.quantity}</span>
                                            </span>
                                            <span className="font-medium">{cop(item.subtotal)}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Warning for deferred types */}
                                {(creditType === 'layaway' || creditType === 'hold') && (
                                    <div className="rounded-md bg-muted p-3 text-sm">
                                        <p className="font-medium">Los productos quedarán reservados</p>
                                        <p className="text-muted-foreground">
                                            No se descontarán del inventario hasta que el cliente complete el pago.
                                        </p>
                                    </div>
                                )}
                                {(creditType === 'installments' || creditType === 'due_date') && (
                                    <div className="rounded-md bg-muted p-3 text-sm">
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
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Navigation buttons */}
                <div className="flex items-center justify-between pt-2">
                    <Button variant="outline" onClick={() => (step === 0 ? router.visit('/credits') : setStep(step - 1))} disabled={submitting}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {step === 0 ? 'Cancelar' : 'Atrás'}
                    </Button>

                    {step < 2 ? (
                        <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
                            Siguiente
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={submitting || !canNext()} className="bg-green-600 hover:bg-green-700">
                            {submitting ? 'Registrando...' : 'Confirmar crédito'}
                            <Check className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
