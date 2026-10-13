import { formatCurrency } from '@/lib/format';
import { Link } from '@inertiajs/react';
import { ChevronRight, HandCoins } from 'lucide-react';

export interface OverdueCredits {
    count: number;
    balance: number;
}

/** Credits that are past their due date and how much is still owed on them. */
export function OverdueCreditsAlert({ overdue, href }: { overdue?: OverdueCredits | null; href: string }) {
    if (!overdue || overdue.count === 0) return null;

    return (
        <Link
            href={href}
            className="flex min-h-14 items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 transition-colors hover:bg-red-100/70 dark:border-red-900/50 dark:bg-red-950/20 dark:hover:bg-red-950/40"
        >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-red-200 dark:bg-red-900/60">
                <HandCoins className="size-3.5 text-red-700 dark:text-red-400" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 text-sm font-semibold text-red-900 dark:text-red-100">
                {overdue.count} {overdue.count === 1 ? 'crédito vencido' : 'créditos vencidos'}
                <span className="block font-normal text-red-800/80 tabular-nums dark:text-red-200/80">
                    {formatCurrency(overdue.balance)} por cobrar
                </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
        </Link>
    );
}
