import React from 'react';

interface SaleTicketProps {
  sale: {
    code: string;
    date: string;
    branch?: { name: string } | null;
    client?: { name: string } | null;
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
  return (
    <div className="ticket">
      {/* Logo y encabezado */}
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        {/* Puedes cambiar la imagen por tu logo real */}
        <img src="/logo-stockity.png" alt="Stokity Logo" style={{ maxWidth: 80, margin: '0 auto' }} />
        <div style={{ fontWeight: 'bold', fontSize: 16 }}>Stokity</div>
        <div style={{ fontSize: 12 }}>GRACIAS POR PREFERIRNOS WhatsApp: 3148279405</div>
      </div>
      {/* QR y CUFE */}
      <div style={{ textAlign: 'center', margin: '8px 0' }}>
        <div style={{ fontSize: 12, fontWeight: 'bold' }}>Código QR:</div>
        {/* Aquí podrías renderizar el QR si lo tienes como imagen o componente */}
        {/* <QRCode value={sale.code} size={80} /> */}
      </div>
      {/* CUFE, si tienes ese dato */}
      {/* <div style={{ fontSize: 10, wordBreak: 'break-all', textAlign: 'center' }}>
        CUFE: {sale.cufe || 'N/A'}
      </div> */}
      <hr />
      {/* Datos de la venta y cliente en caja */}
      <div style={{ border: '1px solid #000', padding: 4, marginBottom: 4 }}>
        <div style={{ fontWeight: 'bold', fontSize: 12 }}>FACTURA DE VENTA # {sale.code}</div>
        <div style={{ fontSize: 11 }}>SUCURSAL: {sale.branch?.name || 'N/A'}</div>
        <div style={{ fontSize: 11 }}>FECHA: {formatDateToLocal(sale.date)}</div>
      </div>
      <div style={{ border: '1px solid #000', padding: 4, marginBottom: 4 }}>
        <div style={{ fontWeight: 'bold', fontSize: 11 }}>DATOS CLIENTE</div>
        <div style={{ fontSize: 11 }}>NOMBRE: {sale.client?.name || 'Consumidor Final'}</div>
        {/* Puedes agregar más datos si los tienes, como documento, teléfono, dirección... */}
      </div>
      <div style={{ border: '1px solid #000', padding: 4, marginBottom: 4 }}>
        <div style={{ fontWeight: 'bold', fontSize: 11 }}>VENDEDOR: {sale.seller?.name || 'N/A'}</div>
      </div>
      <hr />
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
      <p><b>Neto:</b> {formatCurrency(sale.net)}</p>
      <p><b>Impuesto:</b> {formatCurrency(sale.tax)}</p>
      <p><b>Total:</b> {formatCurrency(sale.total)}</p>
      <hr />
      <p style={{ textAlign: 'center', fontSize: 10 }}>¡Gracias por su compra!</p>
    </div>
  );
};

export default SaleTicket;
