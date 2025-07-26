import { type Branch } from '@/types';
import React from 'react';
import QRCode from 'react-qr-code';

interface SaleTicketProps {
    sale: {
        code: string;
        date: string;
        branch?: Branch | null;
        client?: { name: string; document?: string | undefined; phone?: string | undefined; address?: string | undefined } | null;
        seller?: { name: string } | null;
        saleProducts: Array<{
            id: number;
            quantity: number;
            price: number;
            product?: { name: string } | null;
        }>;
        net: number;
        tax: number;
        total: number;
        payment_method?: string;
        amount_paid?: number;
        change_amount?: number;
    };
    formatCurrency: (value: number) => string;
    formatDateToLocal: (date: string) => string;
}

const SaleTicket: React.FC<SaleTicketProps> = ({ sale, formatCurrency, formatDateToLocal }) => {
    console.log('SaleTicket sale:', sale);
    return (
        <div
            className="ticket"
            style={{
                width: '100%',
                fontFamily: 'Arial, monospace',
                fontSize: 15,
                background: '#fff',
                padding: 0,
                margin: 0,
                boxSizing: 'border-box',
                textAlign: 'center',
            }}
        >
            {/* Logo y encabezado */}
            <div style={{ marginBottom: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Puedes cambiar la imagen por tu logo real */}
                <img 
                    src="/uploads/default-product.png" 
                    alt="Default Logo" 
                    className="rounded-full"
                    style={{ maxWidth: '40mm', width: '100%', height: 'auto', display: 'block', margin: '0 auto' }} 
                />
                <div style={{ fontWeight: 'bold', fontSize: 13 }}>{sale.branch?.business_name}</div>
                <div style={{ fontSize: 10 }}>GRACIAS POR PREFERIRNOS WhatsApp: 3148279405</div>
            </div>
            {/* QR y CUFE */}
            <div style={{ margin: '4px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 'bold' }}>Código QR:</div>
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <QRCode value={sale.code} size={60} />
                </div>
            </div>
            {/* CUFE, si tienes ese dato */}
            {/* <div style={{ fontSize: 10, wordBreak: 'break-all', textAlign: 'center' }}>
        CUFE: {sale.cufe || 'N/A'}
      </div> */}
            <hr />
            {/* Datos de la venta y cliente en caja */}
            <div style={{ border: '1px dashed #000', padding: 2, marginBottom: 2 }}>
                <div style={{ fontWeight: 'bold', fontSize: 11 }}>
                    FACTURA DE VENTA #<br />{sale.code}
                </div>
                <div style={{ fontSize: 10 }}>
                    {typeof sale.branch?.manager === 'string' ? sale.branch.manager : sale.branch?.manager?.name || 'N/A'}
                </div>
                <div style={{ fontSize: 10 }}>
                    {sale.branch?.address || 'N/A'} {sale.branch?.name || 'N/A'}
                </div>
                <div style={{ fontSize: 10 }}>{sale.branch?.phone || 'N/A'}</div>
                <div style={{ fontSize: 10 }}>{formatDateToLocal(sale.date)}</div>
            </div>

            {/* Datos del cliente */}
            <div style={{ border: '1px dashed #000', padding: 2, marginBottom: 2 }}>
                <div style={{ fontWeight: 'bold', fontSize: 10 }}>DATOS CLIENTE</div>
                <div style={{ fontSize: 10 }}>NOMBRE: {sale.client?.name || 'Consumidor Final'}</div>
                <div style={{ fontSize: 10 }}>NIT/C.C.: {sale.client?.document || 'N/A'}</div>
                <div style={{ fontSize: 10 }}>TELÉFONO: {sale.client?.phone || 'N/A'}</div>
                <div style={{ fontSize: 10 }}>DIRECCIÓN: {sale.client?.address || 'N/A'}</div>
            </div>

            {/* Vendedor */}
            <div style={{ border: '1px dashed #000', padding: 2, marginBottom: 2 }}>
                <div style={{ fontWeight: 'bold', fontSize: 10 }}>
                    VENDEDOR:<br />{sale.seller?.name || 'N/A'}
                </div>
            </div>
            <hr />

            {/* Productos vendidos */}
            <table style={{ width: '100%', fontSize: 10, textAlign: 'center' }}>
                <thead>
                    <tr>
                        <th style={{ width: '60%' }}>Producto</th>
                        <th style={{ width: '20%' }}>Cant</th>
                        <th style={{ width: '20%' }}>Precio</th>
                    </tr>
                </thead>
                <tbody>
                    {sale.saleProducts.map((sp) => (
                        <tr key={sp.id}>
                            <td>{sp.product?.name || 'Eliminado'}</td>
                            <td>{sp.quantity}</td>
                            <td>{formatCurrency(sp.price)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <hr />

            {/* Totales */}
            <table style={{ width: '100%', fontSize: 10, marginTop: 4, marginBottom: 4, textAlign: 'center' }}>
                <tbody>
                    <tr>
                        <td style={{ fontWeight: 'bold' }}>Neto:</td>
                        <td>{formatCurrency(sale.net)}</td>
                    </tr>
                    <tr>
                        <td style={{ fontWeight: 'bold' }}>Impuesto:</td>
                        <td>{formatCurrency(sale.tax)}</td>
                    </tr>
                    <tr>
                        <td style={{ fontWeight: 'bold', borderTop: '1px solid #000' }}>Total:</td>
                        <td style={{ borderTop: '1px solid #000' }}>{formatCurrency(sale.total)}</td>
                    </tr>
                </tbody>
            </table>
            <hr />

            {/* Información de Pago y Cambio */}
            {sale.payment_method === 'cash' && sale.amount_paid && sale.change_amount !== undefined && (
                <>
                    <table style={{ width: '100%', fontSize: 10, marginTop: 4, marginBottom: 4, textAlign: 'center' }}>
                        <tbody>
                            <tr>
                                <td style={{ fontWeight: 'bold' }}>Total a Pagar:</td>
                                <td>{formatCurrency(sale.total)}</td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 'bold' }}>Con Cuánto Pagó:</td>
                                <td>{formatCurrency(sale.amount_paid)}</td>
                            </tr>
                            <tr>
                                <td style={{ fontWeight: 'bold', borderTop: '1px solid #000' }}>Cambio:</td>
                                <td style={{ 
                                    borderTop: '1px solid #000',
                                    color: sale.change_amount >= 0 ? '#059669' : '#dc2626',
                                    fontWeight: 'bold'
                                }}>
                                    {formatCurrency(sale.change_amount)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <hr />
                </>
            )}

            <p style={{ fontSize: 10, marginTop: 2 }}>¡Gracias por su compra!</p>
        </div>
    );
};

export default SaleTicket;
