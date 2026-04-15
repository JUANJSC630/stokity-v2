import PaymentMethodSelect from '@/components/PaymentMethodSelect';
import { Badge } from '@/components/ui/badge';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePrinter } from '@/hooks/use-printer';
import { useSound } from '@/hooks/use-sound';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem, type CashSession, type Client, type SharedData } from '@/types';
import type { Product } from '@/types/product';
import { Head, router, usePage } from '@inertiajs/react';
import {
    ArrowDownCircle,
    ArrowUpCircle,
    ClipboardList,
    DoorOpen,
    HandCoins,
    Keyboard,
    Minus,
    Plus,
    Printer,
    Search,
    ShoppingCart,
    Trash2,
    Wifi,
    WifiOff,
    X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface Category {
    id: number;
    name: string;
}

interface Props {
    branches: Branch[];
    clients: Client[];
    categories: Category[];
    pendingSalesCount: number;
    currentSession: CashSession | null;
    requireCashSession: boolean;
}

interface PendingProduct {
    product_id: number;
    product_name: string;
    quantity: number;
    price: number;
    subtotal: number;
    tax: number;
    stock: number;
    image_url: string | null;
}

interface PendingSale {
    id: number;
    code: string;
    client_id: string;
    client_name: string;
    discount_type: 'none' | 'percentage' | 'fixed';
    discount_value: number;
    product_count: number;
    net: number;
    total: number;
    notes: string | null;
    created_at: string;
    products: PendingProduct[];
}

interface CartItem {
    product: Product;
    quantity: number;
    subtotal: number;
}

function formatCOP(value: number | string) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '$0';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(num);
}

function formatNumber(value: number) {
    return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'POS', href: '/pos' }];

