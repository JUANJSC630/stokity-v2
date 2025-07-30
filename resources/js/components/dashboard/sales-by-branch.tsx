import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

interface SalesByBranch {
    id: number;
    name: string;
    business_name: string;
    total_sales: number;
    total_amount: number;
    average_sale: number;
}

interface SalesByBranchProps {
    branches: SalesByBranch[];
}

export function SalesByBranch({ branches }: SalesByBranchProps) {
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
                    <Building2 className="h-5 w-5 text-blue-500" />
                    Ventas por Sucursal
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {branches.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No hay datos de ventas por sucursal</p>
                        </div>
                    ) : (
                        branches.map((branch, index) => (
                            <div key={branch.id} className="flex items-center justify-between p-3 rounded-lg border">
                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                                        #{index + 1}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">{branch.name}</p>
                                        {branch.business_name && (
                                            <p className="text-xs text-muted-foreground">
                                                {branch.business_name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium">
                                        {branch.total_sales} ventas
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatCurrency(branch.total_amount)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Promedio: {formatCurrency(branch.average_sale)}
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