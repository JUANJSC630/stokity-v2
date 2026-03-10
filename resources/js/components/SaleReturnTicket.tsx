import { type Branch } from '@/types';
import React from 'react';

interface TicketConfig {
    paper_width: 58 | 80;
    header_size: 'normal' | 'large';
    show_logo: boolean;
    show_nit: boolean;
    show_address: boolean;
    show_phone: boolean;
    show_seller: boolean;
    show_branch: boolean;
    show_tax: boolean;
    footer_line1: string;
    footer_line2: string;
}

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
            tax?: number;
        }>;
    };
    sale: {
        code: string;
        branch?: Branch | null;
        client?: { name: string } | null;
        seller?: { name: string } | null;
    };
    businessName?: string | null;
    businessNit?: string | null;
    businessAddress?: string | null;
    businessPhone?: string | null;
    businessLogoUrl?: string | null;
    ticketConfig?: TicketConfig;
}

const DEFAULT_CONFIG: TicketConfig = {
    paper_width: 58,
    header_size: 'large',
    show_logo: false,
    show_nit: true,
    show_address: true,
    show_phone: true,
    show_seller: true,
    show_branch: true,
    show_tax: true,
    footer_line1: '¡Gracias por su compra!',
    footer_line2: 'Vuelva pronto',
};

function fmt(n: number): string {
    return '$' + Math.round(n).toLocaleString('es-CO');
}

function fmtDate(dateString: string | undefined | null): string {
    if (!dateString) return '';
    const d = new Date(dateString);
    return (
        String(d.getDate()).padStart(2, '0') +
        '/' +
        String(d.getMonth() + 1).padStart(2, '0') +
        '/' +
        d.getFullYear() +
        ' ' +
        String(d.getHours()).padStart(2, '0') +
        ':' +
        String(d.getMinutes()).padStart(2, '0')
    );
}

const SaleReturnTicket: React.FC<SaleReturnTicketProps> = ({
    saleReturn,
    sale,
    businessName,
    businessNit,
    businessAddress,
    businessPhone,
    businessLogoUrl,
    ticketConfig,
}) => {
    const config = ticketConfig ?? DEFAULT_CONFIG;
    const is58 = config.paper_width === 58;
    const chars = is58 ? 32 : 48;

    const mono: React.CSSProperties = {
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: '12px',
    };

    const Sep = ({ double = false }: { double?: boolean }) => (
        <div style={{ ...mono, fontSize: '10px', overflow: 'hidden', whiteSpace: 'nowrap', color: '#555', margin: '3px 0' }}>
            {(double ? '=' : '-').repeat(chars)}
        </div>
    );

    const Row = ({ label, value }: { label: string; value: string }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', ...mono }}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );

    const net = saleReturn.products.reduce((acc, p) => acc + p.price * p.quantity, 0);
    const tax = saleReturn.products.reduce((acc, p) => {
        const productTax = p.tax ?? 0;
        return acc + (p.price * p.quantity * productTax) / 100;
    }, 0);
    const total = net + tax;

    const name = businessName ?? sale.branch?.business_name ?? sale.branch?.name;

    return (
        <div
            style={{
                ...mono,
                lineHeight: '1.6',
                color: '#111',
                backgroundColor: '#fff',
                padding: '16px 14px',
                width: is58 ? '260px' : '368px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
                borderRadius: '4px',
            }}
        >
            {/* ── Header ── */}
            <div style={{ textAlign: 'center', marginBottom: '2px' }}>
                {config.show_logo && businessLogoUrl && (
                    <img
                        src={businessLogoUrl}
                        alt="Logo"
                        style={{ maxWidth: is58 ? '80px' : '110px', height: 'auto', display: 'block', margin: '0 auto 6px' }}
                    />
                )}
                <div
                    style={{
                        fontWeight: 'bold',
                        fontSize: config.header_size === 'large' ? '22px' : '14px',
                        lineHeight: 1.2,
                        marginBottom: '3px',
                    }}
                >
                    {name}
                </div>
                {config.show_nit && businessNit && <div style={mono}>NIT: {businessNit}</div>}
                {config.show_address && businessAddress && <div style={mono}>{businessAddress}</div>}
                {config.show_phone && businessPhone && <div style={mono}>Tel: {businessPhone}</div>}
            </div>

            <Sep double />

            {/* ── Return header ── */}
            <div style={{ textAlign: 'center', fontWeight: 'bold', ...mono, marginBottom: '2px' }}>RECIBO DE DEVOLUCIÓN</div>

            <Sep />

            {/* ── Return info ── */}
            {[
                { label: 'Devol.:  ', value: String(saleReturn.code ?? saleReturn.id) },
                { label: 'Venta:   ', value: sale.code },
                { label: 'Fecha:   ', value: fmtDate(saleReturn.created_at) },
                { label: 'Cliente: ', value: sale.client?.name ?? 'Consumidor Final' },
                ...(config.show_seller && sale.seller ? [{ label: 'Vendedor:', value: ' ' + sale.seller.name }] : []),
                ...(config.show_branch && sale.branch ? [{ label: 'Sucursal:', value: ' ' + sale.branch.name }] : []),
                ...(saleReturn.reason ? [{ label: 'Motivo:  ', value: saleReturn.reason }] : []),
            ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', ...mono }}>
                    <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{label}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                </div>
            ))}

            <Sep />

            {/* ── Products table header ── */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto auto',
                    gap: '0 8px',
                    fontWeight: 'bold',
                    ...mono,
                    borderBottom: '1px dashed #999',
                    paddingBottom: '3px',
                    marginBottom: '3px',
                }}
            >
                <span>Producto</span>
                <span style={{ textAlign: 'right' }}>Cant</span>
                <span style={{ textAlign: 'right' }}>Precio</span>
                <span style={{ textAlign: 'right' }}>Total</span>
            </div>

            {/* ── Products ── */}
            {saleReturn.products.map((p) => (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '0 8px', ...mono }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <span style={{ textAlign: 'right' }}>{p.quantity}</span>
                    <span style={{ textAlign: 'right' }}>{fmt(p.price)}</span>
                    <span style={{ textAlign: 'right' }}>{fmt(p.price * p.quantity)}</span>
                </div>
            ))}

            <Sep />

            {/* ── Totals ── */}
            <Row label="Subtotal:" value={fmt(net)} />
            {config.show_tax && tax > 0 && <Row label="Impuesto:" value={fmt(tax)} />}

            <Sep double />

            {/* ── TOTAL ── */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 'bold',
                    fontSize: '20px',
                    lineHeight: 1.3,
                    fontFamily: "'Courier New', Courier, monospace",
                    margin: '2px 0',
                }}
            >
                <span>TOTAL:</span>
                <span>{fmt(total)}</span>
            </div>

            <Sep double />

            {/* ── Footer ── */}
            <div style={{ textAlign: 'center', marginTop: '4px', ...mono }}>
                {config.footer_line1 && <div>{config.footer_line1}</div>}
                {config.footer_line2 && <div>{config.footer_line2}</div>}
            </div>
        </div>
    );
};

export default SaleReturnTicket;
