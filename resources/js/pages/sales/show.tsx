import SaleReturnTicket from '@/components/SaleReturnTicket';
import { CREDIT_LINKED_MESSAGE, isCreditLinked, paymentMethodLabel, SaleStatusMarker, SaleStatusPill } from '@/components/sales/sale-status';
import SaleReturnForm from '@/components/sales/SaleReturnForm';
import SaleTicket from '@/components/SaleTicket';
import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { StaggerItem } from '@/components/ui/bencho/stagger-item';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePermissions } from '@/hooks/use-permissions';
import { usePrinter } from '@/hooks/use-printer';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type Product as ProductType, type Sale, type SaleProduct, type SaleReturn } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ChevronLeft, Edit, Eye, Printer, RotateCcw } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
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

interface AuditLog {
    id: number;
    action: 'updated' | 'cancelled';
    field_changed: string | null;
    old_value: string | null;
    new_value: string | null;
    created_at: string;
    user: { name: string } | null;
}

interface Props {
    sale: Sale;
    deleted?: boolean;
    businessName?: string | null;
    businessNit?: string | null;
    businessAddress?: string | null;
    businessPhone?: string | null;
    businessLogoUrl?: string | null;
    ticketConfig?: TicketConfig;
    auditLogs?: AuditLog[];
}

const AUDIT_FIELD_LABELS: Record<string, string> = {
    status: 'Estado',
    total: 'Total',
    payment_method: 'Método de pago',
};

const ACTION =
    'flex h-11 items-center justify-center gap-2 rounded-xl border border-border/60 bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40 sm:h-9 sm:rounded-lg sm:text-xs';

