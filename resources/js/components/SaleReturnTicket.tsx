import { type Branch } from '@/types';
import React from 'react';
import QRCode from 'react-qr-code';

interface SaleReturnTicketProps {
    saleReturn: {
        id: number;
        code?: string;
        created_at: string;
        reason?: string;
        products: Array<{
            id: number;
            name: string;
            price: number;
            quantity: number;
        }>;
    };
    sale: {
        code: string;
        branch?: Branch | null;
        client?: { name: string; document?: string | undefined; phone?: string | undefined; address?: string | undefined } | null;
        seller?: { name: string } | null;
    };
    formatCurrency: (value: number) => string;
    formatDateToLocal: (date: string) => string;
}

const SaleReturnTicket: React.FC<SaleReturnTicketProps> = ({ saleReturn, sale, formatCurrency, formatDateToLocal }) => {
    // Calcular totales
    const net = saleReturn.products.reduce((acc, p) => acc + p.price * p.quantity, 0);
    const tax = net * 0.19;
    const total = net + tax;
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
                <img 
                    src="/uploads/default-product.png" 
                    alt="Default Logo" 
                    className="rounded-full"
                    style={{ maxWidth: '40mm', width: '100%', height: 'auto', display: 'block', margin: '0 auto' }} 
                />
                <div style={{ fontWeight: 'bold', fontSize: 13 }}>{sale.branch?.business_name}</div>
                <div style={{ fontSize: 10 }}>GRACIAS POR PREFERIRNOS WhatsApp: 3148279405</div>
            </div>
            {/* QR y código de devolución */}
            <div style={{ margin: '4px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 'bold' }}>Código QR:</div>
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <QRCode value={saleReturn.code || String(saleReturn.id)} size={60} />
                </div>
            </div>
            <hr />
            {/* Datos de la devolución */}
            <div style={{ border: '1px dashed #000', padding: 2, marginBottom: 2 }}>
                <div style={{ fontWeight: 'bold', fontSize: 11 }}>
                    RECIBO DE DEVOLUCIÓN<br />#{saleReturn.code || saleReturn.id}
                </div>
                <div style={{ fontSize: 10 }}>{formatDateToLocal(saleReturn.created_at)}</div>
                <div style={{ fontSize: 10 }}>Motivo: {saleReturn.reason || 'Sin motivo'}</div>
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
            {/* Productos devueltos */}
            <table style={{ width: '100%', fontSize: 10, textAlign: 'center' }}>
                <thead>
                    <tr>
                        <th style={{ width: '60%' }}>Producto</th>
                        <th style={{ width: '20%' }}>Cant</th>
                        <th style={{ width: '20%' }}>Precio</th>
                    </tr>
                </thead>
                <tbody>
                    {saleReturn.products.map((p) => (
                        <tr key={p.id}>
                            <td>{p.name}</td>
                            <td>{p.quantity}</td>
                            <td>{formatCurrency(p.price)}</td>
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
                        <td>{formatCurrency(net)}</td>
                    </tr>
                    <tr>
                        <td style={{ fontWeight: 'bold' }}>Impuesto:</td>
                        <td>{formatCurrency(tax)}</td>
                    </tr>
                    <tr>
                        <td style={{ fontWeight: 'bold', borderTop: '1px solid #000' }}>Total:</td>
                        <td style={{ borderTop: '1px solid #000' }}>{formatCurrency(total)}</td>
                    </tr>
                </tbody>
            </table>
            <hr />
            <p style={{ fontSize: 10, marginTop: 2 }}>¡Gracias por su devolución!</p>
        </div>
    );
};

export default SaleReturnTicket;
