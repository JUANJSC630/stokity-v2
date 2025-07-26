import SaleReturnForm from '@/components/sales/SaleReturnForm';
import SaleTicket from '@/components/SaleTicket';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Product as ProductType, type Sale, type SaleProduct, type SaleReturn } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { CheckCircle2, ChevronLeft, Clock, Edit, Eye, RotateCcw, XCircle } from 'lucide-react';
import { useState } from 'react';
import ReactDOM from 'react-dom/client';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';
import SaleReturnTicket from '@/components/SaleReturnTicket';

interface Props {
    sale: Sale;
}

export default function Show({ sale }: Props) {
    const [showReturnReceipt, setShowReturnReceipt] = useState<{ open: boolean; returnId?: number }>({ open: false });

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

    // Calcular valores actualizados según productos restantes
    const netValue = remainingSaleProducts.reduce((acc, sp) => acc + sp.price * sp.remaining, 0);
    const taxValue = netValue * 0.19;
    const totalValue = netValue + taxValue;
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

    const formatDateToLocal = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    // Función para actualizar los datos de la venta después de una devolución
    const updateSaleData = () => {
        // Recargar la página para obtener los datos actualizados
        router.reload();
    };

    // Imprimir el ticket usando el componente SaleTicket en una nueva ventana
    const handlePrintTicket = () => {
        const printWindow = window.open('', '', 'width=400,height=600');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Ticket Venta ${sale.code}</title>
                    ${Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
                        .map((el) => el.outerHTML)
                        .join('\n')}
                    <style>
                        @media print {
                            body, html {
                                background: white !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                width: 58mm !important;
                                min-width: 58mm !important;
                                max-width: 58mm !important;
                            }
                            @page {
                                size: 58mm auto;
                                margin: 0;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div id="ticket-root"></div>
                </body>
                </html>
            `);
            printWindow.document.close();
            // Espera a que el documento esté listo y renderiza el componente
            const interval = setInterval(() => {
                const rootDiv = printWindow.document.getElementById('ticket-root');
                if (rootDiv) {
                    clearInterval(interval);
                    ReactDOM.createRoot(rootDiv).render(
                        <SaleTicket sale={sale} formatCurrency={formatCurrency} formatDateToLocal={formatDateToLocal} />,
                    );
                    setTimeout(() => {
                        printWindow.focus();
                        printWindow.print();
                        printWindow.close();
                    }, 500);
                }
            }, 50);
        }
    };

    // Imprimir el recibo de devolución visualmente usando SaleReturnTicket
    const handlePrintReturnReceipt = (saleReturnId: number) => {
        const ret = (sale.saleReturns ?? []).find((r) => r.id === saleReturnId);
        if (!ret) {
            toast.error('No se encontró la devolución.');
            return;
        }
        // Enriquecer productos igual que en el modal
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
                      // Additional fields from SaleReturnProduct
                      ...rp,
                      id: rp.id,
                      name: saleProd?.product?.name ?? 'Producto eliminado',
                      price: saleProd?.price ?? 0,
                      quantity: rp.pivot?.quantity ?? 0, // Add quantity at top-level
                  };
              })
            : [];
        const printWindow = window.open('', '', 'width=400,height=600');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Recibo Devolución #${ret.id}</title>
                    ${Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
                        .map((el) => el.outerHTML)
                        .join('\n')}
                    <style>
                        @media print {
                            html, body {
                                background: #fff !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                width: 58mm !important;
                                min-width: 58mm !important;
                                max-width: 58mm !important;
                                box-sizing: border-box !important;
                                display: block !important;
                            }
                            #ticket-root {
                                margin: 0 !important;
                                padding: 0 !important;
                                width: 58mm !important;
                                min-width: 58mm !important;
                                max-width: 58mm !important;
                                box-sizing: border-box !important;
                                display: block !important;
                            }
                            @page {
                                size: 58mm auto;
                                margin: 0;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div id="ticket-root"></div>
                </body>
                </html>
            `);
            printWindow.document.close();
            const interval = setInterval(() => {
                const rootDiv = printWindow.document.getElementById('ticket-root');
                if (rootDiv) {
                    clearInterval(interval);
                    ReactDOM.createRoot(rootDiv).render(
                        <SaleReturnTicket
                            saleReturn={{
                                ...ret,
                                reason: ret.reason ?? undefined,
                                products: enrichedProducts,
                            }}
                            sale={sale}
                            formatCurrency={formatCurrency}
                            formatDateToLocal={formatDateToLocal}
                        />
                    );
                    setTimeout(() => {
                        printWindow.focus();
                        printWindow.print();
                        printWindow.close();
                    }, 500);
                }
            }, 50);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Venta: ${sale.code}`} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="no-print mb-4 flex gap-2">
                    <Button onClick={handlePrintTicket} variant="default">
                        Imprimir Ticket
                    </Button>
                    <Button onClick={() => setShowTicketPreview(true)} variant="outline" className="flex gap-1" title="Visualizar factura">
                        <Eye className="size-4" />
                        Ver factura
                    </Button>
                    <Button
                        onClick={() => setShowReturnForm(true)}
                        variant="outline"
                        className="flex gap-1"
                        disabled={remainingSaleProducts.length === 0}
                    >
                        <RotateCcw className="size-4" />
                        Hacer devolución
                    </Button>
                </div>

                <Dialog open={showTicketPreview} onOpenChange={setShowTicketPreview}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Vista previa de la factura</DialogTitle>
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
                            <SaleTicket sale={sale} formatCurrency={formatCurrency} formatDateToLocal={formatDateToLocal} />
                        </div>
                        <DialogClose asChild>
                            <Button variant="outline" className="mt-4 w-full">
                                Cerrar
                            </Button>
                        </DialogClose>
                    </DialogContent>
                </Dialog>
                {/* Ticket para impresión térmica, solo visible al imprimir */}
                <div className="hidden print:block">
                    <SaleTicket sale={sale} formatCurrency={formatCurrency} formatDateToLocal={formatDateToLocal} />
                </div>

                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                    <div className="flex items-center gap-2">
                        <Link href={route('sales.index')}>
                            <Button variant="outline" size="icon" className="h-8 w-8">
                                <ChevronLeft className="size-4" />
                            </Button>
                        </Link>
                        <h1 className="text-xl font-bold break-all md:text-2xl">Venta: {sale.code}</h1>
                    </div>
                    <div className="mt-2 w-fit sm:mt-0 sm:ml-2">{getStatusBadge(sale.status)}</div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Detalles de la Venta</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div>
                                <h3 className="text-lg font-medium">Información General</h3>
                                <dl className="mt-3 grid grid-cols-1 gap-4">
                                    <div className="flex flex-col items-start gap-4">
                                        {/* QR del código de la venta */}
                                        <div className="mx-auto mb-2 w-24 max-w-full md:w-32">
                                            <QRCode
                                                size={220}
                                                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                                                value={sale.code}
                                                viewBox={`0 0 256 256`}
                                            />
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-muted-foreground">Código</dt>
                                            <dd className="mt-1 text-lg break-all">{sale.code}</dd>
                                        </div>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground">Fecha</dt>
                                        <dd className="mt-1 text-lg">{formatDateToLocal(sale.date)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground">Sucursal</dt>
                                        <dd className="mt-1 text-lg">
                                            {sale.branch ? sale.branch.name : <span className="text-neutral-400">N/A</span>}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground">Método de Pago</dt>
                                        <dd className="mt-1 text-lg">{getPaymentMethodText(sale.payment_method)}</dd>
                                    </div>
                                </dl>
                            </div>
                            <div>
                                <h3 className="text-lg font-medium">Personas</h3>
                                <dl className="mt-3 grid grid-cols-1 gap-4">
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground">Cliente</dt>
                                        <dd className="mt-1 text-lg">
                                            {sale.client ? (
                                                <Link
                                                    href={route('clients.show', sale.client_id) + `?fromSale=${sale.id}`}
                                                    className="text-blue-600 hover:underline dark:text-blue-400"
                                                >
                                                    {sale.client.name}
                                                </Link>
                                            ) : (
                                                <span className="text-neutral-400">N/A</span>
                                            )}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-muted-foreground">Vendedor</dt>
                                        <dd className="mt-1 text-lg">
                                            {sale.seller ? sale.seller.name : <span className="text-neutral-400">N/A</span>}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        </div>

                        <div className="mt-8">
                            <h3 className="text-lg font-medium">Valores</h3>
                            <div className="mt-3 overflow-x-auto rounded-md border">
                                <div className="bg-muted/50 px-2 py-2 md:px-4 md:py-3">
                                    <div className="grid grid-cols-2 font-semibold">
                                        <div>Concepto</div>
                                        <div className="text-right">Monto</div>
                                    </div>
                                </div>
                                <div className="divide-y">
                                    <div className="grid grid-cols-2 px-2 py-2 md:px-4 md:py-3">
                                        <div>Valor Neto</div>
                                        <div className="text-right">{formatCurrency(netValue)}</div>
                                    </div>
                                    <div className="grid grid-cols-2 px-2 py-2 md:px-4 md:py-3">
                                        <div>Impuesto (19%)</div>
                                        <div className="text-right">{formatCurrency(taxValue)}</div>
                                    </div>
                                    <div className="grid grid-cols-2 bg-muted/20 px-2 py-2 font-semibold md:px-4 md:py-3">
                                        <div>Total</div>
                                        <div className="text-right">{formatCurrency(totalValue)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sección de Pago y Cambio */}
                        {sale.payment_method === 'cash' && sale.amount_paid && sale.change_amount !== undefined && (
                            <div className="mt-8">
                                <h3 className="text-lg font-medium">Información de Pago</h3>
                                <div className="mt-3 overflow-x-auto rounded-md border">
                                    <div className="bg-muted/50 px-2 py-2 md:px-4 md:py-3">
                                        <div className="grid grid-cols-2 font-semibold">
                                            <div>Concepto</div>
                                            <div className="text-right">Monto</div>
                                        </div>
                                    </div>
                                    <div className="divide-y">
                                        <div className="grid grid-cols-2 px-2 py-2 md:px-4 md:py-3">
                                            <div>Total a Pagar</div>
                                            <div className="text-right">{formatCurrency(totalValue)}</div>
                                        </div>
                                        <div className="grid grid-cols-2 px-2 py-2 md:px-4 md:py-3">
                                            <div>Con Cuánto Pagó</div>
                                            <div className="text-right">{formatCurrency(sale.amount_paid)}</div>
                                        </div>
                                        <div className={`grid grid-cols-2 px-2 py-2 font-semibold md:px-4 md:py-3 ${
                                            sale.change_amount >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                                        }`}>
                                            <div>Cambio</div>
                                            <div className={`text-right ${
                                                sale.change_amount >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                                            }`}>
                                                {formatCurrency(sale.change_amount)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-8">
                            <h3 className="text-lg font-medium">Productos Vendidos</h3>
                            <div className="mt-3 flex flex-col gap-3 md:gap-0">
                                {/* Vista tipo cards en móvil */}
                                <div className="block md:hidden">
                                    {remainingSaleProducts.length > 0 ? (
                                        <div className="flex flex-col gap-3">
                                            {remainingSaleProducts.map((sp) => (
                                                <div key={sp.id} className="rounded-lg border bg-card p-3 shadow-sm">
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-base font-semibold">{sp.product?.name || 'Producto eliminado'}</div>
                                                        <div className="text-xs text-muted-foreground">x{sp.remaining}</div>
                                                    </div>
                                                    <div className="mt-2 flex justify-between text-sm">
                                                        <span className="text-muted-foreground">Precio:</span>
                                                        <span>{formatCurrency(sp.price)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">Subtotal:</span>
                                                        <span className="font-semibold">{formatCurrency(sp.price * sp.remaining)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center text-neutral-400">No hay productos registrados en esta venta</div>
                                    )}
                                </div>
                                {/* Tabla en escritorio */}
                                <div className="hidden md:block">
                                    <div className="overflow-x-auto rounded-md border">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/50">
                                                <tr>
                                                    <th className="px-2 py-2 text-left font-semibold whitespace-nowrap md:px-4 md:py-2">Producto</th>
                                                    <th className="px-2 py-2 text-center font-semibold whitespace-nowrap md:px-4 md:py-2">
                                                        Cantidad
                                                    </th>
                                                    <th className="px-2 py-2 text-right font-semibold whitespace-nowrap md:px-4 md:py-2">Precio</th>
                                                    <th className="px-2 py-2 text-right font-semibold whitespace-nowrap md:px-4 md:py-2">Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {remainingSaleProducts.length > 0 ? (
                                                    remainingSaleProducts.map((sp) => (
                                                        <tr key={sp.id}>
                                                            <td className="px-4 py-3">{sp.product?.name || 'Producto eliminado'}</td>
                                                            <td className="px-4 py-3 text-center">{sp.remaining}</td>
                                                            <td className="px-4 py-3 text-right">{formatCurrency(sp.price)}</td>
                                                            <td className="px-4 py-3 text-right">{formatCurrency(sp.price * sp.remaining)}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={4} className="p-4 text-center text-neutral-400">
                                                            No hay productos registrados en esta venta
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                            <tfoot className="bg-muted/20">
                                                <tr>
                                                    <td className="px-2 py-2 font-semibold md:px-4 md:py-2" colSpan={3}>
                                                        Total
                                                    </td>
                                                    <td className="px-2 py-2 text-right font-semibold md:px-4 md:py-2">
                                                        {formatCurrency(remainingSaleProducts.reduce((acc, sp) => acc + sp.price * sp.remaining, 0))}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 border-t px-4 py-4 md:flex-row md:justify-between md:gap-0 md:px-6">
                        <div className="text-sm text-muted-foreground">
                            <p>Creado: {new Date(sale.created_at).toLocaleDateString()}</p>
                            <p>Última actualización: {new Date(sale.updated_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2 self-end md:self-center">
                            {sale.id && (
                                <Link href={route('sales.edit', sale.id)}>
                                    <Button variant="outline" className="flex gap-1">
                                        <Edit className="size-4" />
                                        <span>Editar</span>
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </CardFooter>
                </Card>
                {/* Historial de devoluciones */}
                {(Array.isArray(sale.saleReturns) ? sale.saleReturns : []).length > 0 && (
                    <div className="mt-8">
                        <h3 className="text-lg font-medium">Devoluciones</h3>
                        <div className="mt-3 flex flex-col gap-3">
                            {(Array.isArray(sale.saleReturns) ? sale.saleReturns : []).map((ret) => (
                                <div key={ret.id} className="rounded-lg border bg-card p-3 shadow-sm">
                                    <div className="font-semibold">Fecha: {new Date(ret.created_at).toLocaleString()}</div>
                                    <div>Motivo: {ret.reason || 'Sin motivo'}</div>
                                    <div>
                                        Productos devueltos:
                                        <ul className="ml-4 list-disc">
                                            {Array.isArray(ret.products) && ret.products.length > 0
                                                ? ret.products.map((p) => (
                                                      <li key={p.id}>
                                                          {p.name} - Cantidad: {p.pivot.quantity}
                                                      </li>
                                                  ))
                                                : null}
                                        </ul>
                                    </div>
                                    <div className="mt-2 flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setShowReturnReceipt({ open: true, returnId: ret.id })}>
                                            Ver recibo de devolución
                                        </Button>
                                        <Button variant="default" size="sm" onClick={() => handlePrintReturnReceipt(ret.id)}>
                                            Imprimir recibo
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {/* Modal para recibo de devolución */}
                            <Dialog open={showReturnReceipt.open} onOpenChange={(open) => setShowReturnReceipt({ open })}>
                                <DialogContent className="max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Recibo de devolución</DialogTitle>
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
                                                // Enrich products for receipt
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
                                                              // Additional fields from SaleReturnProduct
                                                              ...rp,
                                                              id: rp.id,
                                                              name: saleProd?.product?.name ?? 'Producto eliminado',
                                                              price: saleProd?.price ?? 0,
                                                              quantity: rp.pivot?.quantity ?? 0, // Add quantity at top-level
                                                          };
                                                      })
                                                    : [];
                                                return (
                                                    <SaleReturnTicket
                                                        saleReturn={{
                                                            ...ret,
                                                            reason: ret.reason ?? undefined,
                                                            products: enrichedProducts,
                                                        }}
                                                        sale={sale}
                                                        formatCurrency={formatCurrency}
                                                        formatDateToLocal={formatDateToLocal}
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
                    </div>
                )}

                {/* Formulario de devolución */}
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
                        // Actualizar los datos de la venta después de la devolución
                        updateSaleData();
                        setShowReturnForm(false);
                    }}
                />
            </div>
        </AppLayout>
    );
}
