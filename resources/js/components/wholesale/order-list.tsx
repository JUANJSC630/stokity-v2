import { SwipeActions, SwipeActionsRow } from '@/components/ui/arc/swipe-actions';
import { StaggerItem } from '@/components/ui/bencho/stagger-item';
import { formatCurrency } from '@/lib/format';
import { type WholesaleSale } from '@/types';
import { Link, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, Pencil } from 'lucide-react';
import { OrderMarker, OrderStatusPill } from './wholesale-meta';

interface OrderListProps {
    orders: WholesaleSale[];
    canUpdate: boolean;
}

const dateOf = (order: WholesaleSale): string => format(new Date(order.date), 'd MMM yyyy', { locale: es });

/** Phones: one tappable row per order; swipe (or the row menu) to view or, for a completed order, edit it. */
export function OrderCards({ orders, canUpdate }: OrderListProps) {
    return (
        <SwipeActions label={`${orders.length} pedido(s) mayorista(s)`}>
            {orders.map((order, index) => (
                <SwipeActionsRow
                    key={order.id}
                    label={`Pedido ${order.code}`}
                    fullSwipe={false}
                    trailing={[
                        ...(canUpdate && order.status === 'completed'
                            ? [
                                  {
                                      label: 'Editar',
                                      icon: <Pencil />,
                                      tone: 'neutral' as const,
                                      onSelect: () => router.visit(`/wholesale/${order.id}/edit`),
                                      keepRow: true,
                                  },
                              ]
                            : []),
                        {
                            label: 'Ver',
                            icon: <Eye />,
                            tone: 'accent' as const,
                            onSelect: () => router.visit(`/wholesale/${order.id}`),
                            keepRow: true,
                        },
                    ]}
                >
                    <StaggerItem index={index}>
                        <Link href={`/wholesale/${order.id}`} className="flex min-w-0 items-center gap-3">
                            <OrderMarker status={order.status} />
                            <span className="flex min-w-0 flex-1 flex-col gap-1">
                                <span className="flex items-baseline justify-between gap-2">
                                    <span className="min-w-0 truncate text-[15px] leading-tight font-semibold">
                                        {order.client?.name ?? 'Sin cliente'}
                                    </span>
                                    <span className="shrink-0 text-[15px] font-bold tabular-nums">{formatCurrency(order.total)}</span>
                                </span>
                                <span className="truncate text-xs text-muted-foreground">
                                    <span className="font-mono">{order.code}</span> · {dateOf(order)}
                                </span>
                                <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                    <span className="min-w-0 truncate">
                                        Vendedor: {order.seller?.name} · <span className="capitalize">{order.payment_method}</span>
                                    </span>
                                    <OrderStatusPill status={order.status} />
                                </span>
                            </span>
                        </Link>
                    </StaggerItem>
                </SwipeActionsRow>
            ))}
        </SwipeActions>
    );
}

/** Desktop: a table whose rows open the order, with the edit shortcut for completed ones. */
export function OrderTable({ orders, canUpdate }: OrderListProps) {
    return (
        <table className="w-full text-sm">
            <caption className="sr-only">Pedidos mayoristas</caption>
            <thead>
                <tr className="border-b border-border/60 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                    <th scope="col" className="px-6 py-3 font-medium">
                        Pedido
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                        Fecha
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                        Vendedor
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
                    <th scope="col" className="w-24 px-6 py-3">
                        <span className="sr-only">Acciones</span>
                    </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
                {orders.map((order) => (
                    <tr
                        key={order.id}
                        onClick={() => router.visit(`/wholesale/${order.id}`)}
                        className="group cursor-pointer transition-colors hover:bg-muted/40"
                    >
                        <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                                <OrderMarker status={order.status} />
                                <div className="min-w-0">
                                    <Link
                                        href={`/wholesale/${order.id}`}
                                        onClick={(event) => event.stopPropagation()}
                                        className="block truncate font-medium hover:underline"
                                    >
                                        {order.client?.name ?? 'Sin cliente'}
                                    </Link>
                                    <p className="font-mono text-xs text-muted-foreground">{order.code}</p>
                                </div>
                            </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{dateOf(order)}</td>
                        <td className="px-3 py-3 text-muted-foreground">Vendedor: {order.seller?.name}</td>
                        <td className="px-3 py-3 text-muted-foreground capitalize">{order.payment_method}</td>
                        <td className="px-3 py-3">
                            <OrderStatusPill status={order.status} />
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatCurrency(order.total)}</td>
                        <td className="px-6 py-3">
                            <div className="flex justify-end gap-1 opacity-60 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                                {canUpdate && order.status === 'completed' && (
                                    <Link
                                        href={`/wholesale/${order.id}/edit`}
                                        onClick={(event) => event.stopPropagation()}
                                        aria-label={`Editar pedido ${order.code}`}
                                        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                                    >
                                        <Pencil className="size-4" aria-hidden="true" />
                                    </Link>
                                )}
                                <Link
                                    href={`/wholesale/${order.id}`}
                                    onClick={(event) => event.stopPropagation()}
                                    aria-label={`Ver pedido ${order.code}`}
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
