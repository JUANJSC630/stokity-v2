import { CircleCheck } from 'lucide-react';
import { type ReactNode } from 'react';

interface AttentionPanelProps {
    /** How many things need attention; with none, the panel says everything is in order. */
    count: number;
    children: ReactNode;
}

/** The "what do I have to deal with today" column: stock, pending sales, overdue credits. */
export function AttentionPanel({ count, children }: AttentionPanelProps) {
    return (
        <section aria-label="Para atender" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Para atender</h2>
                {count > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 tabular-nums dark:bg-amber-950/50 dark:text-amber-300">
                        {count}
                    </span>
                )}
            </div>
            {count > 0 ? (
                children
            ) : (
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-4">
                    <CircleCheck className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <div>
                        <p className="text-sm font-semibold">Todo al día</p>
                        <p className="text-xs text-muted-foreground">Sin stock bajo, ventas pendientes ni créditos vencidos.</p>
                    </div>
                </div>
            )}
        </section>
    );
}
