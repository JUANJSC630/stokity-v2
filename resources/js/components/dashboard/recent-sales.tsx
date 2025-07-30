import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface RecentSale {
    id: number;
    code: string;
    total: number;
    date: string;
    status: string;
    client?: {
        name: string;
    };
    seller?: {
        name: string;
    };
    branch?: {
        name: string;
    };
}

interface RecentSalesProps {
    sales: RecentSale[];
}

export function RecentSales({ sales }: RecentSalesProps) {

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge variant="default" className="text-xs">Completada</Badge>;
            case 'pending':
                return <Badge variant="secondary" className="text-xs">Pendiente</Badge>;
            case 'cancelled':
                return <Badge variant="destructive" className="text-xs">Cancelada</Badge>;
            default:
                return <Badge variant="outline" className="text-xs">{status}</Badge>;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-semibold">Ventas Recientes</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {sales.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No hay ventas recientes</p>
                        </div>
                    ) : (
                        sales.map((sale) => (
                            <div key={sale.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                                {/* Cliente y Avatar */}
                                <div className="flex items-start gap-4 min-w-0 flex-1">
                                    <Avatar className="h-10 w-10 flex-shrink-0">
                                        <AvatarFallback className="text-sm">
                                            {sale.client?.name ? getInitials(sale.client.name) : 'CL'}
                                        </AvatarFallback>
                                    </Avatar>
                                    
                                    {/* Información del cliente y venta */}
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <p className="text-sm font-medium truncate">
                                            {sale.client?.name || 'Cliente no especificado'}
                                        </p>
                                        
                                        {/* Código de venta */}
                                        <p className="text-xs text-muted-foreground truncate">
                                            {sale.code}
                                        </p>
                                        
                                        {/* Fecha, hora y vendedor - Responsive */}
                                        <div className="flex flex-col gap-1">
                                            {/* Fecha y hora */}
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(sale.date), 'dd MMM, HH:mm', { locale: es })}
                                            </span>
                                            
                                            {/* Vendedor - Solo mostrar si existe */}
                                            {sale.seller && (
                                                <span className="text-xs text-muted-foreground">
                                                    por {sale.seller.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Monto y Estado */}
                                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                    <span className="text-sm font-semibold">
                                        {formatCurrency(sale.total)}
                                    </span>
                                    {getStatusBadge(sale.status)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
} 