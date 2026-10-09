import { formatCurrency } from '@/lib/format';
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
    const topAmount = Math.max(1, ...branches.map((branch) => branch.total_amount));

    return (
        <div className="rounded-xl border border-border/60 bg-card">
            {/* Header */}
            <div className="flex items-center gap-1.5 px-5 py-4">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground/50" />
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Ventas por Sucursal — Mes Actual</p>
            </div>

            {/* Rows */}
            {branches.length === 0 ? (
                <p className="px-5 pb-5 text-center text-sm text-muted-foreground">Sin datos de sucursales</p>
            ) : (
                <div>
                    {branches.map((branch, index) => (
                        <div key={branch.id} className="flex items-center gap-3 border-t border-border/60 px-4 py-3 md:px-5">
                            {/* Rank */}
                            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                                {index + 1}
                            </div>

                            {/* Name */}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{branch.name}</p>
                                {branch.business_name && <p className="truncate text-xs text-muted-foreground">{branch.business_name}</p>}
                                <div aria-hidden="true" className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full rounded-full bg-[var(--brand-primary)] transition-[width] duration-700"
                                        style={{ width: `${Math.max(4, Math.round((branch.total_amount / topAmount) * 100))}%` }}
                                    />
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex-shrink-0 text-right">
                                <p className="text-sm font-semibold tabular-nums">{branch.total_sales} ventas</p>
                                <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(branch.total_amount)}</p>
                                <p className="text-xs text-muted-foreground tabular-nums">prom. {formatCurrency(branch.average_sale)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
