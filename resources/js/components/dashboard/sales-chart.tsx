import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp } from 'lucide-react';

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

    // Calcular el total de ventas del período para porcentajes reales
    const totalAmount = sales.reduce((sum, sale) => sum + sale.total_amount, 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                    Ventas de los Últimos 7 Días
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {sales.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            <p>No hay datos de ventas</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sales.map((sale) => {
                                // Calcular porcentaje basado en el total del período
                                const amountPercentage = totalAmount > 0 ? (sale.total_amount / totalAmount) * 100 : 0;

                                return (
                                    <div key={sale.date} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">
                                                {format(new Date(sale.date + 'T00:00:00-05:00'), 'EEE dd', { locale: es })}
                                            </span>
                                            <div className="text-right">
                                                <div className="font-medium">{sale.total_sales} ventas</div>
                                                <div className="text-xs text-muted-foreground">{formatCurrency(sale.total_amount)}</div>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center space-x-2">
                                                <div className="h-2 flex-1 rounded-full bg-gray-200">
                                                    <div
                                                        className="h-2 rounded-full bg-purple-500 transition-all duration-300"
                                                        style={{ width: `${amountPercentage}%` }}
                                                    />
                                                </div>
                                                <span className="w-12 text-right text-xs text-muted-foreground">{amountPercentage.toFixed(0)}%</span>
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
