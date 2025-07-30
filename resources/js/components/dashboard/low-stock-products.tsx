import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Productos con Bajo Stock
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {products.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No hay productos con bajo stock</p>
                        </div>
                    ) : (
                        products.map((product) => {
                            const stockStatus = getStockStatus(product.stock, product.min_stock);
                            
                            return (
                                <div key={product.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                                    {/* Información del producto */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{product.name}</p>
                                        
                                        {/* Código, categoría y sucursal */}
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                                            <span className="text-xs text-muted-foreground truncate">
                                                {product.code}
                                            </span>
                                            {product.category && (
                                                <>
                                                    <span className="hidden sm:inline text-xs text-muted-foreground">•</span>
                                                    <span className="text-xs text-muted-foreground truncate">
                                                        {product.category.name}
                                                    </span>
                                                </>
                                            )}
                                            {product.branch && (
                                                <>
                                                    <span className="hidden sm:inline text-xs text-muted-foreground">•</span>
                                                    <span className="text-xs text-muted-foreground truncate">
                                                        {product.branch.name}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Stock y estado */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-shrink-0">
                                        <div className="text-right">
                                            <p className="text-sm font-medium">
                                                Stock: {product.stock}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Mín: {product.min_stock}
                                            </p>
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