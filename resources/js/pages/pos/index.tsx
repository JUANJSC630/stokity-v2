import PaymentMethodSelect from '@/components/PaymentMethodSelect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePrinter } from '@/hooks/use-printer';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem, type Client, type SharedData, type User } from '@/types';
import type { Product } from '@/types/product';
import { Head, router, usePage } from '@inertiajs/react';
import { Keyboard, Minus, Plus, Printer, Search, ShoppingCart, Trash2, Wifi, WifiOff } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
    branches: Branch[];
    clients: Client[];
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

function parseFormatted(v: string): number {
    return parseInt(v.replace(/[^\d]/g, ''), 10) || 0;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'POS', href: '/pos' }];

// ─── Printer status indicator ────────────────────────────────────────────────
function PrinterStatusBadge({ status, printers, selectedPrinter, onConnect }: {
    status: string;
    printers: string[];
    selectedPrinter: string;
    onConnect: () => void;
}) {
    if (status === 'connected' && selectedPrinter) {
        return (
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                <Wifi className="h-3 w-3" />
                {selectedPrinter.length > 20 ? selectedPrinter.slice(0, 18) + '…' : selectedPrinter}
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

export default function PosIndex({ branches, clients }: Props) {
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
    const [showPrinterMenu, setShowPrinterMenu] = useState(false);
    const [formKey, setFormKey] = useState(0);

    // Search
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Product[]>([]);
    const [searching, setSearching] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Printer
    const printer = usePrinter();

    // Track the last sale ID we've already printed to avoid double-printing
    const lastPrintedSaleId = useRef<number | null>(null);

    // --- Totals ---
    const net = cart.reduce((s, i) => s + i.subtotal, 0);
    const tax = cart.reduce((s, i) => s + i.subtotal * ((i.product.tax || 0) / 100), 0);
    const gross = net + tax;
    const dVal = parseFloat(discountValue) || 0;
    const discountAmount =
        discountType === 'percentage'
            ? Math.round(gross * (dVal / 100) * 100) / 100
            : discountType === 'fixed'
              ? Math.min(dVal, gross)
              : 0;
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
        if (printer.status !== 'connected' || !printer.selectedPrinter) return;

        lastPrintedSaleId.current = saleId;
        printerRef.current.printReceipt(saleId).catch((err: Error) => {
            toast.error('Error al imprimir: ' + err.message);
        });
    // Run whenever printer connects OR a new sale flash arrives
    }, [flash?.last_sale_id, printer.status, printer.selectedPrinter]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Product search ---
    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (!query || query.trim().length < 2) { setResults([]); return; }
        setSearching(true);
        searchTimeout.current = setTimeout(async () => {
            if (abortRef.current) abortRef.current.abort();
            abortRef.current = new AbortController();
            try {
                const res = await fetch(route('api.products.search') + '?' + new URLSearchParams({ q: query }), {
                    signal: abortRef.current.signal,
                });
                if (res.ok) setResults(await res.json());
            } catch (e) {
                if ((e as Error).name !== 'AbortError') console.error(e);
            } finally {
                setSearching(false);
            }
        }, 250);
    }, [query]);

    // --- Cart helpers ---
    const addToCart = useCallback((product: Product, qty = 1) => {
        if (product.stock <= 0) { toast.error('Sin stock disponible'); return; }
        setCart((prev) => {
            const idx = prev.findIndex((i) => i.product.id === product.id);
            if (idx !== -1) {
                const updated = [...prev];
                const newQty = Math.min(updated[idx].quantity + qty, product.stock);
                updated[idx] = { ...updated[idx], quantity: newQty, subtotal: newQty * product.sale_price };
                return updated;
            }
            return [{ product, quantity: qty, subtotal: qty * product.sale_price }, ...prev];
        });
        setQuery('');
        setResults([]);
        setTimeout(() => searchRef.current?.focus(), 0);
    }, []);

    const updateQty = (productId: number, qty: number) => {
        setCart((prev) =>
            prev
                .map((i) => (i.product.id === productId ? { ...i, quantity: qty, subtotal: qty * i.product.sale_price } : i))
                .filter((i) => i.quantity > 0),
        );
    };

    const removeFromCart = (productId: number) => setCart((prev) => prev.filter((i) => i.product.id !== productId));

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
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [results, addToCart, cart, paymentMethod, amountPaid, total]);

    // Auto-focus search on mount
    useEffect(() => { searchRef.current?.focus(); }, []);

    // --- Submit ---
    function handleSubmit() {
        if (cart.length === 0) { toast.error('Agrega al menos un producto'); return; }
        if (!paymentMethod) { toast.error('Selecciona un método de pago'); return; }
        if (paymentMethod === 'cash' && amountPaid < total) {
            toast.error('El monto recibido es menor al total');
            return;
        }

        setSubmitting(true);
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
            {
                onSuccess: (page) => {
                    toast.success('¡Venta registrada!');
                    setCart([]);
                    setAmountPaid(0);
                    setAmountPaidDisplay('');
                    setDiscountType('none');
                    setDiscountValue('0');
                    setPaymentMethod('');
                    setClientId(defaultClientId);
                    setFormKey((k) => k + 1);
                    setTimeout(() => searchRef.current?.focus(), 0);

                    // Auto-print si hay impresora conectada
                    const pageFlash = (page.props as unknown as SharedData).flash;
                    const saleId = pageFlash?.last_sale_id;
                    const p = printerRef.current;
                    if (saleId && p.status === 'connected' && p.selectedPrinter) {
                        lastPrintedSaleId.current = saleId; // mark so fallback effect doesn't re-print
                        p.printReceipt(saleId).catch((err: Error) => {
                            toast.error('Error al imprimir: ' + err.message);
                        });
                    }
                },
                onError: (errors) => {
                    Object.values(errors).forEach((msg) => toast.error(String(msg)));
                },
                onFinish: () => setSubmitting(false),
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="POS — Punto de Venta" />

            <div className="flex h-[calc(100dvh-64px)] flex-col gap-0 overflow-hidden md:flex-row">
                {/* ── LEFT: Search + Results ── */}
                <div className="flex min-h-0 flex-1 flex-col border-r border-neutral-200 dark:border-neutral-700">
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
                                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-orange-500">Buscando...</span>
                            )}
                        </div>
                        {/* Keyboard hints */}
                        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Keyboard className="h-3 w-3" />
                                <kbd className="rounded border px-1">/</kbd> buscar
                            </span>
                            <span>
                                <kbd className="rounded border px-1">Enter</kbd> agregar primero
                            </span>
                            <span>
                                <kbd className="rounded border px-1">Esc</kbd> limpiar
                            </span>
                            <span>
                                <kbd className="rounded border px-1">F9</kbd> cobrar
                            </span>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {query.trim().length >= 2 && results.length === 0 && !searching && (
                            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No se encontraron productos</p>
                        )}
                        {query.trim().length < 2 && cart.length === 0 && (
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
                                    disabled={p.stock <= 0}
                                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:hover:bg-neutral-800 ${i === 0 ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}
                                >
                                    {p.image_url && (
                                        <img
                                            src={p.image_url}
                                            alt={p.name}
                                            className="h-12 w-12 flex-shrink-0 rounded-lg border border-neutral-200 object-cover shadow-sm"
                                        />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">{p.name}</p>
                                        <p className="font-mono text-xs text-muted-foreground">{p.code}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="font-semibold text-green-700 dark:text-green-300">{formatCOP(p.sale_price)}</span>
                                        <Badge variant={p.stock > 0 ? 'secondary' : 'destructive'} className="text-[10px]">
                                            Stock: {p.stock}
                                        </Badge>
                                    </div>
                                    <Plus className="h-5 w-5 flex-shrink-0 text-green-600" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: Cart + Payment ── */}
                <div className="flex w-full flex-col overflow-hidden md:w-[420px]">
                    {/* Client + clear cart + printer status */}
                    <div className="flex items-center gap-2 border-b border-neutral-200 p-3 dark:border-neutral-700">
                        <Select value={clientId} onValueChange={setClientId}>
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

                        {/* Printer indicator */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowPrinterMenu((v) => !v)}
                                className="flex h-9 items-center"
                                title="Configurar impresora"
                            >
                                <PrinterStatusBadge
                                    status={printer.status}
                                    printers={printer.printers}
                                    selectedPrinter={printer.selectedPrinter}
                                    onConnect={printer.connect}
                                />
                            </button>

                            {/* Printer dropdown */}
                            {showPrinterMenu && (
                                <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-neutral-200 bg-white p-3 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
                                    <p className="mb-2 text-xs font-semibold text-muted-foreground">Impresora</p>

                                    {printer.status === 'unavailable' && (
                                        <div className="mb-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                                            QZ Tray no detectado.{' '}
                                            <a
                                                href="https://qz.io/download/"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="underline"
                                            >
                                                Descargar
                                            </a>
                                        </div>
                                    )}

                                    {printer.printers.length > 0 && (
                                        <Select
                                            value={printer.selectedPrinter}
                                            onValueChange={printer.setSelectedPrinter}
                                        >
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

                                    <div className="mt-2 flex items-center gap-2">
                                        <Label className="text-xs text-muted-foreground">Ancho papel:</Label>
                                        <div className="flex gap-1">
                                            {([58, 80] as const).map((w) => (
                                                <button
                                                    key={w}
                                                    type="button"
                                                    onClick={() => printer.setPaperWidth(w)}
                                                    className={`rounded border px-2 py-0.5 text-xs transition-colors ${printer.paperWidth === w ? 'border-orange-400 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : 'border-neutral-200 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800'}`}
                                                >
                                                    {w}mm
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { printer.connect(); }}
                                            className="ml-auto text-xs text-blue-600 hover:underline dark:text-blue-400"
                                        >
                                            Reconectar
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setShowPrinterMenu(false)}
                                        className="mt-2 w-full rounded border border-neutral-200 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            )}
                        </div>

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
                                className="flex h-9 flex-shrink-0 items-center gap-1.5 rounded-lg border border-red-200 px-2 text-xs font-medium text-red-400 hover:border-red-400 hover:bg-red-50 hover:text-red-600 dark:border-red-800 dark:hover:bg-red-900/20"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Vaciar
                            </button>
                        )}
                    </div>

                    {/* Cart list */}
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {cart.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
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
                                                className="flex h-7 w-7 items-center justify-center rounded border border-neutral-200 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                                            >
                                                <Minus className="h-3 w-3" />
                                            </button>
                                            <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                                            <button
                                                type="button"
                                                onClick={() => updateQty(item.product.id, Math.min(item.quantity + 1, item.product.stock))}
                                                disabled={item.quantity >= item.product.stock}
                                                className="flex h-7 w-7 items-center justify-center rounded border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
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
                                            className="flex h-7 w-7 items-center justify-center rounded text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Bottom panel: discount + totals + payment + submit */}
                    <div className="flex-shrink-0 border-t border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900">
                        {/* Discount */}
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
                            {discountType !== 'none' && (
                                <Input
                                    type="number"
                                    min={0}
                                    max={discountType === 'percentage' ? 100 : undefined}
                                    value={discountValue === '0' ? '' : discountValue}
                                    onChange={(e) => setDiscountValue(e.target.value || '0')}
                                    className="h-7 w-20 text-xs"
                                    placeholder="0"
                                />
                            )}
                            {discountAmount > 0 && (
                                <span className="ml-auto text-xs font-semibold text-red-600">− {formatCOP(discountAmount)}</span>
                            )}
                        </div>

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

                        {/* Payment method */}
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

                        {/* Amount paid (cash only) */}
                        {paymentMethod === 'cash' && (
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
                                        onClick={() => { setAmountPaid(total); setAmountPaidDisplay(formatNumber(total)); }}
                                        className="rounded border border-blue-300 bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200"
                                    >
                                        Exacto
                                    </button>
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
                        <div className="px-3 pb-3">
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={submitting || cart.length === 0}
                                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C850C0] to-[#FFCC70] text-base font-bold text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-40"
                            >
                                {submitting ? 'Procesando...' : (
                                    <>
                                        Cobrar {total > 0 && formatCOP(total)}
                                        <kbd className="rounded border border-white/40 bg-white/20 px-1.5 py-0.5 text-xs font-normal">F9</kbd>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
