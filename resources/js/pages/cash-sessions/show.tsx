import { SessionStatusPill, differenceText, differenceWord, formatCOP, formatDifference, formatDuration } from '@/components/cash/cash-meta';
import { ManualMovements, SalesByMethod } from '@/components/cash/cash-sections';
import { Section } from '@/components/sales/form-fields';
import { usePrinter } from '@/hooks/use-printer';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type CashMovement, type CashSession } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface SalesDetail {
    method: string;
    name: string;
    count: number;
    total?: number;
}

interface Props {
    session: CashSession;
    movements: (Omit<CashMovement, 'amount'> & { amount?: number; user?: { id: number; name: string } })[];
    salesDetail: SalesDetail[];
    isBlind: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Historial de Caja', href: '/cash-sessions' },
    { title: 'Arqueo', href: '#' },
];

function Fact({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium break-words">{children}</dd>
        </div>
    );
}

function LedgerRow({ label, value, valueClass, strong }: { label: string; value: string; valueClass?: string; strong?: boolean }) {
    return (
        <div className={cn('flex justify-between gap-3 py-2.5 text-sm', strong && 'font-bold')}>
            <span className={strong ? '' : 'text-muted-foreground'}>{label}</span>
            <span className={cn('tabular-nums', strong ? '' : 'font-medium', valueClass)}>{value}</span>
        </div>
    );
}

export default function CashSessionShow({ session, movements, salesDetail, isBlind }: Props) {
    const printer = usePrinter();
    const [printing, setPrinting] = useState(false);

    async function handlePrint() {
        if (printer.status !== 'connected' || !printer.selectedPrinter) {
            window.print();
            return;
        }
        setPrinting(true);
        try {
            await printer.printCashSession(session.id);
        } catch {
            window.print(); // fallback
        } finally {
            setPrinting(false);
        }
    }

    const openedAt = new Date(session.opened_at);
    const closedAt = session.closed_at ? new Date(session.closed_at) : null;

    const cashIn = movements.filter((m) => m.type === 'cash_in').reduce((s, m) => s + Number(m.amount), 0);
    const cashOut = movements.filter((m) => m.type === 'cash_out').reduce((s, m) => s + Number(m.amount), 0);

    const discrepancy = Number(session.discrepancy ?? 0);
    const totalSales = salesDetail.reduce((s, r) => s + Number(r.total), 0);
    const isOpen = session.status === 'open';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Arqueo — Turno #${session.id}`} />

            <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex items-start gap-3">
                    <Link
                        href={route('cash-sessions.index')}
                        aria-label="Volver al historial"
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                    </Link>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Arqueo</p>
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Turno #{session.id}</h1>
                    </div>
                    <SessionStatusPill open={isOpen} />
                </div>

                <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
                        {session.branch && <Fact label="Sucursal">{session.branch.name}</Fact>}
                        {session.opened_by && <Fact label="Cajero">{session.opened_by.name}</Fact>}
                        <Fact label="Apertura">{formatDateTime(openedAt)}</Fact>
                        {closedAt && <Fact label="Cierre">{formatDateTime(closedAt)}</Fact>}
                        <Fact label="Duración">{formatDuration(session.opened_at, session.closed_at)}</Fact>
                    </dl>
                </section>

                {!isOpen && (
                    <section
                        aria-label="Resultado del cuadre"
                        className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card p-4 sm:p-5"
                    >
                        <div>
                            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Resultado del cuadre</p>
                            <p className={cn('mt-1 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl', differenceText(discrepancy))}>
                                {formatDifference(discrepancy)}
                            </p>
                        </div>
                        <span className={cn('rounded-full bg-muted px-3 py-1.5 text-sm font-semibold', differenceText(discrepancy))}>
                            {differenceWord(discrepancy)}
                        </span>
                    </section>
                )}

                <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    <div className="flex flex-col gap-5">
                        <SalesByMethod title="Ventas por método de pago" rows={salesDetail} isBlind={isBlind} totalLabel="Total" total={totalSales} />
                        {movements.length > 0 && <ManualMovements movements={movements} isBlind={isBlind} detail="user" />}
                    </div>

                    {!isOpen && (
                        <div className="flex flex-col gap-5">
                            <Section title="Cuadre de caja">
                                <div className="divide-y divide-border/40 px-5 pb-3">
                                    <LedgerRow label="+ Fondo inicial" value={formatCOP(session.opening_amount)} />
                                    <LedgerRow
                                        label="+ Ventas en efectivo"
                                        value={formatCOP(session.total_sales_cash)}
                                        valueClass="text-green-700 dark:text-green-400"
                                    />
                                    <LedgerRow
                                        label="+ Ingresos manuales"
                                        value={`+${formatCOP(cashIn)}`}
                                        valueClass="text-green-700 dark:text-green-400"
                                    />
                                    <LedgerRow
                                        label="− Egresos manuales"
                                        value={`-${formatCOP(cashOut)}`}
                                        valueClass="text-red-600 dark:text-red-400"
                                    />
                                    <LedgerRow
                                        label="− Devoluciones efectivo"
                                        value={`-${formatCOP(session.total_refunds_cash)}`}
                                        valueClass="text-red-600 dark:text-red-400"
                                    />
                                    <LedgerRow label="= Efectivo esperado" value={formatCOP(session.expected_cash)} strong />
                                    <LedgerRow
                                        label="Efectivo contado"
                                        value={formatCOP(session.closing_amount_declared)}
                                        valueClass="font-semibold"
                                    />
                                    <div className="flex justify-between gap-3 py-3">
                                        <span className="font-bold">Diferencia</span>
                                        <span className={cn('text-lg font-bold tabular-nums', differenceText(discrepancy))}>
                                            {discrepancy > 0 ? '+' : ''}
                                            {formatCOP(discrepancy)}
                                        </span>
                                    </div>
                                </div>

                                {session.total_sales_card > 0 || session.total_sales_transfer > 0 || session.total_sales_other > 0 ? (
                                    <div className="border-t border-border/60 px-5 py-4">
                                        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Otros métodos</p>
                                        <div className="space-y-1.5 text-sm">
                                            {Number(session.total_sales_card) > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Tarjeta</span>
                                                    <span className="font-semibold tabular-nums">{formatCOP(session.total_sales_card)}</span>
                                                </div>
                                            )}
                                            {Number(session.total_sales_transfer) > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Transferencia</span>
                                                    <span className="font-semibold tabular-nums">{formatCOP(session.total_sales_transfer)}</span>
                                                </div>
                                            )}
                                            {Number(session.total_sales_other) > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Otro</span>
                                                    <span className="font-semibold tabular-nums">{formatCOP(session.total_sales_other)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </Section>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 sm:justify-end">
                    <button
                        type="button"
                        onClick={() => router.visit(route('cash-sessions.index'))}
                        className="flex h-11 flex-1 items-center justify-center rounded-xl border border-border/60 px-5 text-sm font-medium hover:bg-muted sm:h-10 sm:flex-none"
                    >
                        Historial
                    </button>
                    {!isBlind && (
                        <button
                            type="button"
                            onClick={handlePrint}
                            disabled={printing}
                            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50 sm:h-10 sm:flex-none"
                        >
                            <Printer className="size-4" aria-hidden="true" />
                            {printing ? 'Imprimiendo...' : 'Imprimir'}
                        </button>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
