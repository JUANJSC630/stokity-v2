import { useConfirm } from '@/components/confirm-dialog';
import PaymentMethodSelect from '@/components/PaymentMethodSelect';
import { CartLine } from '@/components/pos/cart-line';
import { CashMovementDialog, OpenSessionDialog, VariablePriceDialog } from '@/components/pos/cash-dialogs';
import { CashSessionWidget } from '@/components/pos/cash-session-widget';
import { CashTender } from '@/components/pos/cash-tender';
import { CreditSaleDialog } from '@/components/pos/credit-sale-dialog';
import { MobileTabs } from '@/components/pos/mobile-tabs';
import { PendingQuotesSheet } from '@/components/pos/pending-quotes-sheet';
import { PrinterWidget } from '@/components/pos/printer-widget';
import { ProductSearchPanel } from '@/components/pos/product-search-panel';
import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useModules } from '@/hooks/use-modules';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { usePolling } from '@/hooks/use-polling';
import { usePrinter } from '@/hooks/use-printer';
import { useSound } from '@/hooks/use-sound';
import { useSubmitGuard } from '@/hooks/use-submit-guard';
import AppLayout from '@/layouts/app-layout';
import { isSessionOpenTooLong } from '@/lib/cash-session';
import { formatCurrency } from '@/lib/format';
import { isModalOpen } from '@/lib/modal';
import { resolveWholesaleDiscount } from '@/lib/wholesale-discount';
import { type Branch, type BreadcrumbItem, type CashSession, type Client, type SharedData } from '@/types';
import type { Product } from '@/types/product';
import { Head, router, usePage } from '@inertiajs/react';
import { AlertTriangle, ClipboardList, HandCoins, ShoppingCart, Trash2, X } from 'lucide-react';
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
    return formatCurrency(num);
}

function formatNumber(value: number) {
    return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

/**
 * F7: reads the per-session dismissal flag for the stale-session banner.
 * Wrapped in try/catch — sessionStorage can throw (Safari "Block All
 * Cookies", restrictive iframe/storage-access policies), and this is a
 * purely cosmetic reminder that must never be able to crash the POS page.
 */
function readStaleSessionDismissed(sessionId: number | undefined): boolean {
    if (!sessionId) return false;
    try {
        return sessionStorage.getItem(`stokity_stale_session_dismissed_${sessionId}`) === 'true';
    } catch {
        return false;
    }
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'POS', href: '/pos' }];

