import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { AlertTriangle, ChevronDown, Download, ExternalLink } from 'lucide-react';
import { useCallback, useState } from 'react';

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

function StockLevel({ stock, minStock }: { stock: number; minStock: number }) {
    const percent = minStock > 0 ? Math.min(100, Math.round((stock / minStock) * 100)) : 0;
    const isOut = stock === 0;

    return (
        <div className="flex items-center gap-2">
            <div
                role="meter"
                aria-label="Nivel de stock frente al mínimo"
                aria-valuemin={0}
                aria-valuemax={minStock}
                aria-valuenow={Math.min(stock, minStock)}
                aria-valuetext={isOut ? 'Sin stock' : `${stock} de ${minStock} unidades mínimas`}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-900/40"
            >
                <div
                    className={cn('h-full rounded-full transition-[width] duration-500', isOut ? 'bg-red-500' : 'bg-amber-500')}
                    style={{ width: `${Math.max(percent, isOut ? 0 : 6)}%` }}
                />
            </div>
            <p className={cn('text-xs font-semibold tabular-nums', isOut ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-400')}>
                {isOut ? 'Sin stock' : `${stock} de ${minStock}`}
            </p>
        </div>
    );
}

export function LowStockProducts({ products }: LowStockProductsProps) {
    const [expanded, setExpanded] = useState(true);

    const exportCSV = useCallback(() => {
        const header = 'Código,Producto,Categoría,Stock Actual,Stock Mínimo\n';
        const rows = products.map((p) => `"${p.code}","${p.name}","${p.category?.name || ''}",${p.stock},${p.min_stock}`).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock-bajo-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [products]);

    if (products.length === 0) return null;

    const outOfStock = products.filter((p) => p.stock === 0);
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.min_stock);

    return (
        <div className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="flex items-center">
                <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    aria-expanded={expanded}
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-amber-100/60 dark:hover:bg-amber-900/20"
                >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-900/60">
                        <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                            Alerta de inventario
                            <span className="font-normal">
                                {' — '}
                                {products.length} {products.length === 1 ? 'producto requiere atención' : 'productos requieren atención'}
                            </span>
                        </span>
                        <span className="flex flex-wrap items-center gap-1.5">
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
                        </span>
                    </span>
                    <ChevronDown
                        className={cn(
                            'h-4 w-4 flex-shrink-0 text-amber-600 transition-transform duration-200 dark:text-amber-400',
                            expanded && 'rotate-180',
                        )}
                        aria-hidden="true"
                    />
                </button>
                <button
                    type="button"
                    onClick={exportCSV}
                    aria-label="Exportar lista de stock bajo como CSV"
                    title="Exportar lista de stock bajo como CSV"
                    className="mr-2 flex h-11 w-11 flex-shrink-0 items-center justify-center gap-1 rounded-lg border border-amber-300 bg-amber-100 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-200 sm:w-auto sm:px-3 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Exportar</span>
                </button>
            </div>

            {/* Product list */}
            {expanded && (
                <div className="border-t border-amber-200 px-4 py-3 dark:border-amber-900/40">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {products.map((product) => (
                            <div
                                key={product.id}
                                className="flex flex-col gap-2 rounded-lg border border-amber-100 bg-white px-3 py-2.5 dark:border-amber-900/30 dark:bg-amber-950/30"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-amber-900 dark:text-amber-100">{product.name}</p>
                                        <p className="truncate text-xs text-amber-700/80 dark:text-amber-400/70">
                                            {product.code}
                                            {product.category && ` · ${product.category.name}`}
                                        </p>
                                    </div>
                                    <Link
                                        href={route('products.show', product.id)}
                                        aria-label={`Ver producto ${product.name}`}
                                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/60"
                                    >
                                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                    </Link>
                                </div>
                                <StockLevel stock={product.stock} minStock={product.min_stock} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
