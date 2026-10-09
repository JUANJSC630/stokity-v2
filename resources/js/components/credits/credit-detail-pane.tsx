import { Skeleton } from '@/components/ui/skeleton';
import { type CreditSale } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { HandCoins } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { CreditDetailPanel } from './credit-detail-panel';

interface DetailProps {
    credit: CreditSale;
    canCancel: boolean;
    canUpdateInstallments: boolean;
}

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: DetailProps };

/**
 * Loads one credit through its normal Inertia page (the same props the detail page receives) so the master-detail view
 * shows exactly what the standalone page shows, and reloads it after any visit that registers an abono or edits the plan.
 */
export function CreditDetailPane({ id }: { id: number }) {
    const { version } = usePage() as unknown as { version?: string };
    const [state, setState] = useState<State>({ status: 'loading' });

    const load = useCallback(
        async (signal?: AbortSignal) => {
            try {
                const response = await fetch(`/credits/${id}`, {
                    signal,
                    headers: {
                        'X-Inertia': 'true',
                        'X-Inertia-Version': version ?? '',
                        'X-Requested-With': 'XMLHttpRequest',
                        Accept: 'text/html, application/xhtml+xml',
                    },
                });
                if (response.status === 409) {
                    window.location.href = `/credits/${id}`;
                    return;
                }
                if (!response.ok) throw new Error('failed');
                const page = (await response.json()) as { props: DetailProps };
                setState({
                    status: 'ready',
                    data: { credit: page.props.credit, canCancel: page.props.canCancel, canUpdateInstallments: page.props.canUpdateInstallments },
                });
            } catch (error) {
                if ((error as Error).name !== 'AbortError') setState({ status: 'error' });
            }
        },
        [id, version],
    );

    useEffect(() => {
        const controller = new AbortController();
        setState({ status: 'loading' });
        load(controller.signal);
        return () => controller.abort();
    }, [load]);

    useEffect(() => router.on('success', () => void load()), [load]);

    if (state.status === 'loading') {
        return (
            <div aria-busy="true" className="flex flex-col gap-5">
                <Skeleton className="h-10 w-1/2" />
                <div className="grid gap-5 xl:grid-cols-2">
                    <Skeleton className="h-52 rounded-2xl" />
                    <Skeleton className="h-52 rounded-2xl" />
                </div>
                <Skeleton className="h-64 rounded-2xl" />
            </div>
        );
    }

    if (state.status === 'error') {
        return (
            <div className="flex flex-col items-center gap-3 py-24 text-center text-muted-foreground">
                <HandCoins className="size-10 opacity-30" aria-hidden="true" />
                <p className="text-sm">No se pudo cargar este crédito.</p>
                <button
                    type="button"
                    onClick={() => void load()}
                    className="h-10 rounded-lg border border-border/60 px-4 text-sm font-medium text-foreground hover:bg-muted"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    return <CreditDetailPanel {...state.data} headingLevel={2} />;
}
