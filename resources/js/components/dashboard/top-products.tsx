import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

const RANK_COLORS = [
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
];

export function TopProducts({ products }: TopProductsProps) {
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
                            <div
                                key={product.id}
                                className={`flex items-center gap-2 px-3 py-2.5 md:gap-3 md:px-5 md:py-3 ${index !== 0 ? 'border-t border-border/60' : ''}`}
                            >
                                {/* Rank */}
                                <div
                                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${RANK_COLORS[index] ?? 'bg-muted text-muted-foreground'}`}
                                >
                                    {index + 1}
                                </div>

                                {/* Product info */}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs leading-tight font-medium">{product.name}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {product.code} · {product.sales_count} {product.sales_count === 1 ? 'venta' : 'ventas'}
                                    </p>
                                </div>

                                {/* Stats */}
                                <div className="flex-shrink-0 text-right">
                                    <p className="text-xs font-semibold tabular-nums">{product.total_quantity} uds</p>
                                    <p className="text-[11px] text-muted-foreground tabular-nums">{formatCurrency(product.total_amount)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
