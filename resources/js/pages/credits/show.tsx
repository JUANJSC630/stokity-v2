import PaymentMethodSelect from '@/components/PaymentMethodSelect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type CreditSale, type PaymentMethod } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, ArrowLeft, Ban, DollarSign, FileText, HandCoins, Package } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
    credit: CreditSale;
    paymentMethods: PaymentMethod[];
    canCancel: boolean;
}

function cop(value: number): string {
    return `$ ${Number(value).toLocaleString('es-CO')}`;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline'; className?: string }> = {
    active: { label: 'Activo', variant: 'default', className: 'bg-blue-600 hover:bg-blue-700' },
    overdue: { label: 'Vencido', variant: 'destructive' },
    completed: { label: 'Completado', variant: 'secondary', className: 'bg-green-600 text-white hover:bg-green-700' },
    cancelled: { label: 'Cancelado', variant: 'outline' },
};

const TYPE_LABELS: Record<string, string> = {
    layaway: 'Separado',
    installments: 'Cuotas',
    due_date: 'Fecha acordada',
    hold: 'Reservado',
};

function ProgressBar({ paid, total }: { paid: number; total: number }) {
    const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
    return (
        <div className="space-y-2">
            <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold">{cop(paid)}</span>
                <span className="text-sm text-muted-foreground">de {cop(total)}</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-muted">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-green-500' : pct > 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{Math.round(pct)}% pagado</span>
                {Number(total) - Number(paid) > 0 && <span className="font-medium text-orange-500">Falta: {cop(Number(total) - Number(paid))}</span>}
            </div>
        </div>
    );
}

// ─── Payment Modal ──────────────────────────────────────────────────────────────

