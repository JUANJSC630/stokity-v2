import { type Branch } from '@/types';
import QRCode from 'react-qr-code';
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
    sale_code_graphic: 'none' | 'qr' | 'barcode';
    // Return fields (present in ticketConfig but unused here)
    return_show_seller?: boolean;
    return_show_branch?: boolean;
    return_show_reason?: boolean;
    return_footer_line1?: string;
    return_footer_line2?: string;
    return_code_graphic?: 'none' | 'qr' | 'barcode';
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
    sale_code_graphic: 'none',
};

function fmt(n: number): string {
    return '$' + Math.round(n).toLocaleString('es-CO');
}

interface SaleTicketProps {
    sale: {
        code: string;
        created_at?: string;
        date?: string;
        branch?: Branch | null;
        client?: { name: string } | null;
        seller?: { name: string } | null;
        saleProducts: Array<{
            id: number;
            quantity: number;
            price: number;
            subtotal?: number;
            product?: { name: string } | null;
        }>;
        net: number;
        tax: number;
        discount_type?: string | null;
        discount_value?: number | null;
        discount_amount?: number | null;
        total: number;
        payment_method?: string | null;
        amount_paid?: number | null;
        change_amount?: number | null;
    };
    businessName?: string | null;
    businessNit?: string | null;
    businessAddress?: string | null;
    businessPhone?: string | null;
    businessLogoUrl?: string | null;
    ticketConfig?: TicketConfig;
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

const PAYMENT_LABELS: Record<string, string> = {
    cash: 'Efectivo',
    nequi: 'Nequi',
    credit_card: 'Tarjeta crédito',
    debit_card: 'Tarjeta débito',
    transfer: 'Transferencia',
    other: 'Otro',
};

const SaleTicket: React.FC<SaleTicketProps> = ({
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
        <div style={{ ...mono, fontSize: '10px', overflow: 'hidden', whiteSpace: 'nowrap', color: '#555', margin: '3px 0', letterSpacing: '0px' }}>
            {(double ? '=' : '-').repeat(chars)}
        </div>
    );

    const Row = ({ label, value }: { label: string; value: string }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', ...mono }}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );

    const dateStr = fmtDate(sale.created_at ?? sale.date);
    const paymentLabel = PAYMENT_LABELS[sale.payment_method ?? ''] ?? sale.payment_method ?? '';
    const isCash = sale.payment_method === 'cash';

    return (
        <div
            style={{
                ...mono,
                lineHeight: '1.6',
                color: '#111',
                backgroundColor: '#fff',
                padding: '16px 14px',
                width: is58 ? '260px' : '368px',
                height: 'fit-content',
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
                    {businessName ?? sale.branch?.business_name ?? sale.branch?.name}
                </div>
                {config.show_nit && businessNit && <div style={mono}>NIT: {businessNit}</div>}
                {config.show_address && businessAddress && <div style={mono}>{businessAddress}</div>}
                {config.show_phone && businessPhone && <div style={mono}>Tel: {businessPhone}</div>}
            </div>

            <Sep double />

            {/* ── Sale info ── */}
            {[
                { label: 'Recibo:  ', value: sale.code },
                { label: 'Fecha:   ', value: dateStr },
                { label: 'Cliente: ', value: sale.client?.name ?? 'Consumidor Final' },
                ...(config.show_seller && sale.seller ? [{ label: 'Vendedor:', value: ' ' + sale.seller.name }] : []),
                ...(config.show_branch && sale.branch ? [{ label: 'Sucursal:', value: ' ' + sale.branch.name }] : []),
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
            {sale.saleProducts.map((sp) => (
                <div key={sp.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '0 8px', ...mono }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.product?.name ?? 'Eliminado'}</span>
                    <span style={{ textAlign: 'right' }}>{sp.quantity}</span>
                    <span style={{ textAlign: 'right' }}>{fmt(sp.price)}</span>
                    <span style={{ textAlign: 'right' }}>{fmt(sp.subtotal ?? sp.price * sp.quantity)}</span>
                </div>
            ))}

            <Sep />

            {/* ── Totals ── */}
            <Row label="Subtotal:" value={fmt(sale.net)} />
            {config.show_tax && <Row label="Impuesto:" value={fmt(sale.tax)} />}
            {(sale.discount_amount ?? 0) > 0 && (
                <Row
                    label={
                        sale.discount_type === 'percentage'
                            ? is58
                                ? `Descto (${sale.discount_value}%):`
                                : `Descuento (${sale.discount_value}%):`
                            : 'Descuento:'
                    }
                    value={`- ${fmt(sale.discount_amount ?? 0)}`}
                />
            )}

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
                <span>{fmt(sale.total)}</span>
            </div>

            <Sep />

            {/* ── Payment ── */}
            <Row label="Metodo pago:" value={paymentLabel} />
            {isCash && sale.amount_paid != null && <Row label="Efectivo:" value={fmt(sale.amount_paid)} />}
            {isCash && sale.change_amount != null && <Row label="Cambio:" value={fmt(sale.change_amount)} />}

            {/* ── Code graphic ── */}
            {config.sale_code_graphic !== 'none' && (
                <>
                    <Sep />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '6px 0' }}>
                        {config.sale_code_graphic === 'qr' ? (
                            <>
                                <QRCode size={80} value={sale.code} viewBox="0 0 256 256" />
                                <span style={{ ...mono, fontSize: '9px', color: '#555', marginTop: 3 }}>{sale.code}</span>
                            </>
                        ) : (
                            // Barcode placeholder (browser print — actual barcode printed via ESC/POS)
                            <>
                                <div style={{ display: 'flex', gap: '1px', height: 40, alignItems: 'stretch' }}>
                                    {[3,1,2,1,3,2,1,2,3,1,2,1,3,2,1,3,1,2,1,3].map((w, i) => (
                                        <div key={i} style={{ width: w * 2, background: i % 2 === 0 ? '#222' : '#fff' }} />
                                    ))}
                                </div>
                                <span style={{ ...mono, fontSize: '9px', color: '#555', marginTop: 2 }}>{sale.code}</span>
                            </>
                        )}
                    </div>
                </>
            )}

            <Sep double />

            {/* ── Footer ── */}
            <div style={{ textAlign: 'center', marginTop: '4px', ...mono }}>
                {config.footer_line1 && <div>{config.footer_line1}</div>}
                {config.footer_line2 && <div>{config.footer_line2}</div>}
            </div>
        </div>
    );
};

export default SaleTicket;
