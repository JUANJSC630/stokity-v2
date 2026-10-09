import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { Link } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRight } from 'lucide-react';

interface RecentSale {
    id: number;
    code: string;
    total: number;
    date: string;
    status: string;
    client?: { name: string };
    seller?: { name: string };
    branch?: { name: string };
}

interface RecentSalesProps {
    sales: RecentSale[];
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
    completed: {
        label: 'Completada',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
    },
    pending: {
        label: 'Pendiente',
        className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
    },
    cancelled: { label: 'Cancelada', className: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800' },
    credit_pending: {
        label: 'Crédito Pendiente',
        className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
    },
};

export function RecentSales({ sales }: RecentSalesProps) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Ventas Recientes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {sales.length === 0 ? (
                    <p className="px-6 py-8 text-center text-sm text-muted-foreground">No hay ventas recientes</p>
                ) : (
                    <div>
                        {sales.map((sale, idx) => {
                            const status = STATUS_MAP[sale.status] ?? {
                                label: sale.status,
                                className: 'bg-muted text-muted-foreground border-border',
                            };
                            return (
                                <Link
                                    key={sale.id}
                                    href={route('sales.show', sale.id)}
                                    className={`group flex min-h-16 items-center gap-2 px-3 py-3 transition-colors hover:bg-muted/40 md:gap-3 md:px-5 ${idx !== 0 ? 'border-t border-border/60' : ''}`}
                                >
                                    {/* Client initial dot */}
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/8 text-xs font-bold text-primary">
                                        {sale.client?.name ? sale.client.name.charAt(0).toUpperCase() : 'C'}
                                    </div>

                                    {/* Main info */}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm leading-tight font-medium">{sale.client?.name || 'Consumidor Final'}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {format(new Date(sale.date), 'd MMM, HH:mm', { locale: es })}
                                            {sale.seller && <> · {sale.seller.name}</>}
                                        </p>
                                    </div>

                                    {/* Amount + status */}
                                    <div className="flex flex-shrink-0 flex-col items-end gap-1">
                                        <span className="text-sm font-semibold tabular-nums">{formatCurrency(sale.total)}</span>
                                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${status.className}`}>
                                            {status.label}
                                        </span>
                                    </div>

                                    <ArrowRight className="ml-1 h-3 w-3 flex-shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
                                </Link>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
