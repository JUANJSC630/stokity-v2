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

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

export function SalesByBranch({ branches }: SalesByBranchProps) {
    return (
        <div className="rounded-xl border border-border/60 bg-card">
            {/* Header */}
            <div className="flex items-center gap-1.5 px-5 py-4">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground/50" />
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Ventas por Sucursal — Mes Actual
                </p>
            </div>

            {/* Rows */}
            {branches.length === 0 ? (
                <p className="px-5 pb-5 text-center text-sm text-muted-foreground">Sin datos de sucursales</p>
            ) : (
                <div>
                    {branches.map((branch, index) => (
                        <div
                            key={branch.id}
                            className={`flex items-center gap-3 px-5 py-3 ${index !== 0 ? 'border-t border-border/60' : 'border-t border-border/60'}`}
                        >
                            {/* Rank */}
                            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                                {index + 1}
                            </div>

                            {/* Name */}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium">{branch.name}</p>
                                {branch.business_name && (
                                    <p className="truncate text-[11px] text-muted-foreground">{branch.business_name}</p>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="flex-shrink-0 text-right">
                                <p className="text-xs font-semibold tabular-nums">{branch.total_sales} ventas</p>
                                <p className="text-[11px] text-muted-foreground tabular-nums">{formatCurrency(branch.total_amount)}</p>
                                <p className="text-[11px] text-muted-foreground/70 tabular-nums">
                                    prom. {formatCurrency(branch.average_sale)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
