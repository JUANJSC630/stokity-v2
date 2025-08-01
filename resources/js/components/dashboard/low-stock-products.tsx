import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

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
    const getStockStatus = (stock: number, minStock: number) => {
        if (stock === 0) {
            return { variant: 'destructive' as const, text: 'Sin stock' };
        } else if (stock <= minStock) {
            return { variant: 'secondary' as const, text: 'Bajo stock' };
        }
        return { variant: 'default' as const, text: 'Normal' };
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Productos con Bajo Stock
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {products.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            <p>No hay productos con bajo stock</p>
                        </div>
                    ) : (
                        products.map((product) => {
                            const stockStatus = getStockStatus(product.stock, product.min_stock);

                            return (
                                <div
                                    key={product.id}
                                    className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3 transition-colors hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-700 dark:hover:bg-neutral-800"
                                >
                                    {/* Información del producto */}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{product.name}</p>

                                        {/* Código, categoría y sucursal */}
                                        <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                                            <span className="truncate text-xs text-muted-foreground">{product.code}</span>
                                            {product.category && (
                                                <>
                                                    <span className="hidden text-xs text-muted-foreground sm:inline">•</span>
                                                    <span className="truncate text-xs text-muted-foreground">{product.category.name}</span>
                                                </>
                                            )}
                                            {product.branch && (
                                                <>
                                                    <span className="hidden text-xs text-muted-foreground sm:inline">•</span>
                                                    <span className="truncate text-xs text-muted-foreground">{product.branch.name}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stock y estado */}
                                    <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                                        <div className="text-right">
                                            <p className="text-sm font-medium">Stock: {product.stock}</p>
                                            <p className="text-xs text-muted-foreground">Mín: {product.min_stock}</p>
                                        </div>
                                        <div className="flex justify-end sm:justify-start">
                                            <Badge variant={stockStatus.variant} className="text-xs">
                                                {stockStatus.text}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
