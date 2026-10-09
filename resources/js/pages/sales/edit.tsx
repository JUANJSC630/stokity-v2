import { StickyActions } from '@/components/admin/sticky-actions';
import PaymentMethodSelect from '@/components/PaymentMethodSelect';
import { FormPanel, INPUT_CLASS, LabeledField, OptionSelect, SELECT_TRIGGER } from '@/components/sales/form-fields';
import { HoldToConfirm } from '@/components/ui/arc/hold-to-confirm';
import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { useScrollToError } from '@/hooks/use-scroll-to-error';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency } from '@/lib/format';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ChevronLeft, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Branch {
    id: number;
    name: string;
}

interface Client {
    id: number;
    name: string;
}

interface User {
    id: number;
    name: string;
}

interface Sale {
    id: number;
    branch_id: number;
    code: string;
    client_id: number;
    seller_id: number;
    tax: number;
    net: number;
    total: number;
    payment_method: string;
    date: string;
    status: string;
}

interface Props {
    sale: Sale;
    branches: Branch[];
    clients: Client[];
    sellers: User[];
}

// Utilidad para formatear a COP
function formatCOP(value: string | number) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return formatCurrency(num);
}

// Utilidad para limpiar formato COP a número string
function unformatCOP(value: string) {
    return value
        .replace(/[^\d.,-]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
}

export default function Edit({ sale, branches, clients, sellers }: Props) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const onBrand = useOnBrandColor();

    // Prevenir scroll del mouse en inputs de tipo número
    useEffect(() => {
        const preventWheel = (e: WheelEvent) => {
            if (e.target instanceof HTMLInputElement && e.target.type === 'number') {
                e.preventDefault();
            }
        };

        document.addEventListener('wheel', preventWheel, { passive: false });

        return () => {
            document.removeEventListener('wheel', preventWheel);
        };
    }, []);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Ventas',
            href: '/sales',
        },
        {
            title: `Venta: ${sale.code}`,
            href: `/sales/${sale.id}`,
        },
        {
            title: 'Editar',
            href: `/sales/${sale.id}/edit`,
        },
    ];

    const form = useForm({
        branch_id: sale.branch_id.toString(),
        client_id: sale.client_id.toString(),
        seller_id: sale.seller_id.toString(),
        tax: sale.tax.toString(),
        net: sale.net.toString(),
        total: sale.total.toString(),
        payment_method: sale.payment_method,
        date: new Date(sale.date).toISOString().slice(0, 16), // Formato: YYYY-MM-DDThh:mm
        status: sale.status,
    });

    useScrollToError(form.errors);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.put(route('sales.update', sale.id));
    }

    function handleDelete() {
        router.delete(route('sales.destroy', sale.id));
        setIsDeleteDialogOpen(false);
    }

    // Calcular total cuando cambia net o tax
    function calculateTotal(netValue: string, taxValue: string) {
        const net = parseFloat(netValue) || 0;
        const tax = parseFloat(taxValue) || 0;
        return (net + tax).toFixed(2);
    }

    // Actualizar total cuando cambia net o tax
    function updateTotal() {
        form.setData('total', calculateTotal(form.data.net, form.data.tax));
    }

    // Actualizar tax cuando cambia net (asumiendo impuesto del 19%)
    function updateTax(netValue: string) {
        const net = parseFloat(netValue) || 0;
        const tax = (net * 0.19).toFixed(2);
        form.setData('tax', tax);
        form.setData('total', calculateTotal(netValue, tax));
    }

    const totalNumber = parseFloat(form.data.total) || 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar venta: ${sale.code}`} />
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-4 sm:p-6">
                <div className="flex items-start gap-3">
                    <Link
                        href={route('sales.show', sale.id)}
                        aria-label="Volver a la venta"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted sm:h-8 sm:w-8"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="truncate text-xl leading-tight font-bold sm:text-2xl">Editar venta {sale.code}</h1>
                        <p className="text-sm text-muted-foreground">Los campos con * son obligatorios.</p>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card p-5">
                    <div>
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Total de la venta</p>
                        <p className="text-3xl leading-tight font-bold tracking-tight">
                            <RollingNumber value={totalNumber} format={formatCurrency} intro />
                        </p>
                    </div>
                    <p className="max-w-[10rem] text-right text-xs text-muted-foreground">Se recalcula al cambiar el valor neto o el impuesto.</p>
                </div>

                <FormPanel title="Datos de la venta">
                    <LabeledField id="code" label="Código de venta">
                        <input id="code" type="text" className={INPUT_CLASS} value={sale.code} disabled readOnly />
                    </LabeledField>

                    <LabeledField id="branch_id" label="Sucursal" required error={form.errors.branch_id}>
                        <OptionSelect
                            id="branch_id"
                            value={form.data.branch_id}
                            onValueChange={(value) => form.setData('branch_id', value)}
                            options={branches}
                            placeholder="Seleccione sucursal"
                        />
                    </LabeledField>

                    <LabeledField id="client_id" label="Cliente" required error={form.errors.client_id}>
                        <OptionSelect
                            id="client_id"
                            value={form.data.client_id}
                            onValueChange={(value) => form.setData('client_id', value)}
                            options={clients}
                            placeholder="Seleccione cliente"
                        />
                    </LabeledField>

                    <LabeledField id="seller_id" label="Vendedor" required error={form.errors.seller_id}>
                        <OptionSelect
                            id="seller_id"
                            value={form.data.seller_id}
                            onValueChange={(value) => form.setData('seller_id', value)}
                            options={sellers}
                            placeholder="Seleccione vendedor"
                        />
                    </LabeledField>

                    <LabeledField id="date" label="Fecha y hora" required error={form.errors.date}>
                        <input
                            id="date"
                            type="datetime-local"
                            className={INPUT_CLASS}
                            value={form.data.date}
                            onChange={(e) => form.setData('date', e.target.value)}
                            required
                        />
                    </LabeledField>

                    <LabeledField id="status" label="Estado" required error={form.errors.status}>
                        <Select value={form.data.status} onValueChange={(value) => form.setData('status', value)}>
                            <SelectTrigger id="status" className={SELECT_TRIGGER}>
                                <SelectValue placeholder="Seleccione estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="completed">Completada</SelectItem>
                                <SelectItem value="pending">Pendiente</SelectItem>
                                <SelectItem value="cancelled">Cancelada</SelectItem>
                            </SelectContent>
                        </Select>
                    </LabeledField>
                </FormPanel>

                <FormPanel title="Pago e importes">
                    <PaymentMethodSelect
                        value={form.data.payment_method || undefined}
                        onValueChange={(value) => form.setData('payment_method', value)}
                        error={form.errors.payment_method}
                        required
                        triggerClassName="h-11 text-base sm:h-9 sm:text-sm"
                    />

                    <LabeledField id="net" label="Valor neto" required error={form.errors.net}>
                        <input
                            id="net"
                            type="text"
                            inputMode="decimal"
                            className={INPUT_CLASS}
                            value={formatCOP(form.data.net)}
                            onChange={(e) => {
                                const raw = unformatCOP(e.target.value);
                                form.setData('net', raw);
                                updateTax(raw);
                            }}
                            required
                        />
                    </LabeledField>

                    <LabeledField id="tax" label="Impuesto" required error={form.errors.tax}>
                        <input
                            id="tax"
                            type="text"
                            inputMode="decimal"
                            className={INPUT_CLASS}
                            value={formatCOP(form.data.tax)}
                            onChange={(e) => {
                                const raw = unformatCOP(e.target.value);
                                form.setData('tax', raw);
                                updateTotal();
                            }}
                            required
                        />
                    </LabeledField>

                    <LabeledField id="total" label="Total" required error={form.errors.total}>
                        <input id="total" type="text" className={INPUT_CLASS} value={formatCOP(form.data.total)} readOnly required />
                    </LabeledField>
                </FormPanel>

                <StickyActions>
                    <button
                        type="button"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        aria-label="Eliminar venta"
                        className="mr-auto flex h-11 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-card px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 sm:h-9 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                        <Trash2 className="size-4" aria-hidden="true" />
                        <span className="hidden sm:inline">Eliminar</span>
                    </button>
                    <Link
                        href={route('sales.show', sale.id)}
                        className="flex h-11 items-center justify-center rounded-lg border border-border/60 bg-card px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted sm:h-9"
                    >
                        Cancelar
                    </Link>
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-5 text-sm font-medium transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50 sm:h-9"
                        style={{ color: onBrand.hex }}
                    >
                        <Save className="size-4" aria-hidden="true" />
                        Actualizar venta
                    </button>
                </StickyActions>
            </form>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eliminar venta</DialogTitle>
                        <DialogDescription>
                            ¿Seguro que quieres eliminar la venta {sale.code}? Esta acción no se puede deshacer. Mantén pulsado el botón para
                            confirmar.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-2">
                        <button
                            type="button"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="h-11 rounded-lg border border-border/60 px-4 text-sm font-medium text-muted-foreground hover:bg-muted sm:h-9"
                        >
                            Cancelar
                        </button>
                        <HoldToConfirm
                            label="Mantén para eliminar"
                            confirmedLabel="Eliminando…"
                            tone="danger"
                            onConfirm={handleDelete}
                            className="w-full sm:w-auto"
                        />
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
