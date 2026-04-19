import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ChevronDown, Clock, ExternalLink, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

interface PendingSaleProduct {
    product_id: number;
    name: string;
    quantity: number;
}

interface PendingSale {
    id: number;
    code: string;
    total: number;
    seller?: { name: string };
    branch?: { name: string };
    products: PendingSaleProduct[];
}

interface PendingSalesAlertProps {
    sales: PendingSale[];
    total: number;
}

export function PendingSalesAlert({ sales, total }: PendingSalesAlertProps) {
    const [expanded, setExpanded] = useState(true);

    if (total === 0 && sales.length === 0) return null;

    const hidden = total - sales.length;

    return (
        <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20">
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-blue-100/60 dark:hover:bg-blue-900/20"
            >
                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-200 dark:bg-blue-900/60">
                        <Clock className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                        {total} {total === 1 ? 'venta pendiente' : 'ventas pendientes'} —{' '}
                        <span className="font-normal">el stock no se ha descontado todavía</span>
                    </span>
                    <div className="flex items-center gap-1 rounded-md border border-blue-300 bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        <TriangleAlert className="h-3 w-3" />
                        No descuenta inventario
                    </div>
                </div>
                <ChevronDown
                    className={cn(
                        'ml-2 h-4 w-4 flex-shrink-0 text-blue-600 transition-transform duration-200 dark:text-blue-400',
                        expanded && 'rotate-180',
                    )}
                />
            </button>

            {expanded && (
                <div className="border-t border-blue-200 px-4 py-3 dark:border-blue-900/40">
                    <p className="mb-3 text-xs text-blue-700 dark:text-blue-400">
                        Estas ventas están registradas pero <strong>no se han cobrado ni descontado del inventario</strong>. Si ya entregaste
                        productos físicamente, completa la venta para que el stock se actualice correctamente.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {sales.map((sale) => (
                            <div
                                key={sale.id}
                                className="flex items-start justify-between rounded-lg border border-blue-100 bg-white px-3 py-2 dark:border-blue-900/30 dark:bg-blue-950/30"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-semibold text-blue-900 dark:text-blue-100">#{sale.code}</p>
                                    {sale.seller && (
                                        <p className="truncate text-xs text-blue-600/70 dark:text-blue-400/60">{sale.seller.name}</p>
                                    )}
                                    <ul className="mt-1 space-y-0.5">
                                        {sale.products.slice(0, 3).map((p, i) => (
                                            <li key={`${p.product_id}-${i}`} className="truncate text-[11px] text-blue-700 dark:text-blue-300">
                                                {p.quantity}× {p.name}
                                            </li>
                                        ))}
                                        {sale.products.length > 3 && (
                                            <li className="text-[11px] text-blue-500">+{sale.products.length - 3} más</li>
                                        )}
                                    </ul>
                                </div>
                                <div className="ml-3 flex flex-shrink-0 flex-col items-end gap-1">
                                    <p className="text-xs font-bold text-blue-700 dark:text-blue-300">{formatCurrency(sale.total)}</p>
                                    <Link
                                        href={`${route('pos.index')}?pending=${sale.id}`}
                                        className="flex h-6 w-6 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/60"
                                        title="Abrir en POS para completar"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                    {hidden > 0 && (
                        <p className="mt-2 text-[11px] text-blue-500 dark:text-blue-400">
                            +{hidden} {hidden === 1 ? 'venta pendiente no mostrada' : 'ventas pendientes no mostradas'} — ábrelas desde{' '}
                            <Link href={route('pos.index')} className="underline">
                                el POS → Cotizaciones
                            </Link>
                            .
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
