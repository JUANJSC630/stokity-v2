import { GrowBar } from '@/components/ui/bencho/grow-bar';
import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { StaggerItem } from '@/components/ui/bencho/stagger-item';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { TrendingUp } from 'lucide-react';

interface TopProduct {
    id: number;
    name: string;
    code: string;
    image?: string;
    total_quantity: number;
    total_amount: number;
    sales_count: number;
}

interface TopProductsProps {
    products: TopProduct[];
}

const RANK_COLORS = [
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
];

export function TopProducts({ products }: TopProductsProps) {
    const maxQuantity = Math.max(1, ...products.map((product) => product.total_quantity));

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    Más Vendidos
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {products.length === 0 ? (
                    <p className="px-6 py-8 text-center text-sm text-muted-foreground">Sin datos de ventas</p>
                ) : (
                    <div>
                        {products.map((product, index) => (
                            <StaggerItem
                                key={product.id}
                                index={index}
                                className={`flex items-center gap-3 px-3 py-3 md:px-5 ${index !== 0 ? 'border-t border-border/60' : ''}`}
                            >
                                {/* Rank */}
                                <div
                                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${RANK_COLORS[index] ?? 'bg-muted text-muted-foreground'}`}
                                >
                                    {index + 1}
                                </div>

                                {/* Product info */}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm leading-tight font-medium">{product.name}</p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {product.code} · {product.sales_count} {product.sales_count === 1 ? 'venta' : 'ventas'}
                                    </p>
                                    <div aria-hidden="true" className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                                        <GrowBar
                                            className="bg-[var(--brand-primary)]"
                                            percent={Math.max(4, Math.round((product.total_quantity / maxQuantity) * 100))}
                                            delay={index * 50}
                                        />
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex-shrink-0 text-right">
                                    <p className="flex justify-end gap-1 text-sm font-semibold tabular-nums">
                                        <RollingNumber value={product.total_quantity} format={(value) => String(value)} />
                                        <span>uds</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(product.total_amount)}</p>
                                </div>
                            </StaggerItem>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