function Panel({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
    return (
        <section className={cn('overflow-hidden rounded-2xl border border-border/60 bg-card', className)}>
            {title && <h2 className="px-5 pt-4 pb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h2>}
            {children}
        </section>
    );
}

function Detail({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
    return (
        <div className={className}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium break-words">{children}</dd>
        </div>
    );
}

function TotalLine({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'good' }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd
                className={cn(
                    'text-sm font-medium tabular-nums',
                    tone === 'danger' && 'text-red-500 dark:text-red-400',
                    tone === 'good' && 'text-emerald-600 dark:text-emerald-400',
                )}
            >
                {value}
            </dd>
        </div>
    );
}

export default function Show({
    sale,
    deleted = false,
    businessName,
    businessNit,
    businessAddress,
    businessPhone,
    businessLogoUrl,
    ticketConfig,
    auditLogs = [],
}: Props) {
    const [showReturnReceipt, setShowReturnReceipt] = useState<{ open: boolean; returnId?: number }>({ open: false });
    const printer = usePrinter();
    const { can } = usePermissions();
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const creditLinked = isCreditLinked(sale);

    useEffect(() => {
        if (errors?.credit) toast.error(errors.credit);
    }, [errors?.credit]);

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

                        // effective_price = precio pagado con descuento ya aplicado; fallback a precio de venta
                        const unitPrice = p.pivot?.effective_price ?? saleProd.price;
                        const basePriceReturned = unitPrice * (p.pivot?.quantity ?? 0);
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

    const breadcrumbs: BreadcrumbItem[] = deleted
        ? [
              { title: 'Ventas', href: '/sales' },
              { title: 'Eliminadas', href: route('sales.deleted.index') },
              { title: sale.code, href: route('sales.deleted.show', sale.id) },
          ]
        : [
              { title: 'Ventas', href: '/sales' },
              { title: sale.code, href: `/sales/${sale.id}` },
          ];

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

    const products = sale.saleProducts ?? [];
    const returns = Array.isArray(sale.saleReturns) ? sale.saleReturns : [];
    const totalReturned = calculateTotalReturned();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Venta: ${sale.code}`} />
            <div className="flex flex-col gap-5 p-4 sm:p-6">
                {/* Header */}
                <div className="flex items-start gap-3">
                    <Link
                        href={deleted ? route('sales.deleted.index') : route('sales.index')}
                        aria-label="Volver a ventas"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted sm:h-8 sm:w-8"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="truncate text-xl leading-tight font-bold">{sale.code}</h1>
                        <p className="text-xs text-muted-foreground">{formatDateTime(sale.date)}</p>
                    </div>
                    <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
                        <SaleStatusPill status={sale.status} />
                        {deleted && <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-medium text-white">Eliminada</span>}
                    </div>
                </div>

                {/* Total hero */}
                <StaggerItem index={0}>
                    <Panel className="relative">
                        <div className="flex items-center gap-4 p-5">
                            <SaleStatusMarker status={sale.status} />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Total</p>
                                <p className="truncate text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
                                    <RollingNumber value={sale.total} format={formatCurrency} intro />
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {paymentMethodLabel(sale.payment_method)} · {products.length} {products.length === 1 ? 'producto' : 'productos'}
                                </p>
                            </div>
                            <div className="hidden shrink-0 rounded-xl bg-white p-2 sm:block">
                                <QRCode
                                    size={80}
                                    style={{ height: 'auto', maxWidth: '80px', width: '80px' }}
                                    value={sale.code}
                                    viewBox="0 0 256 256"
                                />
                            </div>
                        </div>
                    </Panel>
                </StaggerItem>

                {/* Actions — hidden for deleted sales */}
                {!deleted && (
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                        <button onClick={handleThermalPrint} disabled={printer.status !== 'connected'} className={ACTION}>
                            <Printer className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                            Imprimir
                        </button>
                        <button onClick={() => setShowTicketPreview(true)} className={ACTION}>
                            <Eye className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                            Ver factura
                        </button>
                        <button onClick={() => setShowReturnForm(true)} disabled={remainingSaleProducts.length === 0} className={ACTION}>
                            <RotateCcw className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                            Devolución
                        </button>
                        {sale.id &&
                            (can('sales.update') && !creditLinked ? (
                                <Link href={route('sales.edit', sale.id)} className={ACTION}>
                                    <Edit className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                                    Editar
                                </Link>
                            ) : (
                                <button
                                    disabled
                                    title={creditLinked ? CREDIT_LINKED_MESSAGE : 'No tienes permisos para editar ventas'}
                                    className={ACTION}
                                >
                                    <Edit className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                                    Editar
                                </button>
                            ))}
                    </div>
                )}

                {!deleted && creditLinked && (
                    <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                        {CREDIT_LINKED_MESSAGE}{' '}
                        {can('credits.view') && (
                            <Link href={route('credits.index')} className="font-medium underline underline-offset-2">
                                Ir a créditos
                            </Link>
                        )}
                    </p>
                )}

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
                            <Button variant="outline" className="mt-4 h-11 w-full sm:h-9">
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

                <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
                    <div className="flex min-w-0 flex-col gap-5">
                        {/* Products */}
                        <Panel title="Productos">
                            <div className="hidden border-t border-border/60 md:block">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border/40 bg-muted/20 text-[11px] tracking-wide text-muted-foreground uppercase">
                                            <th scope="col" className="px-5 py-2.5 text-left font-medium">
                                                Producto
                                            </th>
                                            <th scope="col" className="px-4 py-2.5 text-center font-medium">
                                                Cant.
                                            </th>
                                            <th scope="col" className="px-4 py-2.5 text-center font-medium">
                                                Dev.
                                            </th>
                                            <th scope="col" className="px-4 py-2.5 text-right font-medium">
                                                Precio
                                            </th>
                                            <th scope="col" className="px-4 py-2.5 text-right font-medium">
                                                Impuesto
                                            </th>
                                            <th scope="col" className="px-5 py-2.5 text-right font-medium">
                                                Subtotal
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-5 py-6 text-center text-sm text-muted-foreground">
                                                    Sin productos registrados
                                                </td>
                                            </tr>
                                        ) : (
                                            products.map((sp, idx) => {
                                                const returned = getReturnedQuantity(sp.product_id);
                                                return (
                                                    <tr
                                                        key={sp.id}
                                                        className={cn(
                                                            'transition-colors hover:bg-muted/20',
                                                            idx !== 0 && 'border-t border-border/40',
                                                            returned > 0 && 'opacity-60',
                                                        )}
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
                                </table>
                            </div>

                            <ul className="divide-y divide-border/40 border-t border-border/60 md:hidden">
                                {products.length === 0 && (
                                    <li className="px-5 py-6 text-center text-sm text-muted-foreground">Sin productos registrados</li>
                                )}
                                {products.map((sp) => {
                                    const returned = getReturnedQuantity(sp.product_id);
                                    return (
                                        <li key={sp.id} className={cn('px-5 py-3.5', returned > 0 && 'opacity-60')}>
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="text-sm leading-snug font-medium">{sp.product?.name ?? 'Producto eliminado'}</p>
                                                <span className="shrink-0 text-base font-bold tabular-nums">
                                                    {formatCurrency(sp.price * sp.quantity)}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                                                {sp.quantity} × {formatCurrency(sp.price)}
                                            </p>
                                            {returned > 0 && (
                                                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Devuelto: {returned} uds</p>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </Panel>

                        {/* Returns */}
                        {returns.length > 0 && (
                            <Panel title="Devoluciones">
                                <dl className="flex flex-col gap-2 px-5 pb-4">
                                    <TotalLine label="Total original" value={formatCurrency(originalTotalValue)} />
                                    <TotalLine label="Total devuelto" value={`−${formatCurrency(totalReturned)}`} tone="danger" />
                                    <div className="flex items-center justify-between border-t border-border/40 pt-2">
                                        <dt className="text-sm font-semibold">Valor neto</dt>
                                        <dd className="text-sm font-bold tabular-nums">{formatCurrency(originalTotalValue - totalReturned)}</dd>
                                    </div>
                                </dl>

                                <ul className="divide-y divide-border/40 border-t border-border/60">
                                    {returns.map((ret) => (
                                        <li key={ret.id} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium">{formatDateTime(ret.created_at)}</p>
                                                <p className="mt-0.5 text-xs text-muted-foreground">{ret.reason || 'Sin motivo'}</p>
                                                {Array.isArray(ret.products) && ret.products.length > 0 && (
                                                    <ul className="mt-1.5 space-y-0.5">
                                                        {ret.products.map((p) => (
                                                            <li key={p.id} className="text-xs text-muted-foreground">
                                                                {p.name} × {p.pivot.quantity}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                            <div className="flex shrink-0 gap-2">
                                                <button
                                                    onClick={() => setShowReturnReceipt({ open: true, returnId: ret.id })}
                                                    className={cn(ACTION, 'flex-1 sm:flex-none')}
                                                >
                                                    <Eye className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                                                    Ver
                                                </button>
                                                <button
                                                    onClick={() => handlePrintReturnReceipt(ret.id)}
                                                    className={cn(ACTION, 'flex-1 sm:flex-none')}
                                                >
                                                    <Printer className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                                                    Imprimir
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>

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
                            </Panel>
                        )}

                        {/* Audit trail — admin only */}
                        {can('sales.view_audit') && auditLogs.length > 0 && (
                            <Panel title="Auditoría">
                                <ul className="divide-y divide-border/40 border-t border-border/60">
                                    {auditLogs.map((log) => (
                                        <li key={log.id} className="px-5 py-3">
                                            <p className="text-sm">
                                                {log.action === 'cancelled' ? (
                                                    <>
                                                        <span className="font-medium">{log.user?.name ?? 'Usuario eliminado'}</span> canceló esta
                                                        venta
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="font-medium">{log.user?.name ?? 'Usuario eliminado'}</span> cambió{' '}
                                                        <span className="font-medium">
                                                            {AUDIT_FIELD_LABELS[log.field_changed ?? ''] ?? log.field_changed}
                                                        </span>{' '}
                                                        de &quot;
                                                        {log.old_value}&quot; a &quot;{log.new_value}&quot;
                                                    </>
                                                )}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(log.created_at)}</p>
                                        </li>
                                    ))}
                                </ul>
                            </Panel>
                        )}
                    </div>

                    <div className="flex min-w-0 flex-col gap-5">
                        {/* Details */}
                        <Panel title="Detalles">
                            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 pb-5">
                                <Detail label="Cliente" className="col-span-2">
                                    {sale.client ? (
                                        <Link
                                            href={route('clients.show', sale.client_id) + `?fromSale=${sale.id}`}
                                            className="text-[var(--brand-primary)] hover:underline"
                                        >
                                            {sale.client.name}
                                        </Link>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    )}
                                </Detail>
                                <Detail label="Vendedor">{sale.seller?.name ?? '—'}</Detail>
                                <Detail label="Sucursal">{sale.branch?.name ?? '—'}</Detail>
                                <Detail label="Método de pago">{paymentMethodLabel(sale.payment_method)}</Detail>
                                <Detail label="Fecha">{formatDateTime(sale.date)}</Detail>
                                {sale.notes && (
                                    <Detail label="Notas" className="col-span-2">
                                        {sale.notes}
                                    </Detail>
                                )}
                            </dl>
                        </Panel>

                        {/* Summary */}
                        <Panel title="Resumen">
                            <dl className="flex flex-col gap-2 px-5 pb-5">
                                <TotalLine label="Subtotal" value={formatCurrency(originalNetValue)} />
                                {originalTaxValue > 0 && <TotalLine label="Impuesto" value={formatCurrency(originalTaxValue)} />}
                                {sale.discount_amount > 0 && (
                                    <TotalLine
                                        label={`Descuento${sale.discount_type === 'percentage' ? ` (${sale.discount_value}%)` : ''}`}
                                        value={`−${formatCurrency(sale.discount_amount)}`}
                                        tone="danger"
                                    />
                                )}
                                {sale.payment_method === 'cash' && sale.amount_paid && (
                                    <>
                                        <TotalLine label="Pagó con" value={formatCurrency(sale.amount_paid)} />
                                        {sale.change_amount !== undefined && (
                                            <TotalLine
                                                label="Cambio"
                                                value={formatCurrency(sale.change_amount)}
                                                tone={sale.change_amount >= 0 ? 'good' : 'danger'}
                                            />
                                        )}
                                    </>
                                )}
                                <div className="flex items-center justify-between border-t border-border/40 pt-3">
                                    <dt className="text-base font-semibold">Total</dt>
                                    <dd className="text-lg font-bold tabular-nums">{formatCurrency(sale.total)}</dd>
                                </div>
                            </dl>
                        </Panel>

                        <Panel className="sm:hidden">
                            <div className="flex items-center justify-between gap-4 p-5">
                                <div>
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Código</p>
                                    <p className="text-sm font-semibold">{sale.code}</p>
                                </div>
                                <div className="rounded-xl bg-white p-2">
                                    <QRCode
                                        size={88}
                                        style={{ height: 'auto', maxWidth: '88px', width: '88px' }}
                                        value={sale.code}
                                        viewBox="0 0 256 256"
                                    />
                                </div>
                            </div>
                        </Panel>
                    </div>
                </div>

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
                                isService: sp.product?.type === 'servicio',
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
