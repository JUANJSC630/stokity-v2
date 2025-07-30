import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DailySale {
    date: string;
    total_sales: number;
    total_amount: number;
}

interface SalesChartProps {
    sales: DailySale[];
}

export function SalesChart({ sales }: SalesChartProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const maxAmount = Math.max(...sales.map(s => s.total_amount), 1);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                    Ventas de los Últimos 7 Días
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {sales.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No hay datos de ventas</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sales.map((sale) => {
                                const amountPercentage = (sale.total_amount / maxAmount) * 100;
                                
                                return (
                                    <div key={sale.date} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">
                                                {format(new Date(sale.date), 'EEE dd', { locale: es })}
                                            </span>
                                            <div className="text-right">
                                                <div className="font-medium">
                                                    {sale.total_sales} ventas
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {formatCurrency(sale.total_amount)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center space-x-2">
                                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                    <div 
                                                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                                                        style={{ width: `${amountPercentage}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted-foreground w-12 text-right">
                                                    {amountPercentage.toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
} 