// ─── Cash session widget (header) ────────────────────────────────────────────
function CashSessionWidget({
    session,
    requireCashSession,
    onOpen,
    onMovement,
}: {
    session: CashSession | null;
    requireCashSession: boolean;
    onOpen: () => void;
    onMovement: (type: 'cash_in' | 'cash_out') => void;
}) {
    const [open, setOpen] = React.useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    const openTime = session ? new Date(session.opened_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : null;

    if (!session) {
        return (
            <button
                type="button"
                onClick={onOpen}
                className="flex h-8 items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-2.5 py-0.5 text-[11px] font-medium text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
            >
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                {requireCashSession ? 'Abrir caja' : 'Caja cerrada'}
            </button>
        );
    }

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex h-8 items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300"
            >
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Caja · {openTime}
            </button>

            {open && (
                <div className="absolute top-full right-0 z-50 mt-1 w-52 rounded-xl border border-neutral-200 bg-white py-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
                    <button
                        type="button"
                        onClick={() => {
                            onMovement('cash_in');
                            setOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    >
                        <ArrowDownCircle className="h-4 w-4 text-green-600" />
                        Ingreso de efectivo
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onMovement('cash_out');
                            setOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    >
                        <ArrowUpCircle className="h-4 w-4 text-red-500" />
                        Egreso de efectivo
                    </button>
                    <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                    <button
                        type="button"
                        onClick={() => {
                            router.visit(route('cash-sessions.close.form', session.id));
                            setOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                        <DoorOpen className="h-4 w-4" />
                        Cerrar caja
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Printer status indicator ────────────────────────────────────────────────
function PrinterStatusBadge({ status, selectedPrinter, onConnect }: { status: string; selectedPrinter: string; onConnect: () => void }) {
    if (status === 'connected' && selectedPrinter) {
        return (
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                <Wifi className="h-3 w-3" />
                {selectedPrinter.length > 12 ? selectedPrinter.slice(0, 10) + '…' : selectedPrinter}
            </span>
        );
    }
    if (status === 'connecting') {
        return (
            <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                <Printer className="h-3 w-3 animate-pulse" />
                Conectando…
            </span>
        );
    }
    if (status === 'unavailable') {
        return (
            <button
                type="button"
                onClick={onConnect}
                className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
            >
                <WifiOff className="h-3 w-3" />
                Sin impresora
            </button>
        );
    }
    return null;
}

// ─── Printer widget (header) ─────────────────────────────────────────────────
function PrinterWidget({ printer }: { printer: ReturnType<typeof import('@/hooks/use-printer').usePrinter> }) {
    const [open, setOpen] = React.useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button type="button" onClick={() => setOpen((v) => !v)} className="flex h-8 items-center" title="Configurar impresora">
                <PrinterStatusBadge status={printer.status} selectedPrinter={printer.selectedPrinter} onConnect={printer.connect} />
            </button>

            {open && (
                <div className="absolute top-full right-0 z-50 mt-1 w-72 rounded-xl border border-neutral-200 bg-white p-3 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">Impresora</p>

                    {printer.status === 'unavailable' && (
                        <div className="mb-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                            QZ Tray no detectado.{' '}
                            <a href="https://qz.io/download/" target="_blank" rel="noreferrer" className="underline">
                                Descargar
                            </a>
                        </div>
                    )}

                    {printer.printers.length > 0 && (
                        <Select value={printer.selectedPrinter} onValueChange={printer.setSelectedPrinter}>
                            <SelectTrigger className="h-8 w-full text-xs">
                                <SelectValue placeholder="Selecciona impresora…" />
                            </SelectTrigger>
                            <SelectContent>
                                {printer.printers.map((name) => (
                                    <SelectItem key={name} value={name} className="text-xs">
                                        {name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                            Ancho del papel:{' '}
                            <a href="/settings/ticket" className="font-medium text-blue-600 underline dark:text-blue-400">
                                Configurar
                            </a>
                        </p>
                        <button type="button" onClick={() => printer.connect()} className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                            Reconectar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PosIndex({
    branches,
    clients,
    categories,
    pendingSalesCount: initialPendingCount,
    currentSession: initialSession,
    requireCashSession,
}: Props) {
    const { auth } = usePage<SharedData>().props;

    const sortedClients = [...clients].sort((a, b) => b.id - a.id);
    const anonymous = sortedClients.find((c) => c.name.toLowerCase() === 'consumidor final');
    const defaultClientId = anonymous ? String(anonymous.id) : sortedClients[0] ? String(sortedClients[0].id) : '';
    const defaultBranchId = auth.user.branch_id ? String(auth.user.branch_id) : branches[0] ? String(branches[0].id) : '';

    // --- State ---
    const [cart, setCart] = useState<CartItem[]>([]);
    const [clientId, setClientId] = useState(defaultClientId);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
    const [discountValue, setDiscountValue] = useState('0');
    const [amountPaidDisplay, setAmountPaidDisplay] = useState('');
    const [amountPaid, setAmountPaid] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [formKey, setFormKey] = useState(0);

    // Pending sales (cotizaciones)
    const [pendingCount, setPendingCount] = useState(initialPendingCount);
    const [showPendingPanel, setShowPendingPanel] = useState(false);
    const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
    const [loadingPending, setLoadingPending] = useState(false);
    const [activePendingId, setActivePendingId] = useState<number | null>(null); // pending sale being completed

    // Search
    const [query, setQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedType, setSelectedType] = useState<'servicio' | ''>('');
    const [results, setResults] = useState<Product[]>([]);
    const [searching, setSearching] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Credit mini-modal
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [creditType, setCreditType] = useState<'layaway' | 'installments' | 'due_date' | 'hold'>('layaway');
    const [creditInstallments, setCreditInstallments] = useState(3);
    const [creditDueDate, setCreditDueDate] = useState('');
    const [creditInitialPayment, setCreditInitialPayment] = useState(0);
    const [creditInitialMethod, setCreditInitialMethod] = useState('efectivo');
    const [creditNotes, setCreditNotes] = useState('');

    // Cash session
    const [currentSession, setCurrentSession] = useState<CashSession | null>(initialSession);
    const [showOpenSessionModal, setShowOpenSessionModal] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [openingAmount, setOpeningAmount] = useState('');
    const [openingNotes, setOpeningNotes] = useState('');
    const [submittingSession, setSubmittingSession] = useState(false);
    // Cash movements modal
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [movementType, setMovementType] = useState<'cash_in' | 'cash_out'>('cash_in');
    const [movementAmount, setMovementAmount] = useState('');
    const [movementConcept, setMovementConcept] = useState('');
    const [movementNotes, setMovementNotes] = useState('');

    // Variable-price service modal
    const [varPriceProduct, setVarPriceProduct] = useState<Product | null>(null);
    const [varPriceValue, setVarPriceValue] = useState(0);

    // Mobile tab navigation (search | cart) — desktop shows both panels simultaneously
    const [mobileTab, setMobileTab] = useState<'search' | 'cart'>('search');

    // Printer
    const printer = usePrinter();
    const { play: playSound } = useSound();

    // Track the last sale ID we've already printed to avoid double-printing
    const lastPrintedSaleId = useRef<number | null>(null);

    // --- Totals ---
    const net = cart.reduce((s, i) => s + i.subtotal, 0);
    const tax = cart.reduce((s, i) => s + i.subtotal * ((i.product.tax || 0) / 100), 0);
    const gross = net + tax;
    const dVal = parseFloat(discountValue) || 0;
    const discountAmount =
        discountType === 'percentage' ? Math.round(gross * (dVal / 100) * 100) / 100 : discountType === 'fixed' ? Math.min(dVal, gross) : 0;
    const total = Math.max(0, gross - discountAmount);
    const change = Math.max(0, amountPaid - total);

    // Ref to printer so we can access it inside router.post callbacks without stale closures
    const printerRef = useRef(printer);
    printerRef.current = printer;

    // Fallback: print when printer finishes connecting after a page reload (Inertia 409 hard-reload case).
    // The onSuccess path handles the fast case; this handles the reload case.
    const { flash } = usePage<SharedData>().props;
    useEffect(() => {
        const saleId = flash?.last_sale_id;
        if (!saleId || saleId === lastPrintedSaleId.current) return;
        if (!printer.autoPrint || printer.status !== 'connected' || !printer.selectedPrinter) return;

        lastPrintedSaleId.current = saleId;
        printerRef.current.printReceipt(saleId).catch((err: Error) => {
            toast.error('Error al imprimir: ' + err.message);
        });
        // Run whenever printer connects OR a new sale flash arrives
    }, [flash?.last_sale_id, printer.autoPrint, printer.status, printer.selectedPrinter]);

    // --- Product search ---
    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        const hasFilter = selectedType !== '' || selectedCategory !== '';
        if (!query || query.trim().length < 1) {
            if (!hasFilter) {
                setResults([]);
                return;
            }
        }
        setSearching(true);
        searchTimeout.current = setTimeout(async () => {
            if (abortRef.current) abortRef.current.abort();
            abortRef.current = new AbortController();
            try {
                const params: Record<string, string> = { q: query || '' };
                if (selectedCategory) params.category_id = selectedCategory;
                if (selectedType) params.type = selectedType;
                const res = await fetch(route('api.products.search') + '?' + new URLSearchParams(params), {
                    signal: abortRef.current.signal,
                });
                if (res.ok) setResults(await res.json());
            } catch (e) {
                if ((e as Error).name !== 'AbortError') console.error(e);
            } finally {
                setSearching(false);
            }
        }, 250);
    }, [query, selectedCategory, selectedType]);

    // --- Cart helpers ---
    const addToCartWithPrice = useCallback(
        (product: Product, qty = 1, overridePrice?: number) => {
            const price = overridePrice ?? product.sale_price;
            setCart((prev) => {
                const idx = prev.findIndex((i) => i.product.id === product.id);
                if (idx !== -1) {
                    const updated = [...prev];
                    const isProduct = product.type !== 'servicio';
                    const newQty = isProduct ? Math.min(updated[idx].quantity + qty, product.stock) : updated[idx].quantity + qty;
                    if (isProduct && newQty === updated[idx].quantity) {
                        playSound('warning');
                        toast.error('Stock máximo alcanzado');
                        return prev;
                    }
                    updated[idx] = { ...updated[idx], quantity: newQty, subtotal: newQty * price };
                    playSound('success');
                    return updated;
                }
                playSound('success');
                return [{ product: { ...product, sale_price: price }, quantity: qty, subtotal: qty * price }, ...prev];
            });
            setQuery('');
            setResults([]);
            setSelectedCategory('');
            setSelectedType('');
            setTimeout(() => searchRef.current?.focus(), 0);
        },
        [playSound],
    );

    const addToCart = useCallback(
        (product: Product, qty = 1) => {
            const isService = product.type === 'servicio';

            if (!isService && product.stock <= 0) {
                playSound('error');
                toast.error('Sin stock disponible');
                return;
            }

            // Services with variable price: show price input modal first
            if (isService && product.variable_price) {
                setVarPriceProduct(product);
                setVarPriceValue(product.sale_price);
                return;
            }

            addToCartWithPrice(product, qty);
        },
        [playSound, addToCartWithPrice],
    );

    const updateQty = (productId: number, qty: number) => {
        setCart((prev) =>
            prev
                .map((i) => (i.product.id === productId ? { ...i, quantity: qty, subtotal: qty * i.product.sale_price } : i))
                .filter((i) => i.quantity > 0),
        );
    };

    const removeFromCart = (productId: number) => setCart((prev) => prev.filter((i) => i.product.id !== productId));

    // --- Cash session handlers ---
    function handleOpenSession(e: React.FormEvent) {
        e.preventDefault();
        setSubmittingSession(true);
        router.post(
            route('cash-sessions.store'),
            { opening_amount: openingAmount || '0', opening_notes: openingNotes },
            {
                onSuccess: (page) => {
                    const props = page.props as unknown as Props;
                    if (props.currentSession) {
                        setCurrentSession(props.currentSession);
                    }
                    setOpeningAmount('');
                    setOpeningNotes('');
                    setShowOpenSessionModal(false);
                },
                onError: (errors) => {
                    Object.values(errors).forEach((msg) => toast.error(String(msg)));
                },
                onFinish: () => setSubmittingSession(false),
            },
        );
    }

    function handleAddMovement(e: React.FormEvent) {
        e.preventDefault();
        if (!currentSession) return;
        setSubmittingSession(true);
        router.post(
            route('cash-sessions.movements.store', currentSession.id),
            { type: movementType, amount: movementAmount, concept: movementConcept, notes: movementNotes },
            {
                onSuccess: () => {
                    setShowMovementModal(false);
                    setMovementAmount('');
                    setMovementConcept('');
                    setMovementNotes('');
                    toast.success(movementType === 'cash_in' ? 'Ingreso registrado' : 'Egreso registrado');
                },
                onError: (errors) => {
                    Object.values(errors).forEach((msg) => toast.error(String(msg)));
                },
                onFinish: () => setSubmittingSession(false),
            },
        );
    }

    // --- Submit ---
    const handleSubmit = useCallback(() => {
        if (cart.length === 0) {
            toast.error('Agrega al menos un producto');
            return;
        }
        if (!paymentMethod) {
            toast.error('Selecciona un método de pago');
            return;
        }
        if (!currentSession && requireCashSession) {
            toast.error('Debes abrir la caja antes de registrar una venta');
            setShowOpenSessionModal(true);
            return;
        }
        if (paymentMethod === 'cash' && amountPaid < total) {
            toast.error('El monto recibido es menor al total');
            return;
        }

        const saleChange = paymentMethod === 'cash' ? change : 0;

        const onSuccess = (page: { props: unknown }) => {
            const pageFlash = (page.props as unknown as SharedData).flash;
            const saleId = pageFlash?.last_sale_id;
            const saleCode = pageFlash?.last_sale_code;

            // Toast with change amount and link to sale
            const lines: string[] = ['¡Venta registrada!'];
            if (saleCode) lines.push(`Código: ${saleCode}`);
            if (saleChange > 0) lines.push(`Cambio: ${formatCOP(saleChange)}`);
            toast.success(
                (t) =>
                    React.createElement(
                        'div',
                        { className: 'text-sm' },
                        React.createElement('p', { className: 'font-semibold' }, '¡Venta registrada!'),
                        saleChange > 0 &&
                            React.createElement('p', { className: 'mt-1 text-base font-bold text-green-700' }, `Cambio: ${formatCOP(saleChange)}`),
                        saleId &&
                            React.createElement(
                                'button',
                                {
                                    onClick: () => {
                                        toast.dismiss(t.id);
                                        router.visit(`/sales/${saleId}`);
                                    },
                                    className: 'mt-1 text-xs text-blue-600 underline hover:text-blue-800',
                                },
                                `Ver venta ${saleCode || ''}`,
                            ),
                    ),
                { duration: saleChange > 0 ? 6000 : 4000 },
            );

            setCart([]);
            setAmountPaid(0);
            setAmountPaidDisplay('');
            setDiscountType('none');
            setDiscountValue('0');
            setPaymentMethod('');
            setClientId(defaultClientId);
            setFormKey((k) => k + 1);
            setActivePendingId(null);
            setPendingCount((c) => Math.max(0, activePendingId ? c - 1 : c));
            setMobileTab('search');
            setTimeout(() => searchRef.current?.focus(), 0);

            // Auto-print si hay impresora conectada y la opción está habilitada
            const p = printerRef.current;
            if (saleId && p.autoPrint && p.status === 'connected' && p.selectedPrinter) {
                lastPrintedSaleId.current = saleId;
                p.printReceipt(saleId).catch((err: Error) => {
                    toast.error('Error al imprimir: ' + err.message);
                });
            }
        };

        const onError = (errors: Record<string, string>) => {
            const messages = Object.values(errors).map(String);
            if (messages.length <= 1) {
                messages.forEach((msg) => toast.error(msg));
            } else {
                toast.error(
                    (t) =>
                        React.createElement(
                            'div',
                            { className: 'text-sm' },
                            React.createElement('p', { className: 'mb-1 font-semibold' }, `${messages.length} errores:`),
                            React.createElement(
                                'ul',
                                { className: 'list-inside list-disc space-y-0.5' },
                                ...messages.map((msg, i) => React.createElement('li', { key: i }, msg)),
                            ),
                            React.createElement(
                                'button',
                                {
                                    onClick: () => toast.dismiss(t.id),
                                    className: 'mt-2 text-xs text-red-300 underline',
                                },
                                'Cerrar',
                            ),
                        ),
                    { duration: 10000 },
                );
            }
            playSound('error');
        };

        setSubmitting(true);

        // Completing a previously saved pending sale
        if (activePendingId) {
            router.post(
                route('sales.complete', activePendingId),
                {
                    payment_method: paymentMethod,
                    amount_paid: paymentMethod === 'cash' ? amountPaid.toFixed(2) : total.toFixed(2),
                    change_amount: paymentMethod === 'cash' ? change.toFixed(2) : '0',
                    net: net.toFixed(2),
                    total: total.toFixed(2),
                    discount_type: discountType,
                    discount_value: discountValue,
                    products: cart.map((i) => ({
                        id: i.product.id,
                        quantity: i.quantity,
                        price: i.product.sale_price,
                        subtotal: i.subtotal,
                    })),
                },
                { onSuccess, onError, onFinish: () => setSubmitting(false) },
            );
            return;
        }

        // Regular completed sale
        router.post(
            route('sales.store'),
            {
                source: 'pos',
                branch_id: defaultBranchId,
                client_id: clientId,
                seller_id: String(auth.user.id),
                net: net.toFixed(2),
                total: total.toFixed(2),
                amount_paid: paymentMethod === 'cash' ? amountPaid.toFixed(2) : total.toFixed(2),
                change_amount: paymentMethod === 'cash' ? change.toFixed(2) : '0',
                payment_method: paymentMethod,
                date: new Date().toLocaleString('sv-SE', { timeZone: 'America/Bogota' }).slice(0, 16),
                status: 'completed',
                discount_type: discountType,
                discount_value: discountValue,
                notes: '',
                products: cart.map((i) => ({
                    id: i.product.id,
                    quantity: i.quantity,
                    price: i.product.sale_price,
                    subtotal: i.subtotal,
                })),
            },
            { onSuccess, onError, onFinish: () => setSubmitting(false) },
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        cart,
        paymentMethod,
        amountPaid,
        total,
        change,
        discountType,
        discountValue,
        activePendingId,
        defaultBranchId,
        defaultClientId,
        clientId,
        currentSession,
        requireCashSession,
    ]);

    // --- Keyboard shortcuts ---
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            const tag = (e.target as HTMLElement).tagName;
            const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

            if (e.key === '/' && !isInput) {
                e.preventDefault();
                searchRef.current?.focus();
                return;
            }
            if (e.key === 'Escape' && document.activeElement === searchRef.current) {
                setQuery('');
                setResults([]);
                return;
            }
            if (e.key === 'Enter' && document.activeElement === searchRef.current) {
                e.preventDefault();
                if (results.length > 0) addToCart(results[0]);
                return;
            }
            if (e.key === 'F9') {
                e.preventDefault();
                handleSubmit();
            }
            if (e.key === '?' && !isInput) {
                e.preventDefault();
                setShowShortcuts((v) => !v);
            }
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [results, addToCart, cart, paymentMethod, amountPaid, total, handleSubmit]);

    // Auto-focus search on mount
    useEffect(() => {
        searchRef.current?.focus();
    }, []);

    // Sync currentSession when Inertia reloads page props
    useEffect(() => {
        setCurrentSession(initialSession);
    }, [initialSession]);

    // --- Pending sales (cotizaciones) ---
    async function fetchPendingSales() {
        setLoadingPending(true);
        try {
            const res = await fetch(route('sales.pending'), { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
            if (res.ok) {
                const data: PendingSale[] = await res.json();
                setPendingSales(data);
                setPendingCount(data.length);
            }
        } catch {
            toast.error('Error al cargar cotizaciones');
        } finally {
            setLoadingPending(false);
        }
    }

    function openPendingPanel() {
        setShowPendingPanel(true);
        fetchPendingSales();
    }

    function loadPendingSale(sale: PendingSale) {
        // Convert pending sale products into cart items
        const newCart: CartItem[] = sale.products.map((p) => ({
            product: {
                id: p.product_id,
                name: p.product_name,
                code: '',
                sale_price: Number(p.price),
                tax: Number(p.tax),
                stock: Number(p.stock),
                image_url: p.image_url ?? undefined,
            } as Product,
            quantity: Number(p.quantity),
            subtotal: Number(p.subtotal),
        }));

        setCart(newCart);
        setClientId(String(sale.client_id));
        setDiscountType(sale.discount_type);
        setDiscountValue(String(sale.discount_value));
        setActivePendingId(sale.id);
        setShowPendingPanel(false);
        toast.success(`Cotización #${sale.code.slice(-6)} cargada`);
    }

    function cancelActivePending() {
        setActivePendingId(null);
        setCart([]);
        setClientId(defaultClientId);
        setDiscountType('none');
        setDiscountValue('0');
        setPaymentMethod('');
        setAmountPaid(0);
        setAmountPaidDisplay('');
        setFormKey((k) => k + 1);
    }

    function deletePendingSale(id: number) {
        router.delete(route('sales.pending.destroy', id), {
            onSuccess: () => {
                setPendingSales((prev) => prev.filter((s) => s.id !== id));
                setPendingCount((c) => Math.max(0, c - 1));
                if (activePendingId === id) cancelActivePending();
                toast.success('Cotización eliminada');
            },
            onError: () => toast.error('Error al eliminar cotización'),
        });
    }

    function handleSaveQuote() {
        if (cart.length === 0) {
            toast.error('Agrega al menos un producto');
            return;
        }

        const resetCart = () => {
            setCart([]);
            setAmountPaid(0);
            setAmountPaidDisplay('');
            setDiscountType('none');
            setDiscountValue('0');
            setPaymentMethod('');
            setClientId(defaultClientId);
            setFormKey((k) => k + 1);
            setActivePendingId(null);
            setMobileTab('search');
            setTimeout(() => searchRef.current?.focus(), 0);
        };

        setSubmitting(true);

        // Update existing pending sale if one is loaded
        if (activePendingId) {
            router.patch(
                route('sales.pending.update', activePendingId),
                {
                    net: net.toFixed(2),
                    total: total.toFixed(2),
                    discount_type: discountType,
                    discount_value: discountValue,
                    products: cart.map((i) => ({
                        id: i.product.id,
                        quantity: i.quantity,
                        price: i.product.sale_price,
                        subtotal: i.subtotal,
                    })),
                },
                {
                    onSuccess: () => {
                        toast.success('Cotización actualizada');
                        resetCart();
                    },
                    onError: (errors) => {
                        Object.values(errors).forEach((msg) => toast.error(String(msg)));
                    },
                    onFinish: () => setSubmitting(false),
                },
            );
            return;
        }

        // Create new pending sale
        router.post(
            route('sales.store'),
            {
                source: 'pos',
                branch_id: defaultBranchId,
                client_id: clientId,
                seller_id: String(auth.user.id),
                net: net.toFixed(2),
                total: total.toFixed(2),
                amount_paid: '0',
                change_amount: '0',
                payment_method: '',
                date: new Date().toLocaleString('sv-SE', { timeZone: 'America/Bogota' }).slice(0, 16),
                status: 'pending',
                discount_type: discountType,
                discount_value: discountValue,
                notes: '',
                products: cart.map((i) => ({
                    id: i.product.id,
                    quantity: i.quantity,
                    price: i.product.sale_price,
                    subtotal: i.subtotal,
                })),
            },
            {
                onSuccess: () => {
                    toast.success('Cotización guardada');
                    resetCart();
                    setPendingCount((c) => c + 1);
                },
                onError: (errors) => {
                    Object.values(errors).forEach((msg) => toast.error(String(msg)));
                },
                onFinish: () => setSubmitting(false),
            },
        );
    }

    function handleCreditSubmit() {
        if (cart.length === 0) return;
        if (!clientId || clientId === defaultClientId) {
            toast.error('Selecciona un cliente para registrar un crédito');
            return;
        }

        setSubmitting(true);
        router.post(
            '/credits',
            {
                type: creditType,
                client_id: parseInt(clientId),
                branch_id: parseInt(defaultBranchId),
                due_date: creditDueDate || null,
                installments_count: creditType === 'installments' ? creditInstallments : null,
                initial_payment: creditInitialPayment > 0 ? creditInitialPayment : null,
                initial_payment_method: creditInitialPayment > 0 ? creditInitialMethod : null,
                notes: creditNotes || null,
                items: cart.map((i) => ({
                    product_id: i.product.id,
                    quantity: i.quantity,
                    unit_price: i.product.sale_price,
                    subtotal: i.subtotal,
                })),
            },
            {
                onSuccess: () => {
                    toast.success('Crédito registrado exitosamente');
                    setShowCreditModal(false);
                    setCart([]);
                    setClientId(defaultClientId);
                    setFormKey((k) => k + 1);
                    setCreditType('layaway');
                    setCreditInitialPayment(0);
                    setCreditNotes('');
                    setCreditDueDate('');
                    setTimeout(() => searchRef.current?.focus(), 0);
                },
                onError: (errors) => {
                    Object.values(errors).forEach((e) => toast.error(String(e)));
                },
                onFinish: () => setSubmitting(false),
            },
        );
    }

    const headerActions = (
        <>
            <CashSessionWidget
                session={currentSession}
                requireCashSession={requireCashSession}
                onOpen={() => setShowOpenSessionModal(true)}
                onMovement={(type) => {
                    setMovementType(type);
                    setShowMovementModal(true);
                }}
            />
            <PrinterWidget printer={printer} />
        </>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs} headerActions={headerActions}>
            <Head title="POS — Punto de Venta" />

            {/* ── Cash session: strict mode blocking modal ── */}
            {!currentSession && requireCashSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
                        <h2 className="mb-1 text-lg font-bold">Abrir caja</h2>
                        <p className="mb-4 text-sm text-muted-foreground">Debes abrir la caja antes de realizar ventas.</p>
                        <form onSubmit={handleOpenSession} className="space-y-3">
                            <div>
                                <label className="mb-1 block text-xs font-medium">Fondo inicial</label>
                                <CurrencyInput
                                    value={openingAmount}
                                    onChange={(v) => setOpeningAmount(v > 0 ? String(v) : '')}
                                    placeholder="0"
                                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium">Notas (opcional)</label>
                                <textarea
                                    value={openingNotes}
                                    onChange={(e) => setOpeningNotes(e.target.value)}
                                    rows={2}
                                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submittingSession}
                                className="w-full rounded-xl bg-[var(--brand-primary)] py-2.5 text-sm font-bold text-white disabled:opacity-50"
                            >
                                {submittingSession ? 'Abriendo...' : 'Abrir caja'}
                            </button>
                        </form>
                        <div className="mt-3 text-center">
                            <a href="/dashboard" className="text-xs text-muted-foreground hover:underline">
                                Ir al inicio
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Variable-price service modal ── */}
            {varPriceProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-neutral-900">
                        <h2 className="mb-1 font-semibold">Precio del servicio</h2>
                        <p className="mb-3 text-sm text-muted-foreground">{varPriceProduct.name}</p>
                        <CurrencyInput value={varPriceValue} onChange={setVarPriceValue} className="w-full" autoFocus />
                        <div className="mt-4 flex gap-2">
                            <button
                                type="button"
                                onClick={() => setVarPriceProduct(null)}
                                className="flex-1 rounded-lg border border-neutral-200 py-2 text-sm font-medium dark:border-neutral-700"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (varPriceValue <= 0) {
                                        toast.error('Ingresa un precio válido');
                                        return;
                                    }
                                    addToCartWithPrice(varPriceProduct, 1, varPriceValue);
                                    setVarPriceProduct(null);
                                }}
                                className="flex-1 rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
                            >
                                Agregar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Cash movement modal ── */}
            {showMovementModal && currentSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-neutral-900">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="font-semibold">{movementType === 'cash_in' ? 'Ingreso de efectivo' : 'Egreso de efectivo'}</h2>
                            <button
                                type="button"
                                onClick={() => setShowMovementModal(false)}
                                className="rounded p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleAddMovement} className="space-y-3">
                            <div className="flex gap-2">
                                {(['cash_in', 'cash_out'] as const).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setMovementType(t)}
                                        className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                                            movementType === t
                                                ? t === 'cash_in'
                                                    ? 'border-green-400 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                    : 'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                : 'border-neutral-200 text-muted-foreground hover:bg-neutral-50 dark:border-neutral-700'
                                        }`}
                                    >
                                        {t === 'cash_in' ? 'Ingreso' : 'Egreso'}
                                    </button>
                                ))}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium">Monto *</label>
                                <CurrencyInput
                                    value={Number(movementAmount) || 0}
                                    onChange={(v) => setMovementAmount(v > 0 ? String(v) : '')}
                                    required
                                    placeholder="0"
                                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium">Concepto *</label>
                                <input
                                    type="text"
                                    value={movementConcept}
                                    onChange={(e) => setMovementConcept(e.target.value)}
                                    required
                                    placeholder="Ej: Pago proveedor"
                                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium">Notas (opcional)</label>
                                <textarea
                                    value={movementNotes}
                                    onChange={(e) => setMovementNotes(e.target.value)}
                                    rows={2}
                                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submittingSession}
                                className={`w-full rounded-xl py-2 text-sm font-bold text-white disabled:opacity-50 ${movementType === 'cash_in' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
                            >
                                {submittingSession ? 'Registrando...' : 'Registrar'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Open session modal (soft mode, triggered by button) ── */}
            {showOpenSessionModal && !requireCashSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="font-semibold">Abrir caja</h2>
                            <button
                                type="button"
                                onClick={() => setShowOpenSessionModal(false)}
                                className="rounded p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleOpenSession} className="space-y-3">
                            <div>
                                <label className="mb-1 block text-xs font-medium">Fondo inicial</label>
                                <CurrencyInput
                                    value={openingAmount}
                                    onChange={(v) => setOpeningAmount(v > 0 ? String(v) : '')}
                                    placeholder="0"
                                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium">Notas (opcional)</label>
                                <textarea
                                    value={openingNotes}
                                    onChange={(e) => setOpeningNotes(e.target.value)}
                                    rows={2}
                                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submittingSession}
                                className="w-full rounded-xl bg-[var(--brand-primary)] py-2.5 text-sm font-bold text-white disabled:opacity-50"
                            >
                                {submittingSession ? 'Abriendo...' : 'Abrir caja'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex h-[calc(100dvh-64px)] flex-col">
                {/* ── Panels (LEFT + RIGHT) — stacked on mobile, side-by-side on desktop ── */}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
                    {/* ── LEFT: Search + Results ── */}
                    <div
                        className={`min-h-0 w-full flex-1 flex-col border-r border-neutral-200 md:w-auto dark:border-neutral-700 ${mobileTab === 'cart' ? 'hidden md:flex' : 'flex'}`}
                    >
                        {/* Search bar */}
                        <div className="border-b border-neutral-200 p-3 dark:border-neutral-700">
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    ref={searchRef}
                                    type="search"
                                    placeholder="Buscar producto por nombre o código... ( / )"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="h-11 pl-9 text-base"
                                />
                                {searching && (
                                    <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-[var(--brand-primary)]">Buscando...</span>
                                )}
                            </div>
                            {/* Category filter */}
                            {categories.length > 0 && (
                                <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 md:flex-wrap md:overflow-visible md:pb-0">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedCategory('');
                                            setSelectedType('');
                                        }}
                                        className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                                            selectedCategory === '' && selectedType === ''
                                                ? 'border-[var(--brand-primary)] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                                : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400'
                                        }`}
                                    >
                                        Todas
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedType('servicio');
                                            setSelectedCategory('');
                                        }}
                                        className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                                            selectedType === 'servicio'
                                                ? 'border-purple-500 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                                : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400'
                                        }`}
                                    >
                                        Servicios
                                    </button>
                                    {categories
                                        .filter((cat) => !/^servicios?$/i.test(cat.name.trim()))
                                        .map((cat) => (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCategory(String(cat.id));
                                                    setSelectedType('');
                                                }}
                                                className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                                                    selectedCategory === String(cat.id)
                                                        ? 'border-[var(--brand-primary)] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                                        : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400'
                                                }`}
                                            >
                                                {cat.name}
                                            </button>
                                        ))}
                                </div>
                            )}
                            {/* Keyboard hints — desktop only */}
                            <div className="mt-2 hidden items-center gap-3 text-[11px] text-muted-foreground md:flex">
                                <span className="flex items-center gap-1">
                                    <Keyboard className="h-3 w-3" />
                                    <kbd className="rounded border px-1">/</kbd> buscar
                                </span>
                                <span>
                                    <kbd className="rounded border px-1">Enter</kbd> agregar
                                </span>
                                <span>
                                    <kbd className="rounded border px-1">Esc</kbd> limpiar
                                </span>
                                <span>
                                    <kbd className="rounded border px-1">F9</kbd> cobrar
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowShortcuts(true)}
                                    className="ml-auto flex h-5 w-5 items-center justify-center rounded border border-neutral-300 text-[10px] font-bold text-muted-foreground hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800"
                                    title="Ver todos los atajos (?)"
                                >
                                    ?
                                </button>
                            </div>

                            {/* Shortcuts panel */}
                            {showShortcuts && (
                                <div className="mt-2 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                                    <div className="mb-2 flex items-center justify-between">
                                        <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Atajos de teclado</h3>
                                        <button
                                            type="button"
                                            onClick={() => setShowShortcuts(false)}
                                            className="text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Buscar producto</span>
                                            <kbd className="rounded border px-1.5 font-mono">/</kbd>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Agregar primer resultado</span>
                                            <kbd className="rounded border px-1.5 font-mono">Enter</kbd>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Limpiar búsqueda</span>
                                            <kbd className="rounded border px-1.5 font-mono">Esc</kbd>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Cobrar venta</span>
                                            <kbd className="rounded border px-1.5 font-mono">F9</kbd>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Ver/ocultar atajos</span>
                                            <kbd className="rounded border px-1.5 font-mono">?</kbd>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Results */}
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            {results.length === 0 && !searching && (selectedType !== '' || query.trim().length >= 2) && (
                                <p className="px-4 py-8 text-center text-sm text-muted-foreground">No se encontraron productos</p>
                            )}
                            {query.trim().length < 2 && selectedType === '' && selectedCategory === '' && cart.length === 0 && (
                                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                                    <ShoppingCart className="h-12 w-12 opacity-20" />
                                    <p className="text-sm">Escribe para buscar productos</p>
                                </div>
                            )}
                            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {results.map((p, i) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => addToCart(p)}
                                        disabled={p.type !== 'servicio' && p.stock <= 0}
                                        aria-label={`Agregar ${p.name} al carrito, ${formatCOP(p.sale_price)}`}
                                        className={`flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-neutral-50 disabled:opacity-50 md:py-3 dark:hover:bg-neutral-800 ${i === 0 ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''}`}
                                    >
                                        {p.image_url ? (
                                            <img
                                                src={p.image_url}
                                                alt={p.name}
                                                className="h-11 w-11 flex-shrink-0 rounded-full border-2 border-neutral-100 object-cover shadow-sm dark:border-neutral-700"
                                            />
                                        ) : (
                                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-400 dark:bg-neutral-800">
                                                {p.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">{p.name}</p>
                                            <p className="font-mono text-xs text-muted-foreground">{p.code}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="font-semibold text-green-700 dark:text-green-300">
                                                {p.type === 'servicio' && p.variable_price ? 'A cotizar' : formatCOP(p.sale_price)}
                                            </span>
                                            {p.type === 'servicio' ? (
                                                <Badge className="bg-purple-100 text-[10px] text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                                    Servicio
                                                </Badge>
                                            ) : (
                                                <Badge variant={p.stock > 0 ? 'secondary' : 'destructive'} className="text-[10px]">
                                                    Stock: {p.stock}
                                                </Badge>
                                            )}
                                        </div>
                                        <Plus className="h-5 w-5 flex-shrink-0 text-green-600" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT: Cart + Payment ── */}
                    <div
                        className={`min-h-0 w-full flex-1 flex-col overflow-hidden md:w-[420px] md:flex-none ${mobileTab === 'search' ? 'hidden md:flex' : 'flex'}`}
                    >
                        {/* Client + clear cart + printer status */}
                        <div className="flex items-center gap-2 border-b border-neutral-200 p-3 dark:border-neutral-700">
                            <Select value={clientId} onValueChange={setClientId} disabled={!!activePendingId}>
                                <SelectTrigger className="h-9 flex-1 bg-white text-sm dark:bg-neutral-800">
                                    <SelectValue placeholder="Cliente" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sortedClients.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Cotizaciones button */}
                            <button
                                type="button"
                                onClick={openPendingPanel}
                                className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                                title="Cotizaciones pendientes"
                            >
                                <ClipboardList className="h-4 w-4" />
                                {pendingCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                                        {pendingCount}
                                    </span>
                                )}
                            </button>

                            {cart.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (confirm('¿Vaciar el carrito?')) {
                                            setCart([]);
                                            setAmountPaid(0);
                                            setAmountPaidDisplay('');
                                        }
                                    }}
                                    title="Vaciar carrito"
                                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-red-200 text-red-400 hover:border-red-400 hover:bg-red-50 hover:text-red-600 dark:border-red-800 dark:hover:bg-red-900/20"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Active pending sale banner */}
                        {activePendingId && (
                            <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-3 py-1.5 dark:border-amber-800 dark:bg-amber-900/20">
                                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Completando cotización</span>
                                <button
                                    type="button"
                                    onClick={cancelActivePending}
                                    className="flex items-center gap-1 text-xs text-amber-600 hover:text-red-500"
                                >
                                    <X className="h-3 w-3" /> Cancelar
                                </button>
                            </div>
                        )}

                        {/* On mobile: cart list + bottom panel scroll together. On desktop: split layout (cart scrolls, bottom fixed when it fits; parent scrolls if bottom is too tall for the viewport). */}
                        <div className="min-h-0 flex-1 overflow-y-auto md:flex md:flex-col md:overflow-y-auto">
                            {/* Cart list */}
                            <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
                                {cart.length === 0 ? (
                                    <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 py-8 text-muted-foreground md:h-full md:py-0">
                                        <ShoppingCart className="h-10 w-10 opacity-20" />
                                        <p className="text-sm">Carrito vacío</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                        {cart.map((item) => (
                                            <div key={item.product.id} className="flex items-center gap-2 px-3 py-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">{item.product.name}</p>
                                                    <p className="text-xs text-muted-foreground">{formatCOP(item.product.sale_price)} c/u</p>
                                                </div>
                                                {/* Quantity controls */}
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQty(item.product.id, item.quantity - 1)}
                                                        aria-label={`Disminuir cantidad de ${item.product.name}`}
                                                        className="flex h-9 w-9 items-center justify-center rounded border border-neutral-200 hover:bg-neutral-100 md:h-7 md:w-7 dark:border-neutral-700 dark:hover:bg-neutral-800"
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={item.product.stock}
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10);
                                                            if (!isNaN(val) && val >= 1) {
                                                                updateQty(item.product.id, Math.min(val, item.product.stock));
                                                            }
                                                        }}
                                                        onFocus={(e) => e.target.select()}
                                                        aria-label={`Cantidad de ${item.product.name}`}
                                                        className="h-9 w-12 rounded border border-neutral-200 bg-transparent text-center text-sm font-semibold focus:border-orange-400 focus:ring-1 focus:ring-orange-400 focus:outline-none md:h-7 md:w-10 dark:border-neutral-700 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQty(item.product.id, Math.min(item.quantity + 1, item.product.stock))}
                                                        disabled={item.quantity >= item.product.stock}
                                                        aria-label={`Aumentar cantidad de ${item.product.name}`}
                                                        className="flex h-9 w-9 items-center justify-center rounded border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 md:h-7 md:w-7 dark:border-neutral-700 dark:hover:bg-neutral-800"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </button>
                                                </div>
                                                <span className="w-24 text-right text-sm font-semibold text-green-700 dark:text-green-300">
                                                    {formatCOP(item.subtotal)}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFromCart(item.product.id)}
                                                    aria-label={`Eliminar ${item.product.name} del carrito`}
                                                    className="flex h-9 w-9 items-center justify-center rounded text-red-400 hover:bg-red-50 hover:text-red-600 md:h-7 md:w-7 dark:hover:bg-red-900/20"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Bottom panel: discount + totals + payment + submit */}
                            <div className="border-t border-neutral-200 bg-neutral-50 md:flex-shrink-0 dark:border-neutral-700 dark:bg-neutral-900">
                                {/* Discount — only when cart has items */}
                                {cart.length > 0 && (
                                    <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2 dark:border-neutral-700">
                                        <Label className="text-xs text-muted-foreground">Descuento:</Label>
                                        <Select value={discountType} onValueChange={(v) => setDiscountType(v as typeof discountType)}>
                                            <SelectTrigger className="h-7 w-32 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Ninguno</SelectItem>
                                                <SelectItem value="percentage">% Porcentaje</SelectItem>
                                                <SelectItem value="fixed">$ Fijo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {discountType !== 'none' &&
                                            (discountType === 'fixed' ? (
                                                <CurrencyInput
                                                    value={Number(discountValue) || 0}
                                                    onChange={(v) => setDiscountValue(v > 0 ? String(v) : '0')}
                                                    className="h-7 w-24 text-xs"
                                                    placeholder="0"
                                                />
                                            ) : (
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    value={discountValue === '0' ? '' : discountValue}
                                                    onChange={(e) => setDiscountValue(e.target.value || '0')}
                                                    className="h-7 w-20 text-xs"
                                                    placeholder="0"
                                                />
                                            ))}
                                        {discountAmount > 0 && (
                                            <span className="ml-auto text-xs font-semibold text-red-600">− {formatCOP(discountAmount)}</span>
                                        )}
                                    </div>
                                )}

                                {/* Totals */}
                                <div className="space-y-1 px-3 py-2 text-sm">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Subtotal</span>
                                        <span>{formatCOP(net)}</span>
                                    </div>
                                    {tax > 0 && (
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Impuesto</span>
                                            <span>{formatCOP(tax)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-t border-neutral-200 pt-1 text-lg font-bold dark:border-neutral-700">
                                        <span>Total</span>
                                        <span className="text-green-700 dark:text-green-300">{formatCOP(total)}</span>
                                    </div>
                                </div>

                                {/* Payment method — only when cart has items */}
                                {cart.length > 0 && (
                                    <div className="px-3 pb-2">
                                        <PaymentMethodSelect
                                            key={formKey}
                                            value={paymentMethod || undefined}
                                            onValueChange={setPaymentMethod}
                                            label=""
                                            placeholder="Método de pago *"
                                            required
                                        />
                                    </div>
                                )}

                                {/* Amount paid (cash only, only when cart has items) */}
                                {paymentMethod === 'cash' && cart.length > 0 && (
                                    <div className="border-t border-neutral-200 px-3 py-2 dark:border-neutral-700">
                                        <div className="flex items-center gap-2">
                                            <Label className="shrink-0 text-xs">Recibido:</Label>
                                            <Input
                                                type="text"
                                                placeholder="0"
                                                value={amountPaidDisplay}
                                                onChange={(e) => {
                                                    const formatted = e.target.value.replace(/[^\d]/g, '');
                                                    const num = parseInt(formatted, 10) || 0;
                                                    setAmountPaid(num);
                                                    setAmountPaidDisplay(num > 0 ? formatNumber(num) : '');
                                                }}
                                                className="h-8 flex-1 text-right text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAmountPaid(total);
                                                    setAmountPaidDisplay(formatNumber(total));
                                                }}
                                                aria-label={`Pago exacto de ${formatCOP(total)}`}
                                                className="rounded border border-blue-300 bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200"
                                            >
                                                Exacto
                                            </button>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {(() => {
                                                const denominations = [1000, 2000, 5000, 10000, 20000, 50000, 100000];
                                                const suggestions: number[] = [];
                                                if (total > 0) {
                                                    // Next round-up for each denomination >= total
                                                    for (const d of denominations) {
                                                        const rounded = Math.ceil(total / d) * d;
                                                        if (rounded >= total && !suggestions.includes(rounded)) {
                                                            suggestions.push(rounded);
                                                        }
                                                    }
                                                    // Sort and take up to 6 unique values
                                                    suggestions.sort((a, b) => a - b);
                                                    suggestions.splice(6);
                                                }
                                                // Fallback: show standard denominations when cart is empty
                                                const buttons = suggestions.length > 0 ? suggestions : [10000, 20000, 50000, 100000];
                                                return buttons.map((bill) => (
                                                    <button
                                                        key={bill}
                                                        type="button"
                                                        onClick={() => {
                                                            setAmountPaid(bill);
                                                            setAmountPaidDisplay(formatNumber(bill));
                                                        }}
                                                        className="rounded border border-neutral-300 bg-neutral-100 px-2 py-1 text-xs font-medium hover:bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                                                    >
                                                        {formatNumber(bill)}
                                                    </button>
                                                ));
                                            })()}
                                        </div>
                                        {amountPaid >= total && total > 0 && (
                                            <div className="mt-1 flex justify-between text-sm font-semibold text-green-700 dark:text-green-300">
                                                <span>Cambio:</span>
                                                <span>{formatCOP(change)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Cobrar button */}
                                <div className="flex flex-col gap-2 px-3 pb-3">
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={submitting || cart.length === 0}
                                        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] text-base font-bold text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-40"
                                    >
                                        {submitting ? (
                                            'Procesando...'
                                        ) : (
                                            <>
                                                Cobrar {total > 0 && formatCOP(total)}
                                                <kbd className="rounded border border-white/40 bg-white/20 px-1.5 py-0.5 text-xs font-normal">F9</kbd>
                                            </>
                                        )}
                                    </button>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={handleSaveQuote}
                                            disabled={submitting || cart.length === 0}
                                            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-40 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                                        >
                                            <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">{activePendingId ? 'Actualizar cotización' : 'Guardar cotización'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (cart.length === 0) {
                                                    toast.error('Agrega al menos un producto');
                                                    return;
                                                }
                                                if (!clientId || clientId === defaultClientId) {
                                                    toast.error('Selecciona un cliente para registrar un crédito');
                                                    return;
                                                }
                                                setShowCreditModal(true);
                                            }}
                                            disabled={submitting || cart.length === 0}
                                            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-40 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                                        >
                                            <HandCoins className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">Vender a crédito</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* ── end mobile scroll wrapper ── */}
                    </div>
                </div>
                {/* ── end panels wrapper ── */}

                {/* ── Mobile tab bar (hidden on desktop) ── */}
                <div className="flex-shrink-0 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden dark:border-neutral-700 dark:bg-neutral-950">
                    <div className="flex">
                        <button
                            type="button"
                            onClick={() => setMobileTab('search')}
                            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors ${mobileTab === 'search' ? 'text-[var(--brand-primary)]' : 'text-neutral-400 dark:text-neutral-500'}`}
                        >
                            <Search className="h-5 w-5" />
                            <span className="text-[10px] font-medium">Buscar</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMobileTab('cart')}
                            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors ${mobileTab === 'cart' ? 'text-[var(--brand-primary)]' : 'text-neutral-400 dark:text-neutral-500'}`}
                        >
                            <div className="relative">
                                <ShoppingCart className="h-5 w-5" />
                                {cart.length > 0 && (
                                    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 text-[9px] font-bold text-white">
                                        {cart.length}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] font-medium">{cart.length > 0 ? formatCOP(total) : 'Carrito'}</span>
                        </button>
                    </div>
                </div>
            </div>
            {/* Pending sales panel (slide-over) */}
            {showPendingPanel && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowPendingPanel(false)} />
                    {/* Panel */}
                    <div className="relative flex h-full w-full max-w-sm flex-col bg-white shadow-2xl dark:bg-neutral-900">
                        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
                            <h2 className="font-semibold">Cotizaciones pendientes</h2>
                            <button
                                type="button"
                                onClick={() => setShowPendingPanel(false)}
                                className="rounded p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto">
                            {loadingPending && <p className="px-4 py-8 text-center text-sm text-muted-foreground">Cargando...</p>}
                            {!loadingPending && pendingSales.length === 0 && (
                                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                                    <ClipboardList className="h-10 w-10 opacity-20" />
                                    <p className="text-sm">No hay cotizaciones pendientes</p>
                                </div>
                            )}
                            {!loadingPending &&
                                pendingSales.map((sale) => (
                                    <div key={sale.id} className="border-b border-neutral-100 p-4 dark:border-neutral-800">
                                        <div className="mb-2 flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{sale.client_name}</p>
                                                <p className="font-mono text-[11px] text-muted-foreground">#{sale.code.slice(-8)}</p>
                                            </div>
                                            <span className="text-sm font-bold text-green-700 dark:text-green-300">{formatCOP(sale.total)}</span>
                                        </div>
                                        <p className="mb-1 text-xs text-muted-foreground">
                                            {sale.product_count} producto{sale.product_count !== 1 ? 's' : ''}
                                            {' · '}
                                            {new Date(sale.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => loadPendingSale(sale)}
                                                className="flex-1 rounded-lg bg-amber-500 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                                            >
                                                Cargar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (confirm('¿Eliminar esta cotización?')) deletePendingSale(sale.id);
                                                }}
                                                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}
            {/* Credit mini-modal */}
            {showCreditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreditModal(false)} />
                    <div className="relative mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-bold">Registrar como crédito</h2>
                            <button
                                type="button"
                                onClick={() => setShowCreditModal(false)}
                                className="rounded p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Type selection */}
                        <div className="mb-4 grid grid-cols-2 gap-2">
                            {[
                                { key: 'layaway' as const, label: 'Separado', desc: 'Entrega al completar pago' },
                                { key: 'installments' as const, label: 'Cuotas', desc: 'Entrega inmediata, pago en cuotas' },
                                { key: 'due_date' as const, label: 'Fecha acordada', desc: 'Entrega inmediata, pago en fecha' },
                                { key: 'hold' as const, label: 'Reservado', desc: 'Sin abono, sin entrega' },
                            ].map((t) => (
                                <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => {
                                        setCreditType(t.key);
                                        if (t.key === 'installments') {
                                            const d = new Date();
                                            d.setMonth(d.getMonth() + creditInstallments);
                                            setCreditDueDate(d.toISOString().slice(0, 10));
                                        } else if (t.key !== 'due_date') {
                                            setCreditDueDate('');
                                        }
                                    }}
                                    className={`rounded-lg border-2 p-3 text-left text-sm transition-colors ${creditType === t.key ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
                                >
                                    <p className="font-semibold">{t.label}</p>
                                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                                </button>
                            ))}
                        </div>

                        {/* Conditions */}
                        <div className="mb-4 space-y-3">
                            {creditType === 'installments' && (
                                <div>
                                    <Label className="mb-1 block text-sm">Número de cuotas</Label>
                                    <select
                                        value={creditInstallments}
                                        onChange={(e) => {
                                            const n = parseInt(e.target.value);
                                            setCreditInstallments(n);
                                            const d = new Date();
                                            d.setMonth(d.getMonth() + n);
                                            setCreditDueDate(d.toISOString().slice(0, 10));
                                        }}
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    >
                                        {[2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                                            <option key={n} value={n}>
                                                {n} cuotas — {formatCOP(Math.round(total / n))} c/u
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {(creditType === 'due_date' || creditType === 'installments') && (
                                <div>
                                    <Label className="mb-1 block text-sm">
                                        {creditType === 'installments' ? 'Fecha última cuota' : 'Fecha límite de pago'}
                                    </Label>
                                    <Input
                                        type="date"
                                        value={creditDueDate}
                                        min={new Date().toISOString().slice(0, 10)}
                                        onChange={(e) => setCreditDueDate(e.target.value)}
                                    />
                                </div>
                            )}
                            {creditType !== 'hold' && (
                                <div>
                                    <Label className="mb-1 block text-sm">Abono inicial (opcional)</Label>
                                    <CurrencyInput value={creditInitialPayment} onChange={setCreditInitialPayment} />
                                    {creditInitialPayment > 0 && (
                                        <div className="mt-2">
                                            <Label className="mb-1 block text-sm">Método de pago del abono</Label>
                                            <PaymentMethodSelect value={creditInitialMethod} onValueChange={setCreditInitialMethod} />
                                        </div>
                                    )}
                                </div>
                            )}
                            <div>
                                <Label className="mb-1 block text-sm">Notas (opcional)</Label>
                                <Input value={creditNotes} onChange={(e) => setCreditNotes(e.target.value)} placeholder="Observaciones..." />
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="mb-4 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800">
                            <div className="flex justify-between text-sm">
                                <span>Total del crédito</span>
                                <span className="font-bold">{formatCOP(total)}</span>
                            </div>
                            {creditInitialPayment > 0 && (
                                <div className="mt-1 flex justify-between text-sm text-green-600">
                                    <span>Abono inicial</span>
                                    <span>{formatCOP(creditInitialPayment)}</span>
                                </div>
                            )}
                            {creditInitialPayment > 0 && (
                                <div className="mt-1 flex justify-between text-sm text-orange-500">
                                    <span>Saldo pendiente</span>
                                    <span className="font-semibold">{formatCOP(total - creditInitialPayment)}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShowCreditModal(false)}
                                className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleCreditSubmit}
                                disabled={submitting || creditInitialPayment > total}
                                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40"
                            >
                                {submitting ? 'Registrando...' : 'Confirmar crédito'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
