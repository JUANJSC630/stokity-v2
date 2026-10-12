import { StickyActions } from '@/components/admin/sticky-actions';
import { SessionStatusPill, formatCOP } from '@/components/cash/cash-meta';
import { ManualMovements, SalesByMethod } from '@/components/cash/cash-sections';
import { INPUT_CLASS } from '@/components/sales/form-fields';
import { DragStepper } from '@/components/ui/bencho/drag-stepper';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import AppLayout from '@/layouts/app-layout';
import { formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type CashMovement, type CashSession } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { FormEventHandler, useCallback, useState } from 'react';

interface SalesSummary {
    method: string;
    name: string;
    count: number;
    total?: number;
}

type BlindableMovement = Omit<CashMovement, 'amount'> & { amount?: number };

interface Props {
    session: CashSession;
    salesSummary: SalesSummary[];
    movements: BlindableMovement[];
    isBlind: boolean;
    totalSales: number | null;
    expectedCash: number | null;
    creditPaymentsTotal: number | null;
    creditPaymentsCount: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Caja', href: '/cash-sessions' },
    { title: 'Cierre', href: '#' },
];

const DENOMINATIONS = [100000, 50000, 20000, 10000, 5000, 2000, 1000] as const;

const MODE = 'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors';

export default function CashSessionClose({
    session,
    salesSummary,
    movements,
    isBlind,
    totalSales,
    expectedCash,
    creditPaymentsTotal,
    creditPaymentsCount,
}: Props) {
    const onBrand = useOnBrandColor();
    const form = useForm({
        closing_amount_declared: '',
        closing_notes: '',
    });

    const [useDenominations, setUseDenominations] = useState(false);
    const [denomCounts, setDenomCounts] = useState<Record<number, number>>({});
    const [coins, setCoins] = useState('');

    const denomTotal = DENOMINATIONS.reduce((sum, d) => sum + (denomCounts[d] || 0) * d, 0) + (parseInt(coins) || 0);

    const updateDenom = useCallback((denom: number, count: string) => {
        const val = parseInt(count) || 0;
        setDenomCounts((prev) => ({ ...prev, [denom]: Math.max(0, val) }));
    }, []);

    const openedAt = new Date(session.opened_at);
    const duration = Math.round((Date.now() - openedAt.getTime()) / 60000);
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;

    const cashMovementsIn = movements.filter((m) => m.type === 'cash_in').reduce((s, m) => s + Number(m.amount), 0);
    const cashMovementsOut = movements.filter((m) => m.type === 'cash_out').reduce((s, m) => s + Number(m.amount), 0);

    // While counting by denomination, the counted total IS the declared amount: nothing has to be "used" first.
    const declared = useDenominations ? denomTotal : Number(form.data.closing_amount_declared) || 0;
    const hasDeclared = useDenominations ? denomTotal > 0 : form.data.closing_amount_declared !== '';
    const nothingCounted = useDenominations && denomTotal === 0;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (nothingCounted) return;
        form.transform((data) => ({ ...data, closing_amount_declared: useDenominations ? String(denomTotal) : data.closing_amount_declared }));
        form.post(route('cash-sessions.close', session.id));
    };
    const showCredit = isBlind ? creditPaymentsCount > 0 : (creditPaymentsTotal ?? 0) > 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cierre de Caja" />

            <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Cierre de Caja — Turno #{session.id}</h1>
                        <p className="text-sm text-muted-foreground">
                            Abierta a las {formatTime(openedAt)}
                            {' · '}
                            Duración: {hours > 0 ? `${hours}h ` : ''}
                            {mins}m
                        </p>
                    </div>
                    <SessionStatusPill open />
                </div>

                <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
                    <form
                        onSubmit={submit}
                        className="order-first flex flex-col gap-5 lg:sticky lg:top-4 lg:order-none lg:col-start-2 lg:row-start-1"
                    >
                        <section className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
                            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Conteo físico de efectivo</h2>

                            {!isBlind && (
                                <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm dark:bg-blue-950/30">
                                    <div className="flex justify-between gap-3">
                                        <span className="text-blue-700 dark:text-blue-300">Efectivo esperado en caja:</span>
                                        <span className="font-bold text-blue-800 tabular-nums dark:text-blue-200">
                                            {formatCOP(expectedCash ?? 0)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div role="group" aria-label="Forma de contar" className="flex gap-1 rounded-xl bg-muted p-1">
                                <button
                                    type="button"
                                    aria-pressed={!useDenominations}
                                    onClick={() => setUseDenominations(false)}
                                    className={cn(MODE, !useDenominations ? 'bg-background shadow-sm' : 'text-muted-foreground')}
                                >
                                    Monto directo
                                </button>
                                <button
                                    type="button"
                                    aria-pressed={useDenominations}
                                    onClick={() => setUseDenominations(true)}
                                    className={cn(MODE, useDenominations ? 'bg-background shadow-sm' : 'text-muted-foreground')}
                                >
                                    Contar por denominación
                                </button>
                            </div>

                            {useDenominations ? (
                                <div className="flex flex-col gap-3">
                                    <p className="text-sm font-medium">Desglose por denominación</p>
                                    <ul className="divide-y divide-border/40 rounded-xl border border-border/60">
                                        {DENOMINATIONS.map((denom) => (
                                            <li key={denom} className="flex items-center justify-between gap-3 px-3 py-2">
                                                <div className="min-w-0">
                                                    <span className="text-sm font-medium">{formatCOP(denom)}</span>
                                                    <p className="text-xs text-muted-foreground tabular-nums">
                                                        = {formatCOP((denomCounts[denom] || 0) * denom)}
                                                    </p>
                                                </div>
                                                <DragStepper
                                                    label={`Billetes de ${formatCOP(denom)}`}
                                                    value={denomCounts[denom] || 0}
                                                    min={0}
                                                    max={9999}
                                                    sweepRange={40}
                                                    onChange={(value) => updateDenom(denom, String(value))}
                                                    className="w-40 shrink-0"
                                                />
                                            </li>
                                        ))}
                                        <li className="flex items-center justify-between gap-3 px-3 py-2">
                                            <span className="text-sm font-medium">Monedas</span>
                                            <div className="relative w-40">
                                                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
                                                    $
                                                </span>
                                                <CurrencyInput
                                                    value={Number(coins) || 0}
                                                    onChange={(v) => setCoins(v > 0 ? String(v) : '')}
                                                    placeholder="0"
                                                    aria-label="Monedas"
                                                    className={cn(INPUT_CLASS, 'pl-7 text-right')}
                                                />
                                            </div>
                                        </li>
                                    </ul>
                                    <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
                                        <span className="text-sm font-bold">Total contado:</span>
                                        <span className="text-lg font-bold text-green-700 tabular-nums dark:text-green-300">
                                            {formatCOP(denomTotal)}
                                        </span>
                                    </div>
                                    {hasDeclared ? (
                                        <p className="text-center text-xs text-muted-foreground">
                                            Monto a declarar: <strong>{formatCOP(declared)}</strong>
                                        </p>
                                    ) : (
                                        <p role="status" className="text-center text-xs text-muted-foreground">
                                            Cuenta al menos un billete o moneda, o cambia a «Monto directo».
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <label htmlFor="closing-amount" className="text-sm font-medium">
                                        Efectivo contado físicamente *
                                    </label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-lg text-muted-foreground">
                                            $
                                        </span>
                                        <CurrencyInput
                                            id="closing-amount"
                                            value={declared}
                                            onChange={(v) => form.setData('closing_amount_declared', String(v))}
                                            required
                                            placeholder="0"
                                            className={cn(INPUT_CLASS, 'h-14 pl-8 text-xl font-semibold tabular-nums sm:h-12')}
                                        />
                                    </div>
                                </div>
                            )}
                            {form.errors.closing_amount_declared && (
                                <p role="alert" className="text-xs text-red-500">
                                    {form.errors.closing_amount_declared}
                                </p>
                            )}

                            <div className="space-y-1.5">
                                <label htmlFor="closing-notes" className="text-sm font-medium">
                                    Notas del cierre (opcional)
                                </label>
                                <textarea
                                    id="closing-notes"
                                    value={form.data.closing_notes}
                                    onChange={(e) => form.setData('closing_notes', e.target.value)}
                                    rows={2}
                                    className="w-full rounded-lg border border-border/60 bg-white px-3 py-2 text-base text-black focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none sm:text-sm dark:bg-neutral-800 dark:text-neutral-100"
                                />
                            </div>
                        </section>

                        <StickyActions>
                            <div className="mr-auto min-w-0">
                                <p className="text-[11px] leading-none text-muted-foreground">A declarar</p>
                                <p className="mt-1 text-lg leading-none font-bold tabular-nums">{hasDeclared ? formatCOP(declared) : '—'}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => router.visit(route('pos.index'))}
                                className="flex h-11 items-center justify-center rounded-xl border border-border/60 px-4 text-sm text-muted-foreground hover:bg-muted sm:h-10"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={form.processing || nothingCounted}
                                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50 sm:h-10"
                                style={{ color: onBrand.hex }}
                            >
                                {form.processing && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                                {form.processing ? 'Procesando...' : 'Confirmar cierre de caja'}
                            </button>
                        </StickyActions>
                    </form>

                    <div className="flex flex-col gap-5 lg:col-start-1 lg:row-start-1">
                        <SalesByMethod
                            title="Ventas del turno"
                            rows={salesSummary}
                            isBlind={isBlind}
                            totalLabel="Total ventas"
                            total={totalSales ?? 0}
                        />

                        {movements.length > 0 && (
                            <ManualMovements
                                movements={movements}
                                isBlind={isBlind}
                                detail="notes"
                                footer={
                                    !isBlind && (
                                        <div className="border-t border-border/60 px-5 py-3 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Ingresos manuales</span>
                                                <span className="font-semibold text-green-700 tabular-nums dark:text-green-400">
                                                    +{formatCOP(cashMovementsIn)}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex justify-between">
                                                <span className="text-muted-foreground">Egresos manuales</span>
                                                <span className="font-semibold text-red-600 tabular-nums dark:text-red-400">
                                                    -{formatCOP(cashMovementsOut)}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                }
                            />
                        )}

                        {showCredit && (
                            <section className="rounded-2xl border border-blue-200 bg-card dark:border-blue-900">
                                <div className="flex items-center justify-between gap-3 px-5 py-4">
                                    <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Abonos de crédito</h2>
                                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
                                        {isBlind
                                            ? `${creditPaymentsCount} ${creditPaymentsCount === 1 ? 'abono' : 'abonos'}`
                                            : formatCOP(creditPaymentsTotal ?? 0)}
                                    </span>
                                </div>
                                <p className="border-t border-border/60 px-5 py-3 text-sm text-muted-foreground">
                                    Los abonos de crédito ya están incluidos en los ingresos manuales de arriba.
                                </p>
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
