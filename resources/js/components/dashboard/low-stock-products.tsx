import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { AlertTriangle, ChevronDown, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface LowStockProduct {
    id: number;
    name: string;
    code: string;
    stock: number;
    min_stock: number;
    category?: {
        name: string;
    };
    branch?: {
        name: string;
    };
}

interface LowStockProductsProps {
    products: LowStockProduct[];
}

export function LowStockProducts({ products }: LowStockProductsProps) {
    const [expanded, setExpanded] = useState(true);

    if (products.length === 0) return null;

    const outOfStock = products.filter((p) => p.stock === 0);
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.min_stock);

    return (
        <div className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
            {/* Header / toggle */}
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-amber-100/60 dark:hover:bg-amber-900/20"
            >
                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-900/60">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                    </div>
                    <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                        Alerta de inventario —{' '}
                        <span className="font-normal">
                            {products.length} {products.length === 1 ? 'producto requiere atención' : 'productos requieren atención'}
                        </span>
                    </span>
                    <div className="flex items-center gap-1.5">
                        {outOfStock.length > 0 && (
                            <Badge variant="destructive" className="px-2 py-0 text-xs">
                                {outOfStock.length} sin stock
                            </Badge>
                        )}
                        {lowStock.length > 0 && (
                            <Badge className="border-amber-300 bg-amber-200 px-2 py-0 text-xs text-amber-800 hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                                {lowStock.length} bajo mínimo
                            </Badge>
                        )}
                    </div>
                </div>
                <ChevronDown
                    className={cn('ml-2 h-4 w-4 flex-shrink-0 text-amber-600 transition-transform duration-200 dark:text-amber-400', expanded && 'rotate-180')}
                />
            </button>

            {/* Product list */}
            {expanded && (
                <div className="border-t border-amber-200 px-4 py-3 dark:border-amber-900/40">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {products.map((product) => (
                            <div
                                key={product.id}
                                className="flex items-center justify-between rounded-lg border border-amber-100 bg-white px-3 py-2 dark:border-amber-900/30 dark:bg-amber-950/30"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-amber-900 dark:text-amber-100">{product.name}</p>
                                    <p className="truncate text-xs text-amber-600/70 dark:text-amber-400/60">
                                        {product.code}
                                        {product.category && ` · ${product.category.name}`}
                                    </p>
                                </div>
                                <div className="ml-3 flex flex-shrink-0 items-center gap-2">
                                    <div className="text-right">
                                        <p className={cn('text-xs font-bold', product.stock === 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400')}>
                                            {product.stock === 0 ? 'Sin stock' : `${product.stock} uds`}
                                        </p>
                                        <p className="text-xs text-amber-500/70 dark:text-amber-500/50">mín {product.min_stock}</p>
                                    </div>
                                    <Link
                                        href={route('products.show', product.id)}
                                        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-600 transition-colors hover:bg-amber-100 hover:text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/60"
                                        title="Ver producto"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
