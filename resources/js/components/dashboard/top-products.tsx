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

export function TopProducts({ products }: TopProductsProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Productos Más Vendidos
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {products.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No hay datos de productos vendidos</p>
                        </div>
                    ) : (
                        products.map((product, index) => (
                            <div key={product.id} className="flex items-center justify-between p-3 rounded-lg border">
                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                                        #{index + 1}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">{product.name}</p>
                                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                            <span>{product.code}</span>
                                            <span>•</span>
                                            <span>{product.sales_count} ventas</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium">
                                        {product.total_quantity} unidades
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatCurrency(product.total_amount)}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
} 