import { SwipeActions, SwipeActionsRow } from '@/components/ui/arc/swipe-actions';
import { StaggerItem } from '@/components/ui/bencho/stagger-item';
import { formatCurrency, formatDateTime, formatRelativeTime } from '@/lib/format';
import { type Sale } from '@/types';
import { Link, router } from '@inertiajs/react';
import { Eye, Pencil } from 'lucide-react';
import { isCreditLinked, paymentMethodLabel, SaleStatusMarker, SaleStatusPill } from './sale-status';

interface SalesListProps {
    sales: Sale[];
    canEdit: boolean;
}

function clientName(sale: Sale): string {
    return sale.client?.name || 'Consumidor final';
}

/** Phones: one tappable row per sale, with swipe actions and the same actions in a menu for keyboard users. */
export function SalesCards({ sales, canEdit }: SalesListProps) {
    return (
        <SwipeActions label={`${sales.length} venta(s)`}>
            {sales.map((sale, index) => (
                <SwipeActionsRow
                    key={sale.id}
                    label={`Venta ${sale.code}`}
                    fullSwipe={false}
                    trailing={[
                        ...(canEdit && !isCreditLinked(sale)
                            ? [
                                  {
                                      label: 'Editar',
                                      icon: <Pencil />,
                                      tone: 'neutral' as const,
                                      onSelect: () => router.visit(route('sales.edit', sale.id)),
                                      keepRow: true,
                                  },
                              ]
                            : []),
                        {
                            label: 'Ver',
                            icon: <Eye />,
                            tone: 'accent' as const,
                            onSelect: () => router.visit(route('sales.show', sale.id)),
                            keepRow: true,
                        },
                    ]}
                >
                    <StaggerItem index={index}>
                        <Link href={route('sales.show', sale.id)} className="flex min-w-0 items-center gap-3">
                            <SaleStatusMarker status={sale.status} />
                            <span className="flex min-w-0 flex-1 flex-col gap-1">
                                <span className="truncate text-[15px] leading-tight font-semibold">{clientName(sale)}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {sale.code} · {formatRelativeTime(sale.date)} · {paymentMethodLabel(sale.payment_method)}
                                </span>
                                <span className="mt-0.5 flex items-end justify-between gap-2">
                                    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                                        <SaleStatusPill status={sale.status} />
                                        {sale.credit_sale_id && (
                                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                                                Crédito
                                            </span>
                                        )}
                                    </span>
                                    <span className="shrink-0 text-base font-bold tabular-nums">{formatCurrency(sale.total)}</span>
                                </span>
                            </span>
                        </Link>
                    </StaggerItem>
                </SwipeActionsRow>
            ))}
        </SwipeActions>
    );
}

/** Tablets and desktops: a dense table whose rows open the sale. */
export function SalesTable({ sales, canEdit }: SalesListProps) {
    return (
        <table className="w-full text-sm">
            <caption className="sr-only">Ventas</caption>
            <thead>
                <tr className="border-b border-border/60 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                    <th scope="col" className="px-6 py-3 font-medium">
                        Venta
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                        Fecha
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                        Pago
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                        Estado
                    </th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">
                        Total
                    </th>
                    <th scope="col" className="w-24 px-6 py-3 text-right font-medium">
                        <span className="sr-only">Acciones</span>
                    </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
                {sales.map((sale) => (
                    <tr
                        key={sale.id}
                        onClick={() => router.visit(route('sales.show', sale.id))}
                        className="group cursor-pointer transition-colors hover:bg-muted/40"
                    >
                        <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                                <SaleStatusMarker status={sale.status} />
                                <div className="min-w-0">
                                    <Link
                                        href={route('sales.show', sale.id)}
                                        onClick={(event) => event.stopPropagation()}
                                        className="block truncate font-medium hover:underline"
                                    >
                                        {clientName(sale)}
                                    </Link>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {sale.code}
                                        {sale.seller?.name ? ` · ${sale.seller.name}` : ''}
                                    </p>
                                </div>
                            </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{formatDateTime(sale.date)}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{paymentMethodLabel(sale.payment_method)}</td>
                        <td className="px-3 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <SaleStatusPill status={sale.status} />
                                {sale.credit_sale_id && (
                                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                                        Crédito
                                    </span>
                                )}
                            </div>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatCurrency(sale.total)}</td>
                        <td className="px-6 py-3">
                            <div className="flex justify-end gap-1 opacity-60 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                                {canEdit && !isCreditLinked(sale) && (
                                    <Link
                                        href={route('sales.edit', sale.id)}
                                        onClick={(event) => event.stopPropagation()}
                                        aria-label={`Editar venta ${sale.code}`}
                                        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                                    >
                                        <Pencil className="size-4" aria-hidden="true" />
                                    </Link>
                                )}
                                <Link
                                    href={route('sales.show', sale.id)}
                                    onClick={(event) => event.stopPropagation()}
                                    aria-label={`Ver venta ${sale.code}`}
                                    className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    <Eye className="size-4" aria-hidden="true" />
                                </Link>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
