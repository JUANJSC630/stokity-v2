import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface CreditProgressProps {
    paid: number;
    total: number;
    installments?: number | null;
    installmentAmount?: number | null;
    className?: string;
}

const cop = (value: number): string => formatCurrency(Number(value));

/**
 * The money story of a credit: what is paid, what is missing and how far along it is. With an installment plan the bar
 * is split in ticks, one per installment, filled as much as what was paid covers.
 */
export function CreditProgress({ paid, total, installments, installmentAmount, className }: CreditProgressProps) {
    const percent = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
    const missing = Number(total) - Number(paid);
    const tone = percent >= 100 ? 'bg-emerald-500' : percent > 50 ? 'bg-blue-500' : 'bg-amber-500';
    const ticks = installments && installments > 1 ? installments : 0;
    const perTick = ticks > 0 ? (installmentAmount && installmentAmount > 0 ? Number(installmentAmount) : total / ticks) : 0;

    return (
        <div className={cn('space-y-3', className)}>
            <div className="flex items-baseline justify-between gap-3">
                <span className="text-3xl font-bold tracking-tight tabular-nums">
                    <RollingNumber value={Number(paid)} format={cop} intro />
                </span>
                <span className="text-sm text-muted-foreground">de {cop(total)}</span>
            </div>

            {ticks > 0 ? (
                <div className="flex gap-1.5" role="img" aria-label={`${Math.min(ticks, Math.floor(paid / perTick))} de ${ticks} cuotas cubiertas`}>
                    {Array.from({ length: ticks }, (_, index) => {
                        const covered = Math.min(1, Math.max(0, (paid - index * perTick) / perTick));
                        return (
                            <span key={index} className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                                <span
                                    className={cn('block h-full rounded-full transition-[width] duration-700', tone)}
                                    style={{ width: `${covered * 100}%` }}
                                />
                            </span>
                        );
                    })}
                </div>
            ) : (
                <div className="h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${Math.round(percent)}% pagado`}>
                    <div className={cn('h-full rounded-full transition-[width] duration-700', tone)} style={{ width: `${percent}%` }} />
                </div>
            )}

            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{Math.round(percent)}% pagado</span>
                {missing > 0 && <span className="font-semibold text-orange-600 dark:text-orange-400">Falta: {cop(missing)}</span>}
            </div>
        </div>
    );
}
