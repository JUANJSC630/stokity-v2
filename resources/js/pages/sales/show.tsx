import SaleReturnTicket from '@/components/SaleReturnTicket';
import SaleReturnForm from '@/components/sales/SaleReturnForm';
import SaleTicket from '@/components/SaleTicket';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePrinter } from '@/hooks/use-printer';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/format';
import { type BreadcrumbItem, type Product as ProductType, type Sale, type SaleProduct, type SaleReturn, type User } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { CheckCircle2, ChevronLeft, Clock, Edit, Eye, Printer, RotateCcw, XCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';

interface TicketConfig {
    paper_width: 58 | 80;
    header_size: 'normal' | 'large';
    show_logo: boolean;
    show_nit: boolean;
    show_address: boolean;
    show_phone: boolean;
    // Sale
    show_seller: boolean;
    show_branch: boolean;
    show_tax: boolean;
    footer_line1: string;
    footer_line2: string;
    sale_code_graphic: 'none' | 'qr' | 'barcode';
    // Return
    return_show_seller: boolean;
    return_show_branch: boolean;
    return_show_reason: boolean;
    return_footer_line1: string;
    return_footer_line2: string;
    return_code_graphic: 'none' | 'qr' | 'barcode';
}

interface Props {
    sale: Sale;
    businessName?: string | null;
    businessNit?: string | null;
    businessAddress?: string | null;
    businessPhone?: string | null;
    businessLogoUrl?: string | null;
    ticketConfig?: TicketConfig;
}

export default function Show({ sale, businessName, businessNit, businessAddress, businessPhone, businessLogoUrl, ticketConfig }: Props) {
    const [showReturnReceipt, setShowReturnReceipt] = useState<{ open: boolean; returnId?: number }>({ open: false });
    const printer = usePrinter();

    const handleThermalPrint = async () => {
        if (printer.status !== 'connected' || !printer.selectedPrinter) {
            toast.error('QZ Tray no conectado. Haz clic en el ícono de impresora en el POS para configurarla.');
            return;
        }
        try {
            await printer.printReceipt(sale.id);
            toast.success('Enviado a la impresora');
        } catch (err) {
            toast.error('Error al imprimir: ' + (err as Error).message);
        }
    };

    // Obtener el usuario autenticado
    const { auth } = usePage<{ auth: { user: User } }>().props;
    const isAdmin = auth.user.role === 'administrador';

    // Calcular cantidad devuelta por producto
    // Tipos para productos y devoluciones
    type SaleProductWithRemaining = SaleProduct & { remaining: number };
    type SaleReturnWithProducts = SaleReturn & { products: Array<ProductType & { pivot: { quantity: number } }> };

    const getReturnedQuantity = (productId: number): number => {
        if (!Array.isArray(sale.saleReturns)) return 0;
        return (sale.saleReturns as SaleReturnWithProducts[]).reduce((acc, ret) => {
            if (Array.isArray(ret.products)) {
                const found = ret.products.find((p) => p.id === productId);
                if (found && found.pivot && typeof found.pivot.quantity === 'number') {
                    return acc + found.pivot.quantity;
                }
            }
            return acc;
        }, 0);
    };

    // Filtrar productos vendidos con cantidad restante
    const remainingSaleProducts: SaleProductWithRemaining[] = (sale.saleProducts ?? [])
        .map((sp) => {
            const returned = getReturnedQuantity(sp.product_id);
            return {
                ...sp,
                remaining: sp.quantity - returned,
            };
        })
        .filter((sp) => sp.remaining > 0);

    // Calcular valores originales de la venta (sin afectar por devoluciones)
    const originalNetValue = (sale.saleProducts ?? []).reduce((acc, sp) => acc + sp.price * sp.quantity, 0);
    const originalTaxValue = (sale.saleProducts ?? []).reduce((acc, sp) => acc + ((sp.product?.tax || 0) * sp.price * sp.quantity) / 100, 0);
    const originalTotalValue = originalNetValue + originalTaxValue;

    // Función helper para calcular el total devuelto incluyendo impuesto
    const calculateTotalReturned = () => {
        return (Array.isArray(sale.saleReturns) ? sale.saleReturns : []).reduce((acc, ret) => {
            if (Array.isArray(ret.products)) {
                return (
                    acc +
                    ret.products.reduce((sum, p) => {
                        const saleProd = (sale.saleProducts ?? []).find((sp) => sp.product_id === p.id);
                        if (!saleProd) return sum;

                        // Calcular precio base devuelto
                        const basePriceReturned = saleProd.price * (p.pivot?.quantity ?? 0);
                        // Calcular impuesto proporcional devuelto
                        const taxReturned = ((saleProd.product?.tax || 0) * basePriceReturned) / 100;
                        // Total devuelto incluyendo impuesto
                        return sum + basePriceReturned + taxReturned;
                    }, 0)
                );
            }
            return acc;
        }, 0);
    };

    // Calcular valores actualizados según productos restantes (solo para mostrar productos disponibles)
    // const netValue = remainingSaleProducts.reduce((acc, sp) => acc + sp.price * sp.remaining, 0);
    // const taxValue = netValue * 0.19;
    // const totalValue = netValue + taxValue;
    const [showReturnForm, setShowReturnForm] = useState(false);
    const [showTicketPreview, setShowTicketPreview] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Ventas',
            href: '/sales',
        },
        {
            title: sale.code,
            href: `/sales/${sale.id}`,
        },
    ];

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
        }).format(value);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <Badge className="flex items-center bg-green-100 text-green-800 hover:bg-green-100">
                        <CheckCircle2 className="mr-1 size-3.5" />
                        Completada
                    </Badge>
                );
            case 'pending':
                return (
                    <Badge className="flex items-center bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                        <Clock className="mr-1 size-3.5" />
                        Pendiente
                    </Badge>
                );
            case 'cancelled':
                return (
                    <Badge className="flex items-center bg-red-100 text-red-800 hover:bg-red-100">
                        <XCircle className="mr-1 size-3.5" />
                        Cancelada
                    </Badge>
                );
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const getPaymentMethodText = (method: string) => {
        const methods = {
            cash: 'Efectivo',
            credit_card: 'Tarjeta de crédito',
            debit_card: 'Tarjeta débito',
            transfer: 'Transferencia',
            other: 'Otro',
        };
        return methods[method as keyof typeof methods] || method;
    };

    // Función para actualizar los datos de la venta después de una devolución
    const updateSaleData = () => {
        // Recargar la página para obtener los datos actualizados
        router.reload();
    };

    const handlePrintReturnReceipt = async (saleReturnId: number) => {
        if (printer.status !== 'connected' || !printer.selectedPrinter) {
            toast.error('QZ Tray no conectado. Configura la impresora en el POS.');
            return;
        }
        try {
            await printer.printReturn(saleReturnId);
            toast.success('Recibo de devolución enviado a la impresora');
        } catch (err) {
            toast.error('Error al imprimir: ' + (err as Error).message);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Venta: ${sale.code}`} />
            <div className="flex h-full flex-1 flex-col gap-5 p-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('sales.index')}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="max-w-[260px] truncate text-lg leading-tight font-bold sm:max-w-none">{sale.code}</h1>
                                {getStatusBadge(sale.status)}
                            </div>
                            <p className="text-xs text-muted-foreground">{formatDateTime(sale.date)}</p>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={handleThermalPrint}
                            disabled={printer.status !== 'connected'}
                            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                        >
                            <Printer className="h-3.5 w-3.5" />
                            Imprimir
                        </button>
                        <button
                            onClick={() => setShowTicketPreview(true)}
                            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <Eye className="h-3.5 w-3.5" />
                            Ver factura
                        </button>
                        <button
                            onClick={() => setShowReturnForm(true)}
                            disabled={remainingSaleProducts.length === 0}
                            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Devolución
                        </button>
                        {sale.id &&
                            (isAdmin ? (
                                <Link href={route('sales.edit', sale.id)}>
                                    <button className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                        <Edit className="h-3.5 w-3.5" />
                                        Editar
                                    </button>
                                </Link>
                            ) : (
                                <button
                                    disabled
                                    title="Solo administradores pueden editar ventas"
                                    className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-40"
                                >
                                    <Edit className="h-3.5 w-3.5" />
                                    Editar
                                </button>
                            ))}
                    </div>
                </div>

                {/* Dialogs */}
                <Dialog open={showTicketPreview} onOpenChange={setShowTicketPreview}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Vista previa de la factura</DialogTitle>
                            <DialogDescription>Visualización del ticket de venta antes de imprimir</DialogDescription>
                        </DialogHeader>
                        <div className="flex max-h-[70vh] justify-center overflow-auto p-4">
                            <SaleTicket
                                sale={sale}
                                businessName={businessName}
                                businessNit={businessNit}
                                businessAddress={businessAddress}
                                businessPhone={businessPhone}
                                businessLogoUrl={businessLogoUrl}
                                ticketConfig={ticketConfig}
                            />
                        </div>
                        <DialogClose asChild>
                            <Button variant="outline" className="mt-4 w-full">
                                Cerrar
                            </Button>
                        </DialogClose>
                    </DialogContent>
                </Dialog>

                <div className="hidden print:block">
                    <SaleTicket
                        sale={sale}
                        businessName={businessName}
                        businessNit={businessNit}
                        businessAddress={businessAddress}
                        businessPhone={businessPhone}
                        businessLogoUrl={businessLogoUrl}
                        ticketConfig={ticketConfig}
                    />
                </div>

                {/* Main info + QR */}
                <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                    <div className="rounded-xl border border-border/60 bg-card px-5 py-4">
                        <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Detalles</p>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
                            <div>
                                <p className="text-xs text-muted-foreground">Sucursal</p>
                                <p className="text-sm font-medium">{sale.branch?.name ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Método de pago</p>
                                <p className="text-sm font-medium">{getPaymentMethodText(sale.payment_method)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Cliente</p>
                                {sale.client ? (
                                    <Link
                                        href={route('clients.show', sale.client_id) + `?fromSale=${sale.id}`}
                                        className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                                    >
                                        {sale.client.name}
                                    </Link>
                                ) : (
                                    <p className="text-sm font-medium text-muted-foreground">—</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Vendedor</p>
                                <p className="text-sm font-medium">{sale.seller?.name ?? '—'}</p>
                            </div>
                            {sale.notes && (
                                <div className="col-span-2">
                                    <p className="text-xs text-muted-foreground">Notas</p>
                                    <p className="text-sm font-medium">{sale.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* QR */}
                    <div className="flex items-center justify-center rounded-xl border border-border/60 bg-card p-4">
                        <QRCode size={88} style={{ height: 'auto', maxWidth: '88px', width: '88px' }} value={sale.code} viewBox="0 0 256 256" />
                    </div>
                </div>

                {/* Totals */}
                <div className="rounded-xl border border-border/60 bg-card">
                    <div className="px-5 py-4">
                        <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Resumen</p>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Subtotal</span>
                                <span className="text-sm tabular-nums">{formatCurrency(originalNetValue)}</span>
                            </div>
                            {originalTaxValue > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Impuesto</span>
                                    <span className="text-sm tabular-nums">{formatCurrency(originalTaxValue)}</span>
                                </div>
                            )}
                            {sale.discount_amount > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        Descuento{sale.discount_type === 'percentage' && ` (${sale.discount_value}%)`}
                                    </span>
                                    <span className="text-sm text-red-500 tabular-nums dark:text-red-400">
                                        −{formatCurrency(sale.discount_amount)}
                                    </span>
                                </div>
                            )}
                            {sale.payment_method === 'cash' && sale.amount_paid && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Pagó con</span>
                                        <span className="text-sm tabular-nums">{formatCurrency(sale.amount_paid)}</span>
                                    </div>
                                    {sale.change_amount !== undefined && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Cambio</span>
                                            <span
                                                className={`text-sm font-medium tabular-nums ${sale.change_amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}
                                            >
                                                {formatCurrency(sale.change_amount)}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                            <div className="flex items-center justify-between border-t border-border/40 pt-2">
                                <span className="text-sm font-semibold">Total</span>
                                <span className="text-sm font-bold tabular-nums">{formatCurrency(sale.total)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Products */}
                <div className="rounded-xl border border-border/60 bg-card">
                    <div className="px-5 py-4">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Productos</p>
                    </div>

                    {/* Desktop table */}
                    <div className="hidden border-t border-border/60 md:block">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border/40 bg-muted/20">
                                    <th className="px-5 py-2.5 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                        Producto
                                    </th>
                                    <th className="px-4 py-2.5 text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                        Cant.
                                    </th>
                                    <th className="px-4 py-2.5 text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                        Dev.
                                    </th>
                                    <th className="px-4 py-2.5 text-right text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                        Precio
                                    </th>
                                    <th className="px-4 py-2.5 text-right text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                        Impuesto
                                    </th>
                                    <th className="px-5 py-2.5 text-right text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                        Subtotal
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {(sale.saleProducts ?? []).length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-6 text-center text-sm text-muted-foreground">
                                            Sin productos registrados
                                        </td>
                                    </tr>
                                ) : (
                                    (sale.saleProducts ?? []).map((sp, idx) => {
                                        const returned = getReturnedQuantity(sp.product_id);
                                        return (
                                            <tr
                                                key={sp.id}
                                                className={`transition-colors hover:bg-muted/20 ${idx !== 0 ? 'border-t border-border/40' : ''} ${returned > 0 ? 'opacity-60' : ''}`}
                                            >
                                                <td className="px-5 py-3 text-sm font-medium">{sp.product?.name ?? 'Producto eliminado'}</td>
                                                <td className="px-4 py-3 text-center text-sm tabular-nums">{sp.quantity}</td>
                                                <td className="px-4 py-3 text-center text-sm">
                                                    {returned > 0 ? (
                                                        <span className="text-amber-600 dark:text-amber-400">{returned}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground/40">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm tabular-nums">{formatCurrency(sp.price)}</td>
                                                <td className="px-4 py-3 text-right text-sm text-muted-foreground tabular-nums">
                                                    {sp.product?.tax
                                                        ? `${formatCurrency((sp.product.tax * sp.price * sp.quantity) / 100)} (${sp.product.tax}%)`
                                                        : '—'}
                                                </td>
                                                <td className="px-5 py-3 text-right text-sm font-medium tabular-nums">
                                                    {formatCurrency(sp.price * sp.quantity)}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                            <tfoot className="border-t border-border/40 bg-muted/10">
                                <tr>
                                    <td colSpan={5} className="px-5 py-2.5 text-xs font-semibold">
                                        Total
                                    </td>
                                    <td className="px-5 py-2.5 text-right text-xs font-bold tabular-nums">{formatCurrency(sale.total)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="divide-y divide-border/40 border-t border-border/60 md:hidden">
                        {(sale.saleProducts ?? []).map((sp) => {
                            const returned = getReturnedQuantity(sp.product_id);
                            return (
                                <div key={sp.id} className={`px-5 py-3 ${returned > 0 ? 'opacity-60' : ''}`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-xs font-medium">{sp.product?.name ?? 'Producto eliminado'}</p>
                                        <span className="flex-shrink-0 text-xs text-muted-foreground tabular-nums">×{sp.quantity}</span>
                                    </div>
                                    <div className="mt-1 flex justify-between">
                                        <span className="text-[11px] text-muted-foreground">{formatCurrency(sp.price)} c/u</span>
                                        <span className="text-xs font-semibold tabular-nums">{formatCurrency(sp.price * sp.quantity)}</span>
                                    </div>
                                    {returned > 0 && <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Devuelto: {returned} uds</p>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Returns summary */}
                {(Array.isArray(sale.saleReturns) ? sale.saleReturns : []).length > 0 && (
                    <div className="rounded-xl border border-border/60 bg-card">
                        <div className="px-5 py-4">
                            <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Devoluciones</p>
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Total original</span>
                                    <span className="text-xs tabular-nums">{formatCurrency(originalTotalValue)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Total devuelto</span>
                                    <span className="text-xs text-red-500 tabular-nums dark:text-red-400">
                                        −{formatCurrency(calculateTotalReturned())}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between border-t border-border/40 pt-2">
                                    <span className="text-sm font-semibold">Valor neto</span>
                                    <span className="text-sm font-bold tabular-nums">
                                        {formatCurrency(originalTotalValue - calculateTotalReturned())}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Return entries */}
                        <div className="divide-y divide-border/40 border-t border-border/60">
                            {(Array.isArray(sale.saleReturns) ? sale.saleReturns : []).map((ret) => (
                                <div key={ret.id} className="px-5 py-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-medium">{new Date(ret.created_at).toLocaleString()}</p>
                                            <p className="mt-0.5 text-[11px] text-muted-foreground">{ret.reason || 'Sin motivo'}</p>
                                            {Array.isArray(ret.products) && ret.products.length > 0 && (
                                                <ul className="mt-1 space-y-0.5">
                                                    {ret.products.map((p) => (
                                                        <li key={p.id} className="text-[11px] text-muted-foreground">
                                                            {p.name} × {p.pivot.quantity}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                        <div className="flex flex-shrink-0 gap-1.5">
                                            <button
                                                onClick={() => setShowReturnReceipt({ open: true, returnId: ret.id })}
                                                className="flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted"
                                            >
                                                <Eye className="h-3 w-3" />
                                                Ver
                                            </button>
                                            <button
                                                onClick={() => handlePrintReturnReceipt(ret.id)}
                                                className="flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted"
                                            >
                                                <Printer className="h-3 w-3" />
                                                Imprimir
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Return receipt dialog */}
                        <Dialog
                            open={showReturnReceipt.open}
                            onOpenChange={(open) => setShowReturnReceipt(open ? showReturnReceipt : { open: false, returnId: undefined })}
                        >
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Recibo de devolución</DialogTitle>
                                    <DialogDescription>Visualización del recibo de devolución de productos</DialogDescription>
                                </DialogHeader>
                                <div
                                    className="flex justify-center bg-white p-4 dark:bg-neutral-900"
                                    style={{
                                        maxWidth: '58mm',
                                        width: '58mm',
                                        margin: '0 auto',
                                        boxShadow: '0 0 8px #ccc',
                                        borderRadius: 8,
                                        maxHeight: '80vh',
                                        overflow: 'auto',
                                    }}
                                >
                                    {showReturnReceipt.open &&
                                        showReturnReceipt.returnId &&
                                        (() => {
                                            const ret = (sale.saleReturns ?? []).find((r) => r.id === showReturnReceipt.returnId);
                                            if (!ret) return null;
                                            const enrichedProducts = Array.isArray(ret.products)
                                                ? ret.products.map((rp) => {
                                                      const saleProd = (sale.saleProducts ?? []).find((sp) => sp.product_id === rp.id);
                                                      return {
                                                          code: saleProd?.product?.code ?? '',
                                                          description: saleProd?.product?.description ?? '',
                                                          purchase_price: saleProd?.product?.purchase_price ?? 0,
                                                          sale_price: saleProd?.product?.sale_price ?? 0,
                                                          stock: saleProd?.product?.stock ?? 0,
                                                          min_stock: saleProd?.product?.min_stock ?? 0,
                                                          category_id: saleProd?.product?.category_id ?? 0,
                                                          branch_id: saleProd?.product?.branch_id ?? 0,
                                                          created_at: saleProd?.product?.created_at ?? '',
                                                          updated_at: saleProd?.product?.updated_at ?? '',
                                                          image: saleProd?.product?.image ?? '',
                                                          image_url: saleProd?.product?.image_url ?? '',
                                                          status: Boolean(saleProd?.product?.status),
                                                          deleted_at: saleProd?.product?.deleted_at ?? null,
                                                          ...rp,
                                                          id: rp.id,
                                                          name: saleProd?.product?.name ?? 'Producto eliminado',
                                                          price: saleProd?.price ?? 0,
                                                          quantity: rp.pivot?.quantity ?? 0,
                                                          tax: saleProd?.product?.tax ?? 19,
                                                      };
                                                  })
                                                : [];
                                            return (
                                                <SaleReturnTicket
                                                    saleReturn={{ ...ret, reason: ret.reason ?? undefined, products: enrichedProducts }}
                                                    sale={sale}
                                                    businessName={businessName}
                                                    businessNit={businessNit}
                                                    businessAddress={businessAddress}
                                                    businessPhone={businessPhone}
                                                    businessLogoUrl={businessLogoUrl}
                                                    ticketConfig={ticketConfig}
                                                />
                                            );
                                        })()}
                                </div>
                                <DialogClose asChild>
                                    <Button variant="outline" className="mt-4 w-full">
                                        Cerrar
                                    </Button>
                                </DialogClose>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}

                {/* Return form */}
                <SaleReturnForm
                    saleId={sale.id}
                    products={(sale.saleProducts ?? [])
                        .map((sp) => {
                            const returned = getReturnedQuantity(sp.product_id);
                            return {
                                id: sp.product_id,
                                name: sp.product?.name || 'Producto eliminado',
                                quantity: sp.quantity,
                                alreadyReturned: returned,
                                remaining: sp.quantity - returned,
                            };
                        })
                        .filter((sp) => sp.remaining > 0)}
                    open={showReturnForm}
                    onClose={() => setShowReturnForm(false)}
                    onSuccess={() => {
                        updateSaleData();
                        setShowReturnForm(false);
                    }}
                />
            </div>
        </AppLayout>
    );
}
