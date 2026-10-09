import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type CreditSale } from '@/types';
import { Link } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Ban, DollarSign, Package, Pencil, ReceiptText } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { AbonoDialog, CancelCreditDialog, EditPlanDialog } from './credit-dialogs';
import { CreditStatusPill, CreditTypePill, DueDateNote } from './credit-meta';
import { CreditProgress } from './credit-progress';

const cop = (value: number): string => formatCurrency(Number(value));

interface CreditDetailPanelProps {
    credit: CreditSale;
    canCancel: boolean;
    canUpdateInstallments: boolean;
    /** The page shows a single credit (h1); inside a master-detail it is a section (h2). */
    headingLevel?: 1 | 2;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2 text-sm">
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 text-right font-medium break-words">{children}</dd>
        </div>
    );
}

function Section({ title, icon, children, className }: { title: string; icon: ReactNode; children: ReactNode; className?: string }) {
    return (
        <section className={cn('overflow-hidden rounded-2xl border border-border/60 bg-card', className)}>
            <h2 className="flex items-center gap-2 px-5 pt-4 pb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {icon}
                {title}
            </h2>
            {children}
        </section>
    );
}

/** Everything about one credit: balance and plan, facts, products and the abono history, with its actions. */
export function CreditDetailPanel({ credit, canCancel, canUpdateInstallments, headingLevel = 1 }: CreditDetailPanelProps) {
    const onBrand = useOnBrandColor();
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [editPlanOpen, setEditPlanOpen] = useState(false);

    const isActive = credit.status === 'active' || credit.status === 'overdue';
    const Heading = headingLevel === 1 ? 'h1' : 'h2';
    const payments = credit.payments ?? [];
    const items = credit.items ?? [];

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <Heading className="font-mono text-2xl font-bold">{credit.code}</Heading>
                        <CreditStatusPill status={credit.status} />
                        <CreditTypePill type={credit.type} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Creado {format(new Date(credit.created_at), "d 'de' MMMM yyyy, h:mm a", { locale: es })}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                    {isActive && (
                        <button
                            type="button"
                            onClick={() => setPaymentOpen(true)}
                            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 sm:h-10"
                            style={{ color: onBrand.hex }}
                        >
                            <DollarSign className="size-4" aria-hidden="true" />
                            Registrar abono
                        </button>
                    )}
                    {isActive && canCancel && (
                        <button
                            type="button"
                            onClick={() => setCancelOpen(true)}
                            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 sm:h-10 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                            <Ban className="size-4" aria-hidden="true" />
                            Cancelar
                        </button>
                    )}
                </div>
            </div>

            <div className="grid items-start gap-5 xl:grid-cols-[1.15fr_1fr]">
                <Section title="Progreso del pago" icon={<DollarSign className="size-3.5" aria-hidden="true" />}>
                    <div className="px-5 pb-5">
                        <CreditProgress
                            paid={Number(credit.amount_paid)}
                            total={Number(credit.total_amount)}
                            installments={credit.installments_count}
                            installmentAmount={credit.installment_amount}
                        />
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                            <DueDateNote dueDate={credit.due_date} status={credit.status} />
                        </div>
                    </div>
                </Section>

                <Section title="Información" icon={<ReceiptText className="size-3.5" aria-hidden="true" />}>
                    <dl className="divide-y divide-border/40 px-5 pb-3">
                        <Fact label="Cliente">{credit.client?.name}</Fact>
                        <Fact label="Vendedor">{credit.seller?.name}</Fact>
                        <Fact label="Sucursal">{credit.branch?.name}</Fact>
                        {credit.installments_count && (
                            <Fact label="Cuotas">
                                <span className="inline-flex items-center gap-1.5">
                                    {credit.installments_count} x {cop(Number(credit.installment_amount ?? 0))}
                                    {canUpdateInstallments && (
                                        <button
                                            type="button"
                                            onClick={() => setEditPlanOpen(true)}
                                            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                                            title="Editar plan de cuotas"
                                            aria-label="Editar plan de cuotas"
                                        >
                                            <Pencil className="size-3.5" aria-hidden="true" />
                                        </button>
                                    )}
                                </span>
                            </Fact>
                        )}
                        {credit.due_date && <Fact label="Fecha límite">{format(new Date(credit.due_date), 'dd/MM/yyyy')}</Fact>}
                        {credit.sale && (
                            <Fact label="Venta asociada">
                                <Link href={`/sales/${credit.sale.id}`} className="text-[var(--brand-primary)] hover:underline">
                                    #{credit.sale.code}
                                </Link>
                            </Fact>
                        )}
                        {credit.notes && (
                            <div className="py-3">
                                <p className="mb-1 text-sm text-muted-foreground">Notas</p>
                                <p className="line-clamp-3 text-sm" title={credit.notes ?? ''}>
                                    {credit.notes}
                                </p>
                            </div>
                        )}
                    </dl>
                </Section>
            </div>

            <div className="grid items-start gap-5 xl:grid-cols-2">
                <Section title={`Historial de abonos (${payments.length})`} icon={<DollarSign className="size-3.5" aria-hidden="true" />}>
                    {payments.length > 0 ? (
                        <ol className="relative mx-5 mb-5 border-l border-border/60">
                            {payments.map((payment) => (
                                <li key={payment.id} className="relative pb-5 pl-5 last:pb-0">
                                    <span
                                        className="absolute top-1.5 -left-[5px] size-2.5 rounded-full bg-[var(--brand-primary)] ring-4 ring-card"
                                        aria-hidden="true"
                                    />
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-lg leading-tight font-bold tabular-nums">{cop(payment.amount)}</p>
                                        <span className="rounded-full border border-border/60 px-2.5 py-0.5 text-xs text-muted-foreground">
                                            {payment.payment_method}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {format(new Date(payment.payment_date), 'd MMM yyyy, h:mm a', { locale: es })}
                                        {' — '}
                                        {payment.registered_by_user?.name ?? 'Usuario'}
                                    </p>
                                    {payment.notes && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground italic">{payment.notes}</p>}
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="px-5 pb-8 text-center text-sm text-muted-foreground">No hay abonos registrados aún</p>
                    )}
                </Section>

                <Section title={`Productos (${items.length})`} icon={<Package className="size-3.5" aria-hidden="true" />}>
                    <ul className="divide-y divide-border/40 border-t border-border/60">
                        {items.map((item) => (
                            <li key={item.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                                <div className="min-w-0">
                                    <p className="font-medium">{item.product_name}</p>
                                    {item.product?.code && <p className="text-xs text-muted-foreground">{item.product.code}</p>}
                                    <p className="text-xs text-muted-foreground tabular-nums">
                                        {item.quantity} × {cop(item.unit_price)}
                                    </p>
                                </div>
                                <span className="shrink-0 font-semibold tabular-nums">{cop(item.subtotal)}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="flex items-baseline justify-between border-t border-border/60 px-5 py-3">
                        <span className="text-sm text-muted-foreground">Total</span>
                        <span className="text-xl font-bold tabular-nums">
                            <RollingNumber value={Number(credit.total_amount)} format={cop} />
                        </span>
                    </div>
                </Section>
            </div>

            <AbonoDialog open={paymentOpen} onClose={() => setPaymentOpen(false)} credit={credit} />
            <CancelCreditDialog open={cancelOpen} onClose={() => setCancelOpen(false)} credit={credit} />
            {canUpdateInstallments && <EditPlanDialog open={editPlanOpen} onClose={() => setEditPlanOpen(false)} credit={credit} />}
        </div>
    );
}
