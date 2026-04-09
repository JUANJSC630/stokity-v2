import { Badge } from '@/components/ui/badge';
import { CurrencyInput } from '@/components/ui/currency-input';
import AppLayout from '@/layouts/app-layout';
import { formatTime } from '@/lib/format';
import { type BreadcrumbItem, type CashMovement, type CashSession } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useCallback, useState } from 'react';

interface SalesSummary {
    method: string;
    name: string;
    count: number;
    total: number;
}

interface Props {
    session: CashSession;
    salesSummary: SalesSummary[];
    movements: CashMovement[];
    isBlind: boolean;
    totalSales: number;
    expectedCash: number | null;
    creditPaymentsTotal: number;
}

function formatCOP(value: number | string) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '$0';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(num);
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Caja', href: '/cash-sessions' },
    { title: 'Cierre', href: '#' },
];

export default function CashSessionClose({ session, salesSummary, movements, isBlind, totalSales, expectedCash, creditPaymentsTotal }: Props) {
    const form = useForm({
        closing_amount_declared: '',
        closing_notes: '',
    });

    const DENOMINATIONS = [100000, 50000, 20000, 10000, 5000, 2000, 1000] as const;
    const [useDenominations, setUseDenominations] = useState(false);
    const [denomCounts, setDenomCounts] = useState<Record<number, number>>({});
    const [coins, setCoins] = useState('');

    const denomTotal = DENOMINATIONS.reduce((sum, d) => sum + (denomCounts[d] || 0) * d, 0) + (parseInt(coins) || 0);

    const updateDenom = useCallback((denom: number, count: string) => {
        const val = parseInt(count) || 0;
        setDenomCounts((prev) => ({ ...prev, [denom]: Math.max(0, val) }));
    }, []);

    // Sync denomination total to form
    const syncDenomToForm = useCallback(() => {
        form.setData('closing_amount_declared', String(denomTotal));
    }, [denomTotal, form]);

    const openedAt = new Date(session.opened_at);
    const duration = Math.round((Date.now() - openedAt.getTime()) / 60000);
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;

    const cashMovementsIn = movements.filter((m) => m.type === 'cash_in').reduce((s, m) => s + Number(m.amount), 0);
    const cashMovementsOut = movements.filter((m) => m.type === 'cash_out').reduce((s, m) => s + Number(m.amount), 0);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('cash-sessions.close', session.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cierre de Caja" />

            <div className="mx-auto max-w-2xl space-y-4 p-4">
                {/* Header */}
                <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-bold">Cierre de Caja — Turno #{session.id}</h1>
                            <p className="text-sm text-muted-foreground">
                                Abierta a las {formatTime(openedAt)}
                                {' · '}
                                Duración: {hours > 0 ? `${hours}h ` : ''}
                                {mins}m
                            </p>
                        </div>
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Abierta</Badge>
                    </div>
                </div>

                {/* Sales summary */}
                <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                    <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
                        <h2 className="font-semibold">Ventas del turno</h2>
                    </div>
                    {salesSummary.length === 0 ? (
                        <p className="px-4 py-4 text-sm text-muted-foreground">Sin ventas en este turno</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-100 text-xs text-muted-foreground dark:border-neutral-800">
                                    <th className="px-4 py-2 text-left">Método</th>
                                    <th className="px-4 py-2 text-center"># Ventas</th>
                                    <th className="px-4 py-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {salesSummary.map((row) => (
                                    <tr key={row.method}>
                                        <td className="px-4 py-2">{row.name}</td>
                                        <td className="px-4 py-2 text-center">{row.count}</td>
                                        <td className="px-4 py-2 text-right font-semibold">{formatCOP(row.total)}</td>
                                    </tr>
                                ))}
                                <tr className="border-t-2 border-neutral-200 font-bold dark:border-neutral-700">
                                    <td className="px-4 py-2">Total ventas</td>
                                    <td />
                                    <td className="px-4 py-2 text-right text-green-700 dark:text-green-300">{formatCOP(totalSales)}</td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Cash movements */}
                {movements.length > 0 && (
                    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                        <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
                            <h2 className="font-semibold">Movimientos manuales</h2>
                        </div>
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {movements.map((m) => (
                                <div key={m.id} className="flex items-center justify-between px-4 py-2 text-sm">
                                    <div>
                                        <span
                                            className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-semibold ${m.type === 'cash_in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                        >
                                            {m.type === 'cash_in' ? 'INGRESO' : 'EGRESO'}
                                        </span>
                                        {m.concept}
                                        {m.notes && <span className="text-xs text-muted-foreground"> · {m.notes}</span>}
                                    </div>
                                    <span className={`font-semibold ${m.type === 'cash_in' ? 'text-green-700' : 'text-red-600'}`}>
                                        {m.type === 'cash_in' ? '+' : '-'}
                                        {formatCOP(m.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between border-t border-neutral-200 px-4 py-2 text-sm dark:border-neutral-700">
                            <span className="text-muted-foreground">Ingresos manuales</span>
                            <span className="font-semibold text-green-700">+{formatCOP(cashMovementsIn)}</span>
                        </div>
                        <div className="flex justify-between px-4 py-2 text-sm">
                            <span className="text-muted-foreground">Egresos manuales</span>
                            <span className="font-semibold text-red-600">-{formatCOP(cashMovementsOut)}</span>
                        </div>
                    </div>
                )}

                {/* Credit payments breakdown */}
                {creditPaymentsTotal > 0 && (
                    <div className="rounded-xl border border-blue-200 bg-white dark:border-blue-800 dark:bg-neutral-900">
                        <div className="flex items-center justify-between border-b border-blue-200 px-4 py-3 dark:border-blue-800">
                            <h2 className="font-semibold">Abonos de crédito</h2>
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">{formatCOP(creditPaymentsTotal)}</Badge>
                        </div>
                        <div className="px-4 py-3 text-sm text-muted-foreground">
                            Los abonos de crédito ya están incluidos en los ingresos manuales de arriba.
                        </div>
                    </div>
                )}

                {/* Conteo físico */}
                <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <h2 className="mb-3 font-semibold">Conteo físico de efectivo</h2>

                    {!isBlind && (
                        <div className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-sm dark:bg-blue-900/20">
                            <div className="flex justify-between">
                                <span className="text-blue-700 dark:text-blue-300">Efectivo esperado en caja:</span>
                                <span className="font-bold text-blue-800 dark:text-blue-200">{formatCOP(expectedCash ?? 0)}</span>
                            </div>
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-3">
                        {/* Toggle: monto directo vs desglose */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setUseDenominations(false);
                                }}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${!useDenominations ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}
                            >
                                Monto directo
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setUseDenominations(true);
                                }}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${useDenominations ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}
                            >
                                Contar por denominación
                            </button>
                        </div>

                        {useDenominations ? (
                            <div className="space-y-2">
                                <label className="mb-1 block text-sm font-medium">Desglose por denominación</label>
                                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700">
                                    {DENOMINATIONS.map((denom) => (
                                        <div
                                            key={denom}
                                            className="flex items-center justify-between border-b border-neutral-100 px-3 py-1.5 last:border-b-0 dark:border-neutral-800"
                                        >
                                            <span className="text-sm font-medium">{formatCOP(denom)}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">×</span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={denomCounts[denom] || ''}
                                                    onChange={(e) => updateDenom(denom, e.target.value)}
                                                    placeholder="0"
                                                    className="w-16 rounded border border-neutral-300 px-2 py-1 text-right text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                                                />
                                                <span className="w-24 text-right text-sm text-muted-foreground">
                                                    = {formatCOP((denomCounts[denom] || 0) * denom)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex items-center justify-between border-t border-neutral-200 px-3 py-1.5 dark:border-neutral-700">
                                        <span className="text-sm font-medium">Monedas</span>
                                        <CurrencyInput
                                            value={Number(coins) || 0}
                                            onChange={(v) => setCoins(v > 0 ? String(v) : '')}
                                            placeholder="0"
                                            className="w-28 rounded border border-neutral-300 px-2 py-1 text-right text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between rounded-lg bg-neutral-100 px-3 py-2 dark:bg-neutral-800">
                                    <span className="text-sm font-bold">Total contado:</span>
                                    <span className="text-base font-bold text-green-700 dark:text-green-300">{formatCOP(denomTotal)}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={syncDenomToForm}
                                    className="w-full rounded-lg border border-green-300 bg-green-50 py-2 text-sm font-medium text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
                                >
                                    Usar {formatCOP(denomTotal)} como monto contado
                                </button>
                                {form.data.closing_amount_declared && (
                                    <p className="text-center text-xs text-muted-foreground">
                                        Monto a declarar: <strong>{formatCOP(Number(form.data.closing_amount_declared))}</strong>
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div>
                                <label className="mb-1 block text-sm font-medium">Efectivo contado físicamente *</label>
                                <CurrencyInput
                                    value={Number(form.data.closing_amount_declared) || 0}
                                    onChange={(v) => form.setData('closing_amount_declared', String(v))}
                                    required
                                    placeholder="0"
                                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                                />
                            </div>
                        )}
                        {form.errors.closing_amount_declared && <p className="mt-1 text-xs text-red-500">{form.errors.closing_amount_declared}</p>}
                        <div>
                            <label className="mb-1 block text-sm font-medium">Notas del cierre (opcional)</label>
                            <textarea
                                value={form.data.closing_notes}
                                onChange={(e) => form.setData('closing_notes', e.target.value)}
                                rows={2}
                                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="w-full rounded-xl bg-[var(--brand-primary)] py-3 text-sm font-bold text-white disabled:opacity-50"
                        >
                            {form.processing ? 'Procesando...' : 'Confirmar cierre de caja'}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.visit(route('pos.index'))}
                            className="w-full rounded-lg border border-neutral-200 py-2 text-sm text-muted-foreground hover:bg-neutral-50 dark:border-neutral-700"
                        >
                            Cancelar
                        </button>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