export default function PosIndex({
    branches,
    clients,
    categories,
    pendingSalesCount: initialPendingCount,
    currentSession: initialSession,
    requireCashSession,
}: Props) {
    const { confirm, dialog } = useConfirm();
    const { auth } = usePage<SharedData>().props;
    const { moduleEnabled } = useModules();
    const onBrand = useOnBrandColor();

    // Polling: refresh clients, session state and pending sales count every 60 seconds
    usePolling(['clients', 'currentSession', 'pendingSalesCount'], 60_000);

    const sortedClients = [...clients].sort((a, b) => b.id - a.id);
    const anonymous = sortedClients.find((c) => c.name.toLowerCase() === 'consumidor final');
    const defaultClientId = anonymous ? String(anonymous.id) : sortedClients[0] ? String(sortedClients[0].id) : '';
    const defaultBranchId = auth.user.branch_id ? String(auth.user.branch_id) : branches[0] ? String(branches[0].id) : '';

    // --- State ---
    const [cart, setCart] = useState<CartItem[]>([]);
    const [clientId, setClientId] = useState(defaultClientId);
    const [paymentMethod, setPaymentMethod] = useState('');
    // Lazy-initialized from the default client so a wholesale client that
    // happens to be pre-selected on mount (e.g. no "Consumidor final" seeded,
    // or it was itself marked wholesale) still gets its discount applied
    // without requiring the cashier to reselect it from the dropdown.
    const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>(
        () => resolveWholesaleDiscount(sortedClients.find((c) => String(c.id) === defaultClientId))?.type ?? 'none',
    );
    const [discountValue, setDiscountValue] = useState(
        () => resolveWholesaleDiscount(sortedClients.find((c) => String(c.id) === defaultClientId))?.value ?? '0',
    );
    const [amountPaidDisplay, setAmountPaidDisplay] = useState('');
    const [amountPaid, setAmountPaid] = useState(0);
    const { submitting, start: startSubmit, finish: finishSubmit } = useSubmitGuard();
    const [formKey, setFormKey] = useState(0);

    // F1: switching clients always recalculates the default discount for
    // the newly selected client — a wholesale client gets their % applied,
    // anyone else resets to no discount. The discount picker below stays
    // fully editable (no permission gate on it today), so the cashier can
    // still clear or adjust it for a one-off sale that isn't wholesale.
    const handleClientChange = (id: string) => {
        setClientId(id);
        const client = sortedClients.find((c) => String(c.id) === id);
        const suggestion = resolveWholesaleDiscount(client);
        if (suggestion) {
            setDiscountType(suggestion.type);
            setDiscountValue(suggestion.value);
        } else {
            setDiscountType('none');
            setDiscountValue('0');
        }
    };

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
    // F7: non-blocking "session open too long" banner. `now` ticks every
    // minute so the banner can appear without a page reload once a session
    // crosses the 10h mark; dismissal is per-session (sessionStorage key
    // includes the session id) so a NEW session always starts un-dismissed.
    const [now, setNow] = useState(() => Date.now());
    const [staleSessionDismissed, setStaleSessionDismissed] = useState(() => readStaleSessionDismissed(initialSession?.id));
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

    // F1: shown next to the discount picker when the currently active
    // discount still matches the selected client's wholesale default — the
    // cashier changing type/value away from it (a one-off non-wholesale
    // sale) makes the badge disappear, without needing separate state.
    const selectedClient = sortedClients.find((c) => String(c.id) === clientId);
    const wholesaleSuggestion = resolveWholesaleDiscount(selectedClient);
    const wholesaleDiscountActive =
        !!wholesaleSuggestion && discountType === wholesaleSuggestion.type && Number(discountValue) === Number(wholesaleSuggestion.value);

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
            setPaymentMethod('');
            handleClientChange(defaultClientId);
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

        if (!startSubmit()) return;

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
                { onSuccess, onError, onFinish: finishSubmit },
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
            { onSuccess, onError, onFinish: finishSubmit },
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
            if (isModalOpen()) return;

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

    // F7: tick `now` every minute so the stale-session banner can appear
    // without requiring a page reload once a long-open session crosses 10h.
    // Skips ticking while the tab is hidden, matching usePolling's behavior.
    useEffect(() => {
        const interval = setInterval(() => {
            if (document.visibilityState === 'hidden') return;
            setNow(Date.now());
        }, 60_000);
        return () => clearInterval(interval);
    }, []);

    // F7: re-check dismissal (per session id) whenever the active session
    // changes — covers both a new session opening (undismissed) and the
    // current one closing out from under the page (nothing to dismiss).
    useEffect(() => {
        setStaleSessionDismissed(readStaleSessionDismissed(currentSession?.id));
    }, [currentSession?.id]);

    const sessionOpenTooLong = currentSession ? isSessionOpenTooLong(currentSession.opened_at, now) : false;

    const dismissStaleSessionBanner = () => {
        if (!currentSession) return;
        try {
            sessionStorage.setItem(`stokity_stale_session_dismissed_${currentSession.id}`, 'true');
        } catch {
            // Storage unavailable — dismissal just won't survive a remount, not worth surfacing.
        }
        setStaleSessionDismissed(true);
    };

    // --- Pending sales (cotizaciones) ---
    async function fetchRawPendingSales(): Promise<PendingSale[]> {
        const res = await fetch(route('sales.pending'), { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        if (!res.ok) throw new Error('fetch_failed');
        return res.json();
    }

    async function fetchPendingSales() {
        setLoadingPending(true);
        try {
            const data = await fetchRawPendingSales();
            setPendingSales(data);
            setPendingCount(data.length);
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

    // Auto-load pending sale when arriving from dashboard (?pending=ID).
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const pendingId = params.get('pending');
        if (!pendingId) return;

        (async () => {
            setLoadingPending(true);
            try {
                const data = await fetchRawPendingSales();
                setPendingSales(data);
                setPendingCount(data.length);
                const target = data.find((s) => s.id === Number(pendingId));
                // Clean URL only after resolving — preserves ?pending param for retry on network error.
                window.history.replaceState({}, '', route('pos.index'));
                if (target) {
                    loadPendingSale(target);
                } else {
                    toast.error('La cotización no fue encontrada');
                }
            } catch {
                toast.error('No se pudo cargar la cotización');
            } finally {
                setLoadingPending(false);
            }
        })();
    }, []);

    function cancelActivePending() {
        setActivePendingId(null);
        setCart([]);
        handleClientChange(defaultClientId);
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
            setPaymentMethod('');
            handleClientChange(defaultClientId);
            setFormKey((k) => k + 1);
            setActivePendingId(null);
            setMobileTab('search');
            setTimeout(() => searchRef.current?.focus(), 0);
        };

        if (!startSubmit()) return;

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
                    onFinish: finishSubmit,
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
                onFinish: finishSubmit,
            },
        );
    }

    function handleCreditSubmit() {
        if (cart.length === 0) return;
        if (!clientId || clientId === defaultClientId) {
            toast.error('Selecciona un cliente para registrar un crédito');
            return;
        }

        if (!startSubmit()) return;
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
                    handleClientChange(defaultClientId);
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
                onFinish: finishSubmit,
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

            <OpenSessionDialog
                open={(!currentSession && requireCashSession) || (showOpenSessionModal && !requireCashSession)}
                blocking={!currentSession && requireCashSession}
                amount={openingAmount}
                notes={openingNotes}
                submitting={submittingSession}
                onAmountChange={setOpeningAmount}
                onNotesChange={setOpeningNotes}
                onSubmit={handleOpenSession}
                onClose={() => setShowOpenSessionModal(false)}
            />

            <VariablePriceDialog
                productName={varPriceProduct ? varPriceProduct.name : null}
                value={varPriceValue}
                onChange={setVarPriceValue}
                onCancel={() => setVarPriceProduct(null)}
                onConfirm={() => {
                    if (!varPriceProduct) return;
                    if (varPriceValue <= 0) {
                        toast.error('Ingresa un precio válido');
                        return;
                    }
                    addToCartWithPrice(varPriceProduct, 1, varPriceValue);
                    setVarPriceProduct(null);
                }}
            />

            <CashMovementDialog
                open={showMovementModal && !!currentSession}
                type={movementType}
                amount={movementAmount}
                concept={movementConcept}
                notes={movementNotes}
                submitting={submittingSession}
                onTypeChange={setMovementType}
                onAmountChange={setMovementAmount}
                onConceptChange={setMovementConcept}
                onNotesChange={setMovementNotes}
                onSubmit={handleAddMovement}
                onClose={() => setShowMovementModal(false)}
            />

            <div className="flex h-[calc(100dvh-64px)] flex-col">
                {/* ── F7: session open too long — non-blocking, dismissible per session ── */}
                {sessionOpenTooLong && !staleSessionDismissed && (
                    <div className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span className="text-xs font-medium sm:text-sm">La caja lleva más de 10 horas abierta. ¿Olvidaste cerrar el turno?</span>
                        </div>
                        <button
                            type="button"
                            onClick={dismissStaleSessionBanner}
                            className="shrink-0 rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                            aria-label="Descartar aviso"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}

                {/* ── Panels (LEFT + RIGHT) — stacked on mobile, side-by-side on desktop ── */}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
                    {/* ── LEFT: Search + Results ── */}
                    <div
                        className={`min-h-0 w-full flex-1 flex-col border-r border-neutral-200 md:w-auto dark:border-neutral-700 ${mobileTab === 'cart' ? 'hidden md:flex' : 'flex'}`}
                    >
                        <ProductSearchPanel
                            query={query}
                            onQueryChange={setQuery}
                            searching={searching}
                            searchRef={searchRef}
                            categories={categories}
                            selectedCategory={selectedCategory}
                            selectedType={selectedType}
                            onSelectAll={() => {
                                setSelectedCategory('');
                                setSelectedType('');
                            }}
                            onSelectServices={() => {
                                setSelectedType('servicio');
                                setSelectedCategory('');
                            }}
                            onSelectCategory={(id) => {
                                setSelectedCategory(id);
                                setSelectedType('');
                            }}
                            results={results}
                            onAdd={addToCart}
                            cartIsEmpty={cart.length === 0}
                            showShortcuts={showShortcuts}
                            onShowShortcuts={setShowShortcuts}
                        />
                    </div>

                    {/* ── RIGHT: Cart + Payment ── */}
                    <div
                        className={`min-h-0 w-full flex-1 flex-col overflow-hidden md:w-[420px] md:flex-none ${mobileTab === 'search' ? 'hidden md:flex' : 'flex'}`}
                    >
                        {/* Client, quotes and clear cart */}
                        <div className="flex items-center gap-2 border-b border-border/60 p-3">
                            <Select value={clientId} onValueChange={handleClientChange} disabled={!!activePendingId}>
                                <SelectTrigger className="h-11 flex-1 bg-background text-base md:h-10 md:text-sm">
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

                            <button
                                type="button"
                                onClick={openPendingPanel}
                                className="relative flex size-11 flex-shrink-0 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 text-amber-700 transition-colors hover:bg-amber-100 md:size-10 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                                title="Cotizaciones pendientes"
                                aria-label="Cotizaciones pendientes"
                            >
                                <ClipboardList className="size-4" aria-hidden="true" />
                                {pendingCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                                        {pendingCount}
                                    </span>
                                )}
                            </button>

                            {cart.length > 0 && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const accepted = await confirm({ title: '¿Vaciar el carrito?', confirmLabel: 'Vaciar' });
                                        if (accepted) {
                                            setCart([]);
                                            setAmountPaid(0);
                                            setAmountPaidDisplay('');
                                        }
                                    }}
                                    title="Vaciar carrito"
                                    aria-label="Vaciar carrito"
                                    className="flex size-11 flex-shrink-0 items-center justify-center rounded-xl border border-red-200 text-red-500 transition-colors hover:bg-red-50 md:size-10 dark:border-red-900 dark:hover:bg-red-950/30"
                                >
                                    <Trash2 className="size-4" aria-hidden="true" />
                                </button>
                            )}
                        </div>

                        {activePendingId && (
                            <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-900/20">
                                <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Completando cotización</span>
                                <button
                                    type="button"
                                    onClick={cancelActivePending}
                                    className="flex min-h-11 items-center gap-1 px-2 text-sm text-amber-700 hover:text-red-600 md:min-h-0 dark:text-amber-300"
                                >
                                    <X className="size-3.5" aria-hidden="true" /> Cancelar
                                </button>
                            </div>
                        )}

                        {/* On mobile: cart list + bottom panel scroll together. On desktop: split layout (cart scrolls, bottom fixed when it fits; parent scrolls if bottom is too tall for the viewport). */}
                        <div className="min-h-0 flex-1 overflow-y-auto md:flex md:flex-col md:overflow-y-auto">
                            <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
                                {cart.length === 0 ? (
                                    <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 py-8 text-muted-foreground md:h-full md:py-0">
                                        <ShoppingCart className="size-10 opacity-20" aria-hidden="true" />
                                        <p className="text-sm">Carrito vacío</p>
                                    </div>
                                ) : (
                                    <ul aria-label="Productos del carrito" className="divide-y divide-border/50">
                                        {cart.map((item) => (
                                            <CartLine
                                                key={item.product.id}
                                                item={item}
                                                onDecrease={() => updateQty(item.product.id, item.quantity - 1)}
                                                onIncrease={() =>
                                                    updateQty(
                                                        item.product.id,
                                                        item.product.type === 'servicio'
                                                            ? item.quantity + 1
                                                            : Math.min(item.quantity + 1, item.product.stock),
                                                    )
                                                }
                                                onTypeQuantity={(val) =>
                                                    updateQty(
                                                        item.product.id,
                                                        item.product.type === 'servicio' ? val : Math.min(val, item.product.stock),
                                                    )
                                                }
                                                onRemove={() => removeFromCart(item.product.id)}
                                            />
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Bottom panel: discount + totals + payment + submit */}
                            <div className="border-t border-border/60 bg-muted/30 md:flex-shrink-0">
                                {cart.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2.5">
                                        <Label className="text-sm text-muted-foreground">Descuento:</Label>
                                        {wholesaleDiscountActive && (
                                            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                                                Cliente mayorista · {wholesaleSuggestion?.value}% aplicado
                                            </span>
                                        )}
                                        <Select value={discountType} onValueChange={(v) => setDiscountType(v as typeof discountType)}>
                                            <SelectTrigger className="h-11 w-36 bg-background text-base md:h-9 md:text-xs">
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
                                                    className="h-11 w-28 text-base md:h-9 md:text-xs"
                                                    placeholder="0"
                                                />
                                            ) : (
                                                <Input
                                                    type="number"
                                                    inputMode="decimal"
                                                    min={0}
                                                    max={100}
                                                    value={discountValue === '0' ? '' : discountValue}
                                                    onChange={(e) => setDiscountValue(e.target.value || '0')}
                                                    className="h-11 w-24 text-base md:h-9 md:text-xs"
                                                    placeholder="0"
                                                />
                                            ))}
                                        {discountAmount > 0 && (
                                            <span className="ml-auto text-sm font-semibold text-red-600 tabular-nums">
                                                − {formatCOP(discountAmount)}
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-1.5 px-3 py-3 text-sm">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Subtotal</span>
                                        <span className="tabular-nums">{formatCOP(net)}</span>
                                    </div>
                                    {tax > 0 && (
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Impuesto</span>
                                            <span className="tabular-nums">{formatCOP(tax)}</span>
                                        </div>
                                    )}
                                    <div className="flex items-baseline justify-between border-t border-border/60 pt-2">
                                        <span className="text-base font-semibold">Total</span>
                                        <span className="text-3xl font-bold tracking-tight tabular-nums">
                                            <RollingNumber value={total} format={formatCOP} />
                                        </span>
                                    </div>
                                </div>

                                {cart.length > 0 && (
                                    <div className="px-3 pb-3">
                                        <PaymentMethodSelect
                                            key={formKey}
                                            value={paymentMethod || undefined}
                                            onValueChange={setPaymentMethod}
                                            label=""
                                            placeholder="Método de pago *"
                                            required
                                            triggerClassName="h-12 text-base md:h-10 md:text-sm"
                                        />
                                    </div>
                                )}

                                {paymentMethod === 'cash' && cart.length > 0 && (
                                    <CashTender
                                        total={total}
                                        amountPaid={amountPaid}
                                        amountDisplay={amountPaidDisplay}
                                        onAmountTyped={(raw) => {
                                            const formatted = raw.replace(/[^\d]/g, '');
                                            const num = parseInt(formatted, 10) || 0;
                                            setAmountPaid(num);
                                            setAmountPaidDisplay(num > 0 ? formatNumber(num) : '');
                                        }}
                                        onExact={() => {
                                            setAmountPaid(total);
                                            setAmountPaidDisplay(formatNumber(total));
                                        }}
                                        onBill={(bill) => {
                                            setAmountPaid(bill);
                                            setAmountPaidDisplay(formatNumber(bill));
                                        }}
                                        change={change}
                                    />
                                )}

                                <div className="sticky bottom-0 z-10 border-t border-border/60 bg-background/95 px-3 py-2 backdrop-blur md:static md:border-0 md:bg-transparent md:pt-0 md:pb-2 md:backdrop-blur-none">
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={submitting || cart.length === 0}
                                        className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] text-lg font-bold shadow-md transition-opacity hover:opacity-90 disabled:opacity-40 md:h-12 md:text-base"
                                        style={{ color: onBrand.hex }}
                                    >
                                        {submitting ? (
                                            'Procesando...'
                                        ) : (
                                            <>
                                                Cobrar {total > 0 && formatCOP(total)}
                                                <kbd className="hidden rounded border border-current/40 bg-white/20 px-1.5 py-0.5 text-xs font-normal md:inline">
                                                    F9
                                                </kbd>
                                            </>
                                        )}
                                    </button>
                                </div>
                                <div className="flex flex-col gap-2 px-3 pb-3">
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={handleSaveQuote}
                                            disabled={submitting || cart.length === 0}
                                            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-40 md:h-10 md:text-xs dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                                        >
                                            <ClipboardList className="size-4 shrink-0" aria-hidden="true" />
                                            <span className="truncate">{activePendingId ? 'Actualizar cotización' : 'Guardar cotización'}</span>
                                        </button>
                                        {moduleEnabled('credits') && (
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
                                                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 text-sm font-medium text-blue-800 transition-colors hover:bg-blue-100 disabled:opacity-40 md:h-10 md:text-xs dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                                            >
                                                <HandCoins className="size-4 shrink-0" aria-hidden="true" />
                                                <span className="truncate">Vender a crédito</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* ── end mobile scroll wrapper ── */}
                    </div>
                </div>
                {/* ── end panels wrapper ── */}

                <MobileTabs active={mobileTab} onChange={setMobileTab} itemCount={cart.length} total={total} />
            </div>
            <PendingQuotesSheet
                open={showPendingPanel}
                loading={loadingPending}
                quotes={pendingSales}
                onClose={() => setShowPendingPanel(false)}
                onLoad={(quote) => loadPendingSale(pendingSales.find((sale) => sale.id === quote.id) ?? (quote as PendingSale))}
                onDelete={async (quote) => {
                    const accepted = await confirm({ title: '¿Eliminar esta cotización?', confirmLabel: 'Eliminar' });
                    if (accepted) deletePendingSale(quote.id);
                }}
            />
            <CreditSaleDialog
                open={showCreditModal}
                onClose={() => setShowCreditModal(false)}
                type={creditType}
                onSelectType={(key) => {
                    setCreditType(key);
                    if (key === 'installments') {
                        const d = new Date();
                        d.setMonth(d.getMonth() + creditInstallments);
                        setCreditDueDate(d.toISOString().slice(0, 10));
                    } else if (key !== 'due_date') {
                        setCreditDueDate('');
                    }
                }}
                installments={creditInstallments}
                onInstallmentsChange={(n) => {
                    setCreditInstallments(n);
                    const d = new Date();
                    d.setMonth(d.getMonth() + n);
                    setCreditDueDate(d.toISOString().slice(0, 10));
                }}
                dueDate={creditDueDate}
                onDueDateChange={setCreditDueDate}
                initialPayment={creditInitialPayment}
                onInitialPaymentChange={setCreditInitialPayment}
                initialMethod={creditInitialMethod}
                onInitialMethodChange={setCreditInitialMethod}
                notes={creditNotes}
                onNotesChange={setCreditNotes}
                total={total}
                submitting={submitting}
                onConfirm={handleCreditSubmit}
            />
            {dialog}
        </AppLayout>
    );
}
