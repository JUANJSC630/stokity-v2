import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { formatCurrency } from '@/lib/format';
import { Link } from '@inertiajs/react';
import { ClipboardList, Trash2 } from 'lucide-react';

export interface PendingQuote {
    id: number;
    code: string;
    client_name: string;
    product_count: number;
    total: number;
    /** Quotes that were once completed keep immutable audit history and cannot be deleted. */
    has_audit_history?: boolean;
    created_at: string;
}

interface PendingQuotesSheetProps {
    open: boolean;
    loading: boolean;
    quotes: PendingQuote[];
    onClose: () => void;
    onLoad: (quote: PendingQuote) => void;
    /** Asking for confirmation is the page's job: this only reports the intent. */
    onDelete: (quote: PendingQuote) => void;
}

/** Slide-over with the saved quotes (pending sales) of the branch, to load one into the cart or discard it. */
export function PendingQuotesSheet({ open, loading, quotes, onClose, onLoad, onDelete }: PendingQuotesSheetProps) {
    const onBrand = useOnBrandColor();

    return (
        <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
            <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-sm">
                <SheetHeader className="border-b border-border/60 p-4 pr-12">
                    <SheetTitle className="text-base">Cotizaciones pendientes</SheetTitle>
                    <SheetDescription>Carga una en el carrito para completarla o descártala.</SheetDescription>
                </SheetHeader>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    {loading && <p className="px-4 py-8 text-center text-sm text-muted-foreground">Cargando...</p>}
                    {!loading && quotes.length === 0 && (
                        <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                            <ClipboardList className="size-10 opacity-20" aria-hidden="true" />
                            <p className="text-sm">No hay cotizaciones pendientes</p>
                        </div>
                    )}
                    {!loading && (
                        <ul className="divide-y divide-border/50">
                            {quotes.map((quote) => (
                                <li key={quote.id} className="flex flex-col gap-3 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-[15px] font-semibold">{quote.client_name}</p>
                                            <p className="font-mono text-xs text-muted-foreground">#{quote.code.slice(-8)}</p>
                                        </div>
                                        <span className="shrink-0 text-lg font-bold tabular-nums">{formatCurrency(quote.total)}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {quote.product_count} producto{quote.product_count !== 1 ? 's' : ''}
                                        {' · '}
                                        {new Date(quote.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    {quote.has_audit_history && (
                                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                                            Esta venta tiene historial de auditoría y no se puede borrar desde aquí. Ábrela en Ventas para anularla.
                                        </p>
                                    )}
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onLoad(quote)}
                                            className="h-11 flex-1 rounded-xl bg-[var(--brand-primary)] text-sm font-semibold transition-opacity hover:opacity-90"
                                            style={{ color: onBrand.hex }}
                                        >
                                            Cargar
                                        </button>
                                        {quote.has_audit_history ? (
                                            <Link
                                                href={route('sales.show', quote.id)}
                                                className="flex h-11 items-center justify-center rounded-xl border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
                                            >
                                                Ver venta
                                            </Link>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => onDelete(quote)}
                                                aria-label={`Eliminar cotización ${quote.code.slice(-8)}`}
                                                className="flex size-11 items-center justify-center rounded-xl border border-red-200 text-red-500 transition-colors hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                                            >
                                                <Trash2 className="size-4" aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
