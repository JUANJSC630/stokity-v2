import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, ChevronLeft, Clock, Edit, XCircle } from 'lucide-react';
import QRCode from 'react-qr-code';
import SaleTicket from '@/components/SaleTicket';

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

interface Product {
    id: number;
    name: string;
}

interface SaleProduct {
    id: number;
    sale_id: number;
    product_id: number;
    quantity: number;
    price: number;
    subtotal: number;
    product?: Product | null; // Producto puede ser opcional o nulo
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
    created_at: string;
    updated_at: string;
    branch?: Branch | null;
    client?: Client | null;
    seller?: User | null;
    saleProducts: SaleProduct[]; // La propiedad saleProducts siempre debe ser un array
}

interface Props {
    sale: Sale;
}

export default function Show({ sale }: Props) {
    // Depuración en el cliente
    console.log('Sale data received:', sale);
    console.log('Sale products:', sale.saleProducts);

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

    // Imprimir solo el ticket en popup usando HTML puro
    const handlePrintTicket = () => {
        const printWindow = window.open('', '', 'width=400,height=600');
        if (printWindow) {
            // Genera el HTML del ticket
            const ticketHtml = `
                <div class="ticket">
                    <div style="text-align:center;margin-bottom:4px;">
                        <img src='/logo-stockity.png' alt='Stokity Logo' style='max-width:80px;margin:0 auto;' />
                        <div style='font-weight:bold;font-size:16px;'>Stokity</div>
                        <div style='font-size:12px;'>GRACIAS POR PREFERIRNOS WhatsApp: 3148279405</div>
                    </div>
                    <hr />
                    <div style='border:1px solid #000;padding:4px;margin-bottom:4px;'>
                        <div style='font-weight:bold;font-size:12px;'>FACTURA DE VENTA # ${sale.code}</div>
                        <div style='font-size:11px;'>SUCURSAL: ${sale.branch?.name || 'N/A'}</div>
                        <div style='font-size:11px;'>FECHA: ${formatDateToLocal(sale.date)}</div>
                    </div>
                    <div style='border:1px solid #000;padding:4px;margin-bottom:4px;'>
                        <div style='font-weight:bold;font-size:11px;'>DATOS CLIENTE</div>
                        <div style='font-size:11px;'>NOMBRE: ${sale.client?.name || 'Consumidor Final'}</div>
                    </div>
                    <div style='border:1px solid #000;padding:4px;margin-bottom:4px;'>
                        <div style='font-weight:bold;font-size:11px;'>VENDEDOR: ${sale.seller?.name || 'N/A'}</div>
                    </div>
                    <table style='width:100%;font-size:12px;'>
                        <thead>
                            <tr>
                                <th style='text-align:left;'>Producto</th>
                                <th style='text-align:center;'>Cant</th>
                                <th style='text-align:right;'>Precio</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sale.saleProducts.map(sp => `
                                <tr>
                                    <td>${sp.product?.name || 'Eliminado'}</td>
                                    <td style='text-align:center;'>${sp.quantity}</td>
                                    <td style='text-align:right;'>${formatCurrency(sp.price)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <hr />
                    <p><b>Neto:</b> ${formatCurrency(sale.net)}</p>
                    <p><b>Impuesto:</b> ${formatCurrency(sale.tax)}</p>
                    <p><b>Total:</b> ${formatCurrency(sale.total)}</p>
                    <hr />
                    <p style='text-align:center;font-size:10px;'>¡Gracias por su compra!</p>
                </div>
            `;
            printWindow.document.write(`
                <html>
                <head>
                    <title>Ticket Venta ${sale.code}</title>
                    <style>
                        @media print {
                            body, html { background: white !important; margin: 0 !important; padding: 0 !important; width: 58mm; }
                            .ticket { width: 58mm; max-width: 58mm; min-width: 58mm; margin: 0 auto; font-size: 12px; background: white; color: black; padding: 0; page-break-inside: avoid; break-inside: avoid; }
                        }
                    </style>
                </head>
                <body onload="window.print();window.close();">${ticketHtml}</body>
                </html>
            `);
            printWindow.document.close();
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
                </div>
                {/* Ticket para impresión térmica, solo visible al imprimir */}
                <div className="print:block hidden">
                    <SaleTicket sale={sale} formatCurrency={formatCurrency} formatDateToLocal={formatDateToLocal} />
                </div>

                <div className="flex items-center gap-2">
                    <Link href={route('sales.index')}>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                            <ChevronLeft className="size-4" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">Venta: {sale.code}</h1>
                    <div className="ml-2">{getStatusBadge(sale.status)}</div>
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
                                        <div style={{ height: 'auto', maxWidth: 120, width: 120 }}>
                                            <QRCode
                                                size={220}
                                                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                                                value={sale.code}
                                                viewBox={`0 0 256 256`}
                                            />
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-muted-foreground">Código</dt>
                                            <dd className="mt-1 text-lg">{sale.code}</dd>
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
                                                    href={route('clients.show', sale.client_id)}
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
                            <div className="mt-3 overflow-hidden rounded-md border">
                                <div className="bg-muted/50 px-4 py-3">
                                    <div className="grid grid-cols-2 font-semibold">
                                        <div>Concepto</div>
                                        <div className="text-right">Monto</div>
                                    </div>
                                </div>
                                <div className="divide-y">
                                    <div className="grid grid-cols-2 px-4 py-3">
                                        <div>Valor Neto</div>
                                        <div className="text-right">{formatCurrency(sale.net)}</div>
                                    </div>
                                    <div className="grid grid-cols-2 px-4 py-3">
                                        <div>Impuesto (19%)</div>
                                        <div className="text-right">{formatCurrency(sale.tax)}</div>
                                    </div>
                                    <div className="grid grid-cols-2 bg-muted/20 px-4 py-3 font-semibold">
                                        <div>Total</div>
                                        <div className="text-right">{formatCurrency(sale.total)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <h3 className="text-lg font-medium">Productos Vendidos</h3>
                            <div className="mt-3 overflow-x-auto rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-semibold whitespace-nowrap">Producto</th>
                                            <th className="px-4 py-2 text-center font-semibold whitespace-nowrap">Cantidad</th>
                                            <th className="px-4 py-2 text-right font-semibold whitespace-nowrap">Precio</th>
                                            <th className="px-4 py-2 text-right font-semibold whitespace-nowrap">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {(() => {
                                            // Verificación detallada de la estructura de datos
                                            console.log('Renderizando productos:', {
                                                saleProductsExists: Boolean(sale.saleProducts),
                                                isArray: Array.isArray(sale.saleProducts),
                                                length: sale.saleProducts ? sale.saleProducts.length : 0,
                                            });

                                            if (sale.saleProducts && Array.isArray(sale.saleProducts) && sale.saleProducts.length > 0) {
                                                return sale.saleProducts.map((sp) => (
                                                    <tr key={sp.id}>
                                                        <td className="px-4 py-3">{sp.product?.name || 'Producto eliminado'}</td>
                                                        <td className="px-4 py-3 text-center">{sp.quantity}</td>
                                                        <td className="px-4 py-3 text-right">{formatCurrency(sp.price)}</td>
                                                        <td className="px-4 py-3 text-right">{formatCurrency(sp.subtotal)}</td>
                                                    </tr>
                                                ));
                                            } else {
                                                return (
                                                    <tr>
                                                        <td colSpan={4} className="p-4 text-center text-neutral-400">
                                                            No hay productos registrados en esta venta
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                        })()}
                                    </tbody>
                                    <tfoot className="bg-muted/20">
                                        <tr>
                                            <td className="px-4 py-2 font-semibold" colSpan={3}>
                                                Total
                                            </td>
                                            <td className="px-4 py-2 text-right font-semibold">{formatCurrency(sale.total)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 border-t px-6 py-4 md:flex-row md:justify-between md:gap-0">
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
            </div>
        </AppLayout>
    );
}
