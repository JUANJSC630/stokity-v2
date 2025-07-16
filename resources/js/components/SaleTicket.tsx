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
    };
    formatCurrency: (value: number) => string;
    formatDateToLocal: (date: string) => string;
}

const SaleTicket: React.FC<SaleTicketProps> = ({ sale, formatCurrency, formatDateToLocal }) => {
    console.log('SaleTicket sale:', sale);
    return (
        <div className="ticket">
            {/* Logo y encabezado */}
            <div style={{ textAlign: 'center', marginBottom: 4 }}>
                {/* Puedes cambiar la imagen por tu logo real */}
                <img src="/uploads/default-product.png" alt="Default Logo" className="rounded-full" style={{ maxWidth: 80, margin: '0 auto' }} />
                <div style={{ fontWeight: 'bold', fontSize: 16 }}>{sale.branch?.business_name}</div>
                <div style={{ fontSize: 12 }}>GRACIAS POR PREFERIRNOS WhatsApp: 3148279405</div>
            </div>
            {/* QR y CUFE */}
            <div style={{ textAlign: 'center', margin: '8px 0' }}>
                <div style={{ fontSize: 12, fontWeight: 'bold' }}>Código QR:</div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                    <QRCode value={sale.code} size={80} />
                </div>
            </div>
            {/* CUFE, si tienes ese dato */}
            {/* <div style={{ fontSize: 10, wordBreak: 'break-all', textAlign: 'center' }}>
        CUFE: {sale.cufe || 'N/A'}
      </div> */}
            <hr />
            {/* Datos de la venta y cliente en caja */}
            <div style={{ border: '1px solid #000', padding: 4, marginBottom: 4, textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', fontSize: 12 }}>
                    FACTURA DE VENTA # <br /> {sale.code}
                </div>
                <div style={{ fontSize: 11 }}>
                    {typeof sale.branch?.manager === 'string' ? sale.branch.manager : sale.branch?.manager?.name || 'N/A'}
                </div>
                <div style={{ fontSize: 11 }}>
                    {sale.branch?.address || 'N/A'} {sale.branch?.name || 'N/A'}
                </div>
                <div style={{ fontSize: 11 }}>{sale.branch?.phone || 'N/A'}</div>
                <div style={{ fontSize: 11 }}>{formatDateToLocal(sale.date)}</div>
            </div>

            {/* Datos del cliente */}
            <div style={{ border: '1px solid #000', padding: 4, marginBottom: 4 }}>
                <div style={{ fontWeight: 'bold', fontSize: 11 }}>DATOS CLIENTE</div>
                <div style={{ fontSize: 11 }}>NOMBRE: {sale.client?.name || 'Consumidor Final'}</div>
                <div style={{ fontSize: 11 }}>NIT/C.C.: {sale.client?.document || 'N/A'}</div>
                <div style={{ fontSize: 11 }}>TELÉFONO: {sale.client?.phone || 'N/A'}</div>
                <div style={{ fontSize: 11 }}>DIRECCIÓN: {sale.client?.address || 'N/A'}</div>
                {/* Puedes agregar más datos si los tienes, como documento, teléfono, dirección... */}
            </div>

            {/* Vendedor */}
            <div style={{ border: '1px solid #000', padding: 4, marginBottom: 4 }}>
                <div style={{ fontWeight: 'bold', fontSize: 11 }}>
                    VENDEDOR: <br /> {sale.seller?.name || 'N/A'}
                </div>
            </div>
            <hr />

            {/* Productos vendidos */}
            <table style={{ width: '100%', fontSize: 12 }}>
                <thead>
                    <tr>
                        <th style={{ textAlign: 'left' }}>Producto</th>
                        <th style={{ textAlign: 'center' }}>Cant</th>
                        <th style={{ textAlign: 'right' }}>Precio</th>
                    </tr>
                </thead>
                <tbody>
                    {sale.saleProducts.map((sp) => (
                        <tr key={sp.id}>
                            <td>{sp.product?.name || 'Eliminado'}</td>
                            <td style={{ textAlign: 'center' }}>{sp.quantity}</td>
                            <td style={{ textAlign: 'right' }}>{formatCurrency(sp.price)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <hr />

            {/* Totales */}
            <table style={{ width: '100%', fontSize: 12, marginTop: 8, marginBottom: 8 }}>
                <tbody>
                    <tr>
                        <td style={{ fontWeight: 'bold', textAlign: 'left' }}>Neto:</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(sale.net)}</td>
                    </tr>
                    <tr>
                        <td style={{ fontWeight: 'bold', textAlign: 'left' }}>Impuesto:</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(sale.tax)}</td>
                    </tr>
                    <tr>
                        <td style={{ fontWeight: 'bold', textAlign: 'left', borderTop: '1px solid #000' }}>Total:</td>
                        <td style={{ textAlign: 'right', borderTop: '1px solid #000' }}>{formatCurrency(sale.total)}</td>
                    </tr>
                </tbody>
            </table>
            <hr />

            <p style={{ textAlign: 'center', fontSize: 12, marginTop: 4 }}>¡Gracias por su compra!</p>
        </div>
    );
};

export default SaleTicket;