function PaymentModal({ open, onClose, credit }: { open: boolean; onClose: () => void; credit: CreditSale }) {
    const [amount, setAmount] = useState(0);
    const [method, setMethod] = useState('efectivo');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const maxAmount = Number(credit.balance);

    function handleSubmit() {
        if (amount <= 0 || amount > maxAmount) return;
        setSubmitting(true);

        router.post(
            `/credits/${credit.id}/payments`,
            { amount, payment_method: method, notes: notes || null },
            {
                onSuccess: () => {
                    toast.success('Abono registrado');
                    onClose();
                    setAmount(0);
                    setNotes('');
                },
                onError: (errors) => {
                    Object.values(errors).forEach((e) => toast.error(e as string));
                    setSubmitting(false);
                },
                onFinish: () => setSubmitting(false),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Registrar abono</DialogTitle>
                    <DialogDescription>
                        Saldo pendiente: <span className="font-semibold text-orange-500">{cop(maxAmount)}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Monto del abono</Label>
                        <CurrencyInput value={amount} onChange={setAmount} autoFocus />
                        {amount > maxAmount && (
                            <p className="text-sm text-red-500">El abono no puede ser mayor al saldo restante de {cop(maxAmount)}</p>
                        )}
                        <div className="flex gap-2">
                            {[10000, 20000, 50000]
                                .filter((v) => v <= maxAmount)
                                .map((v) => (
                                    <Button key={v} variant="outline" size="sm" onClick={() => setAmount(v)}>
                                        {cop(v)}
                                    </Button>
                                ))}
                            <Button variant="outline" size="sm" onClick={() => setAmount(maxAmount)}>
                                Pagar todo
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <PaymentMethodSelect value={method} onValueChange={setMethod} />
                    </div>

                    <div className="space-y-2">
                        <Label>Notas (opcional)</Label>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones..." rows={2} />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={submitting}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || amount <= 0 || amount > maxAmount}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {submitting ? 'Registrando...' : `Registrar ${cop(amount)}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Cancel Modal ───────────────────────────────────────────────────────────────

function CancelModal({ open, onClose, credit }: { open: boolean; onClose: () => void; credit: CreditSale }) {
    const [submitting, setSubmitting] = useState(false);

    function handleCancel() {
        setSubmitting(true);
        router.post(
            `/credits/${credit.id}/cancel`,
            {},
            {
                onSuccess: () => toast.success('Crédito cancelado'),
                onError: (errors) => {
                    Object.values(errors).forEach((e) => toast.error(e as string));
                    setSubmitting(false);
                },
                onFinish: () => setSubmitting(false),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-500">
                        <AlertCircle className="h-5 w-5" />
                        Cancelar crédito
                    </DialogTitle>
                    <DialogDescription>
                        {credit.amount_paid > 0 ? (
                            <>
                                Este crédito tiene abonos registrados por <strong>{cop(credit.amount_paid)}</strong>. Los abonos permanecerán en caja
                                pero el crédito se marcará como cancelado.
                                {(credit.type === 'layaway' || credit.type === 'hold') && ' El stock reservado se liberará.'}
                            </>
                        ) : (
                            <>
                                Se cancelará el crédito <strong>{credit.code}</strong>.
                                {(credit.type === 'layaway' || credit.type === 'hold') && ' El stock reservado se liberará.'}
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={submitting}>
                        No, volver
                    </Button>
                    <Button variant="destructive" onClick={handleCancel} disabled={submitting}>
                        {submitting ? 'Cancelando...' : 'Sí, cancelar crédito'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export default function CreditShow({ credit, paymentMethods, canCancel }: Props) {
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    const { flash } = usePage().props as unknown as { flash: { success?: string } };

    const statusCfg = STATUS_CONFIG[credit.status] ?? STATUS_CONFIG.active;
    const isActive = credit.status === 'active' || credit.status === 'overdue';

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inicio', href: '/dashboard' },
        { title: 'Créditos', href: '/credits' },
        { title: credit.code, href: `/credits/${credit.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Crédito ${credit.code}`} />

            <div className="mx-auto w-full max-w-4xl space-y-6 p-4 lg:p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/credits">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold">{credit.code}</h1>
                                <Badge variant={statusCfg.variant} className={statusCfg.className}>
                                    {statusCfg.label}
                                </Badge>
                                <Badge variant="outline">{TYPE_LABELS[credit.type]}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Creado {format(new Date(credit.created_at), "d 'de' MMMM yyyy, h:mm a", { locale: es })}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {isActive && (
                            <Button onClick={() => setPaymentOpen(true)} className="bg-green-600 hover:bg-green-700">
                                <DollarSign className="mr-2 h-4 w-4" />
                                Registrar abono
                            </Button>
                        )}
                        {isActive && canCancel && (
                            <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                                <Ban className="mr-2 h-4 w-4" />
                                Cancelar
                            </Button>
                        )}
                    </div>
                </div>

                {/* Info grid */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Payment progress */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <HandCoins className="h-5 w-5" />
                                Progreso del pago
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ProgressBar paid={Number(credit.amount_paid)} total={Number(credit.total_amount)} />
                        </CardContent>
                    </Card>

                    {/* Credit info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Información
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Cliente</span>
                                <span className="font-medium">{credit.client?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Vendedor</span>
                                <span>{credit.seller?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Sucursal</span>
                                <span>{credit.branch?.name}</span>
                            </div>
                            {credit.installments_count && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Cuotas</span>
                                    <span>
                                        {credit.installments_count} x {cop(Number(credit.installment_amount ?? 0))}
                                    </span>
                                </div>
                            )}
                            {credit.due_date && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Fecha límite</span>
                                    <span>{format(new Date(credit.due_date), 'dd/MM/yyyy')}</span>
                                </div>
                            )}
                            {credit.sale && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Venta asociada</span>
                                    <Link href={`/sales/${credit.sale.id}`} className="text-blue-500 hover:underline">
                                        #{credit.sale.code}
                                    </Link>
                                </div>
                            )}
                            {credit.notes && (
                                <div className="border-t pt-2">
                                    <p className="mb-1 text-muted-foreground">Notas</p>
                                    <p className="line-clamp-3 text-sm" title={credit.notes ?? ''}>
                                        {credit.notes}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Products */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Productos ({credit.items?.length ?? 0})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            {/* Header — desktop only */}
                            <div className="hidden grid-cols-[1fr_80px_100px_100px] gap-2 bg-muted/50 px-4 py-2 text-xs font-medium md:grid">
                                <span>Producto</span>
                                <span className="text-center">Cant.</span>
                                <span className="text-right">Precio</span>
                                <span className="text-right">Subtotal</span>
                            </div>
                            {credit.items?.map((item) => (
                                <div key={item.id} className="border-t px-4 py-3 text-sm">
                                    {/* Mobile: name + subtotal side by side */}
                                    <div className="flex items-start justify-between gap-2 md:hidden">
                                        <div className="min-w-0">
                                            <p className="font-medium">{item.product_name}</p>
                                            {item.product?.code && <p className="text-xs text-muted-foreground">{item.product.code}</p>}
                                            <p className="text-xs text-muted-foreground">
                                                Cant: {item.quantity} · {cop(item.unit_price)} c/u
                                            </p>
                                        </div>
                                        <span className="flex-shrink-0 font-semibold">{cop(item.subtotal)}</span>
                                    </div>
                                    {/* Desktop: grid row */}
                                    <div className="hidden grid-cols-[1fr_80px_100px_100px] items-center gap-2 md:grid">
                                        <div>
                                            <p className="font-medium">{item.product_name}</p>
                                            {item.product?.code && <p className="text-xs text-muted-foreground">{item.product.code}</p>}
                                        </div>
                                        <span className="text-center">{item.quantity}</span>
                                        <span className="text-right">{cop(item.unit_price)}</span>
                                        <span className="text-right font-medium">{cop(item.subtotal)}</span>
                                    </div>
                                </div>
                            ))}
                            <div className="border-t px-4 py-3 text-right">
                                <span className="text-lg font-bold">Total: {cop(Number(credit.total_amount))}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Payment history */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Historial de abonos ({credit.payments?.length ?? 0})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {credit.payments && credit.payments.length > 0 ? (
                            <div className="space-y-3">
                                {credit.payments.map((payment, idx) => (
                                    <div key={payment.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                                        <div>
                                            <p className="font-medium">{cop(payment.amount)}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(payment.payment_date), 'd MMM yyyy, h:mm a', { locale: es })}
                                                {' — '}
                                                {payment.registered_by_user?.name ?? 'Usuario'}
                                            </p>
                                            {payment.notes && (
                                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground italic">{payment.notes}</p>
                                            )}
                                        </div>
                                        <Badge variant="outline">{payment.payment_method}</Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="py-6 text-center text-sm text-muted-foreground">No hay abonos registrados aún</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <PaymentModal open={paymentOpen} onClose={() => setPaymentOpen(false)} credit={credit} />
            <CancelModal open={cancelOpen} onClose={() => setCancelOpen(false)} credit={credit} />
        </AppLayout>
    );
}
