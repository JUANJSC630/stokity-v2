import { Sale, SaleReturn, SaleReturnProduct } from '@/types';

interface Props {
    saleReturn: SaleReturn;
    sale: Sale;
    formatCurrency: (value: number) => string;
}

export default function SaleReturnReceipt({ saleReturn, sale, formatCurrency }: Props) {
    // Función para generar recibo en formato ESC/POS (texto plano)
    const generateEscPosReceipt = () => {
        const lines: string[] = [];
        lines.push('      RECIBO DE DEVOLUCIÓN');
        lines.push('');
        lines.push(formatDateToLocal(saleReturn.created_at));
        lines.push('--------------------------------');
        lines.push(`VENTA: ${sale.code}`);
        lines.push(`Cliente: ${sale.client?.name || 'N/A'}`);
        lines.push(`Vendedor: ${sale.seller?.name || 'N/A'}`);
        lines.push(`Sucursal: ${sale.branch?.name || 'N/A'}`);
        lines.push(`Método de Pago: ${sale.payment_method ? getPaymentMethodText(sale.payment_method) : 'N/A'}`);
        lines.push(`Motivo: ${saleReturn.reason || 'Sin motivo'}`);
        lines.push('--------------------------------');
        lines.push('Productos devueltos:');
        saleReturn.products.forEach((p: SaleReturnProduct) => {
            lines.push('--------------------------------');
            lines.push(`Producto: ${p.name}`);
            lines.push(`Cantidad: ${p.pivot.quantity}`);
            lines.push(`Precio: ${formatCurrency(p.price)}`);
            lines.push(`Subtotal: ${formatCurrency(p.price * p.pivot.quantity)}`);
        });
        lines.push('--------------------------------');
        lines.push(`TOTAL DEVUELTO: ${formatCurrency(totalReturned)}`);
        lines.push('--------------------------------');
        lines.push('Gracias por su preferencia');
        lines.push('');
        lines.push(sale.branch?.business_name || '');
        lines.push('');
        return lines.join('\n');
    };
    // Función para traducir el método de pago
    const getPaymentMethodText = (method: string) => {
        const methods: Record<string, string> = {
            cash: 'Efectivo',
            credit_card: 'Tarjeta de crédito',
            debit_card: 'Tarjeta débito',
            transfer: 'Transferencia',
            other: 'Otro',
        };
        return methods[method] || method;
    };
    const formatDateToLocal = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };  

    const totalReturned = saleReturn.products.reduce((acc, p) => acc + (p.price ?? 0) * (p.pivot?.quantity ?? 0), 0);

    // ...render HTML como antes...
    return (
        <div>
            {/* ...código visual existente... */}
            {/* Para obtener el recibo ESC/POS, llama a generateEscPosReceipt() */}
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', background: '#f4f4f4', padding: '1em', marginTop: '1em' }}>
                {generateEscPosReceipt()}
            </pre>
        </div>
    );
}
