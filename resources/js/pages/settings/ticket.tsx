import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePrinter } from '@/hooks/use-printer';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Printer, Save } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Plantilla del ticket', href: '/settings/ticket' }];

interface TicketConfig {
    // Shared
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

interface Business {
    name: string;
    nit: string | null;
    address: string | null;
    phone: string | null;
    currency_symbol: string;
    logo_url: string | null;
}

interface Props {
    config: TicketConfig;
    business: Business;
}

// ── Sample data ───────────────────────────────────────────────────────────────
const now = new Date();
const SAMPLE_DATE =
    String(now.getDate()).padStart(2, '0') +
    '/' +
    String(now.getMonth() + 1).padStart(2, '0') +
    '/' +
    now.getFullYear() +
    ' ' +
    String(now.getHours()).padStart(2, '0') +
    ':' +
    String(now.getMinutes()).padStart(2, '0');

const SAMPLE_SALE = {
    code: '20260303154938742',
    date: SAMPLE_DATE,
    client: 'Consumidor Final',
    seller: 'Administrador User',
    branch: 'Sucursal Principal',
    products: [
        { name: 'Chocolate Bon Bon', qty: 2, price: 7500, subtotal: 15000 },
        { name: 'Gaseosa 2L', qty: 1, price: 5000, subtotal: 5000 },
        { name: 'Chicle Trident', qty: 3, price: 1500, subtotal: 4500 },
    ],
    net: 24500,
    tax: 1500,
    discount_pct: 10,
    discount_amount: 2600,
    total: 23400,
    payment: 'Efectivo',
    amount_paid: 25000,
    change: 1600,
};

const SAMPLE_RETURN = {
    id: 42,
    sale_code: '20260303154938742',
    date: SAMPLE_DATE,
    client: 'Consumidor Final',
    seller: 'Administrador User',
    branch: 'Sucursal Principal',
    reason: 'Producto en mal estado',
    products: [{ name: 'Chocolate Bon Bon', qty: 1, price: 7500, subtotal: 7500 }],
    net: 7500,
    tax: 0,
    total: 7500,
};

function fmt(n: number) {
    return '$' + n.toLocaleString('es-CO');
}

// ── Shared preview sub-components ─────────────────────────────────────────────
function Sep({ double = false, chars }: { double?: boolean; chars: number }) {
    return (
        <div
            style={{
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: '10px',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                color: '#555',
                margin: '3px 0',
                letterSpacing: '0px',
            }}
        >
            {(double ? '=' : '-').repeat(chars)}
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    const mono: React.CSSProperties = { fontFamily: "'Courier New', Courier, monospace", fontSize: '12px' };
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', ...mono }}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );
}

/** Visual placeholder for QR code or barcode in the preview */
function CodeGraphicPlaceholder({ type }: { type: 'qr' | 'barcode' }) {
    if (type === 'qr') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '6px 0' }}>
                <div
                    style={{
                        width: 72,
                        height: 72,
                        border: '2px solid #333',
                        borderRadius: 2,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: 2,
                        padding: 4,
                        background: '#fff',
                    }}
                >
                    {/* Simplified QR-like pattern */}
                    {[1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0].map((v, i) => (
                        <div key={i} style={{ background: v ? '#222' : '#fff', borderRadius: 1 }} />
                    ))}
                </div>
                <span style={{ fontFamily: 'monospace', fontSize: '9px', color: '#555', marginTop: 2 }}>QR · código de venta</span>
            </div>
        );
    }
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '6px 0' }}>
            <div
                style={{
                    display: 'flex',
                    gap: '1px',
                    height: 40,
                    alignItems: 'stretch',
                    background: '#fff',
                    padding: '0 4px',
                }}
            >
                {[3, 1, 2, 1, 3, 2, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 1, 3].map((w, i) => (
                    <div
                        key={i}
                        style={{
                            width: w * 2,
                            background: i % 2 === 0 ? '#222' : '#fff',
                            border: i % 2 !== 0 ? '0' : undefined,
                        }}
                    />
                ))}
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: '9px', color: '#555', marginTop: 2 }}>CODE128 · código de venta</span>
        </div>
    );
}

// ── Shared header section for both previews ───────────────────────────────────
function PreviewHeader({ config, business, chars }: { config: TicketConfig; business: Business; chars: number }) {
    const mono: React.CSSProperties = { fontFamily: "'Courier New', Courier, monospace", fontSize: '12px' };
    return (
        <div style={{ textAlign: 'center', marginBottom: '2px' }}>
            {config.show_logo && business.logo_url && (
                <img
                    src={business.logo_url}
                    alt="Logo"
                    style={{ maxWidth: config.paper_width === 58 ? '80px' : '110px', height: 'auto', display: 'block', margin: '0 auto 4px' }}
                />
            )}
            <div
                style={{
                    fontWeight: 'bold',
                    fontSize: config.header_size === 'large' ? '22px' : '14px',
                    fontFamily: "'Courier New', Courier, monospace",
                    lineHeight: 1.2,
                    marginBottom: '3px',
                }}
            >
                {business.name}
            </div>
            {config.show_nit && <div style={{ ...mono, color: business.nit ? '#111' : '#aaa' }}>NIT: {business.nit ?? '(no configurado)'}</div>}
            {config.show_address && (
                <div style={{ ...mono, color: business.address ? '#111' : '#aaa' }}>{business.address ?? '(dirección no configurada)'}</div>
            )}
            {config.show_phone && <div style={{ ...mono, color: business.phone ? '#111' : '#aaa' }}>Tel: {business.phone ?? '(no configurado)'}</div>}
        </div>
    );
}

// ── Sale receipt preview ───────────────────────────────────────────────────────
function SaleTicketPreview({ config, business }: { config: TicketConfig; business: Business }) {
    const is58 = config.paper_width === 58;
    const width = is58 ? 260 : 368;
    const chars = is58 ? 32 : 48;
    const mono: React.CSSProperties = { fontFamily: "'Courier New', Courier, monospace", fontSize: '12px' };

    return (
        <div
            style={{
                ...mono,
                lineHeight: '1.6',
                color: '#111',
                backgroundColor: '#fff',
                padding: '16px 14px',
                width: width + 'px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
                borderRadius: '4px',
            }}
        >
            <PreviewHeader config={config} business={business} chars={chars} />
            <Sep double chars={chars} />

            {/* Sale info */}
            {[
                { label: 'Recibo:  ', value: SAMPLE_SALE.code },
                { label: 'Fecha:   ', value: SAMPLE_SALE.date },
                { label: 'Cliente: ', value: SAMPLE_SALE.client },
                ...(config.show_seller ? [{ label: 'Vendedor:', value: ' ' + SAMPLE_SALE.seller }] : []),
                ...(config.show_branch ? [{ label: 'Sucursal:', value: ' ' + SAMPLE_SALE.branch }] : []),
            ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', ...mono }}>
                    <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{label}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                </div>
            ))}

            <Sep chars={chars} />

            {/* Products table */}
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
            {SAMPLE_SALE.products.map((p, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '0 8px', ...mono }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <span style={{ textAlign: 'right' }}>{p.qty}</span>
                    <span style={{ textAlign: 'right' }}>{fmt(p.price)}</span>
                    <span style={{ textAlign: 'right' }}>{fmt(p.subtotal)}</span>
                </div>
            ))}
            <Sep chars={chars} />

            {/* Totals */}
            <Row label="Subtotal:" value={fmt(SAMPLE_SALE.net)} />
            {config.show_tax && <Row label="Impuesto:" value={fmt(SAMPLE_SALE.tax)} />}
            <Row
                label={is58 ? `Descto (${SAMPLE_SALE.discount_pct}%):` : `Descuento (${SAMPLE_SALE.discount_pct}%):`}
                value={`- ${fmt(SAMPLE_SALE.discount_amount)}`}
            />
            <Sep double chars={chars} />
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
                <span>{fmt(SAMPLE_SALE.total)}</span>
            </div>
            <Sep chars={chars} />

            {/* Payment */}
            <Row label="Metodo pago:" value={SAMPLE_SALE.payment} />
            <Row label="Efectivo:" value={fmt(SAMPLE_SALE.amount_paid)} />
            <Row label="Cambio:" value={fmt(SAMPLE_SALE.change)} />

            {/* Code graphic */}
            {config.sale_code_graphic !== 'none' && (
                <>
                    <Sep chars={chars} />
                    <CodeGraphicPlaceholder type={config.sale_code_graphic} />
                </>
            )}

            <Sep double chars={chars} />

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '4px', ...mono }}>
                {config.footer_line1 && <div>{config.footer_line1}</div>}
                {config.footer_line2 && <div>{config.footer_line2}</div>}
            </div>
        </div>
    );
}

// ── Return receipt preview ─────────────────────────────────────────────────────
function ReturnTicketPreview({ config, business }: { config: TicketConfig; business: Business }) {
    const is58 = config.paper_width === 58;
    const width = is58 ? 260 : 368;
    const chars = is58 ? 32 : 48;
    const mono: React.CSSProperties = { fontFamily: "'Courier New', Courier, monospace", fontSize: '12px' };

    return (
        <div
            style={{
                ...mono,
                lineHeight: '1.6',
                color: '#111',
                backgroundColor: '#fff',
                padding: '16px 14px',
                width: width + 'px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
                borderRadius: '4px',
            }}
        >
            <PreviewHeader config={config} business={business} chars={chars} />
            <Sep double chars={chars} />

            {/* Return header */}
            <div style={{ textAlign: 'center', fontWeight: 'bold', ...mono, marginBottom: '2px' }}>RECIBO DE DEVOLUCIÓN</div>
            <Sep chars={chars} />

            {/* Return info */}
            {[
                { label: 'Devol.:  ', value: String(SAMPLE_RETURN.id) },
                { label: 'Venta:   ', value: SAMPLE_RETURN.sale_code },
                { label: 'Fecha:   ', value: SAMPLE_RETURN.date },
                { label: 'Cliente: ', value: SAMPLE_RETURN.client },
                ...(config.return_show_seller ? [{ label: 'Vendedor:', value: ' ' + SAMPLE_RETURN.seller }] : []),
                ...(config.return_show_branch ? [{ label: 'Sucursal:', value: ' ' + SAMPLE_RETURN.branch }] : []),
                ...(config.return_show_reason ? [{ label: 'Motivo:  ', value: SAMPLE_RETURN.reason }] : []),
            ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', ...mono }}>
                    <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{label}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                </div>
            ))}

            <Sep chars={chars} />

            {/* Products table */}
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
            {SAMPLE_RETURN.products.map((p, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '0 8px', ...mono }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <span style={{ textAlign: 'right' }}>1</span>
                    <span style={{ textAlign: 'right' }}>{fmt(p.price)}</span>
                    <span style={{ textAlign: 'right' }}>{fmt(p.subtotal)}</span>
                </div>
            ))}
            <Sep chars={chars} />

            {/* Totals */}
            <Row label="Subtotal:" value={fmt(SAMPLE_RETURN.net)} />
            <Sep double chars={chars} />
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
                <span>{fmt(SAMPLE_RETURN.total)}</span>
            </div>
            <Sep double chars={chars} />

            {/* Code graphic */}
            {config.return_code_graphic !== 'none' && (
                <>
                    <Sep chars={chars} />
                    <CodeGraphicPlaceholder type={config.return_code_graphic} />
                </>
            )}

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '4px', ...mono }}>
                {config.return_footer_line1 && <div>{config.return_footer_line1}</div>}
                {config.return_footer_line2 && <div>{config.return_footer_line2}</div>}
            </div>
        </div>
    );
}

// ── Code graphic selector ──────────────────────────────────────────────────────
function CodeGraphicSelector({ value, onChange }: { value: 'none' | 'qr' | 'barcode'; onChange: (v: 'none' | 'qr' | 'barcode') => void }) {
    const options = [
        { value: 'none' as const, label: 'Ninguno' },
        { value: 'qr' as const, label: 'Código QR' },
        { value: 'barcode' as const, label: 'Código de barras' },
    ];
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((o) => (
                <Button key={o.value} type="button" size="sm" variant={value === o.value ? 'default' : 'outline'} onClick={() => onChange(o.value)}>
                    {o.label}
                </Button>
            ))}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TicketSettings({ config, business }: Props) {
    const printer = usePrinter();
    const [printing, setPrinting] = useState(false);
    const [activeTab, setActiveTab] = useState<'sale' | 'return'>('sale');

    // @ts-expect-error — TicketConfig values are all primitives; Inertia's FormDataType requires an index signature
    const { data, setData, post, processing } = useForm<TicketConfig>(config);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('settings.ticket.update'), {
            onSuccess: () => toast.success('Plantilla guardada.'),
            onError: () => toast.error('Error al guardar.'),
        });
    };

    const handleTestPrint = async () => {
        if (printer.status !== 'connected' || !printer.selectedPrinter) {
            toast.error('Conecta QZ Tray y selecciona una impresora en Configuración → Impresora.');
            return;
        }
        setPrinting(true);
        try {
            // POST all current form values so the server uses them instead of DB.
            // This lets the user preview unsaved changes before clicking "Guardar".
            const xsrfToken = decodeURIComponent(
                document.cookie
                    .split('; ')
                    .find((c) => c.startsWith('XSRF-TOKEN='))
                    ?.split('=')
                    .slice(1)
                    .join('=') ?? '',
            );
            const res = await fetch('/print/test-template', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': xsrfToken,
                },
                body: JSON.stringify({ ...data, template_type: activeTab === 'return' ? 'return' : 'sale' }),
            });
            if (!res.ok) throw new Error('Error al generar recibo de prueba');
            const { data: b64 } = (await res.json()) as { data: string };
            const { printBase64 } = await import('@/services/qzTray');
            await printBase64(printer.selectedPrinter, b64);
            toast.success('Recibo de prueba enviado a la impresora.');
        } catch (err) {
            toast.error('Error: ' + (err instanceof Error ? err.message : 'desconocido'));
        } finally {
            setPrinting(false);
        }
    };

    const toggle = (key: keyof TicketConfig) => () => setData(key, !data[key] as never);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Plantilla del ticket" />
            <SettingsLayout>
                <HeadingSmall title="Plantilla del ticket" description="Personaliza el diseño del recibo térmico de venta y devolución" />

                <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
                    {/* ── Left: config panel ── */}
                    <form onSubmit={handleSave} className="space-y-4">
                        {/* ── Shared: Paper width ── */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Ancho de papel</CardTitle>
                            </CardHeader>
                            <CardContent className="flex gap-2">
                                {([58, 80] as const).map((w) => (
                                    <Button
                                        key={w}
                                        type="button"
                                        size="sm"
                                        variant={data.paper_width === w ? 'default' : 'outline'}
                                        onClick={() => setData('paper_width', w)}
                                    >
                                        {w} mm
                                    </Button>
                                ))}
                            </CardContent>
                        </Card>

                        {/* ── Shared: Header ── */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Encabezado</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex gap-2">
                                    {(['normal', 'large'] as const).map((s) => (
                                        <Button
                                            key={s}
                                            type="button"
                                            size="sm"
                                            variant={data.header_size === s ? 'default' : 'outline'}
                                            onClick={() => setData('header_size', s)}
                                        >
                                            {s === 'large' ? 'Título grande (2×)' : 'Título normal'}
                                        </Button>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Datos del negocio en{' '}
                                    <a href="/settings/business" className="underline">
                                        Configuración → Negocio
                                    </a>
                                    .
                                </p>
                                {[
                                    { key: 'show_logo', label: 'Mostrar logo' },
                                    { key: 'show_nit', label: 'Mostrar NIT' },
                                    { key: 'show_address', label: 'Mostrar dirección' },
                                    { key: 'show_phone', label: 'Mostrar teléfono' },
                                ].map(({ key, label }) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <Label htmlFor={key} className="text-sm">
                                            {label}
                                        </Label>
                                        <Switch
                                            id={key}
                                            checked={data[key as keyof TicketConfig] as boolean}
                                            onCheckedChange={toggle(key as keyof TicketConfig)}
                                        />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* ── Tabs: Sale / Return ── */}
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'sale' | 'return')}>
                            <TabsList className="w-full">
                                <TabsTrigger value="sale" className="flex-1">
                                    Ticket de venta
                                </TabsTrigger>
                                <TabsTrigger value="return" className="flex-1">
                                    Ticket de devolución
                                </TabsTrigger>
                            </TabsList>

                            {/* ── Sale tab ── */}
                            <TabsContent value="sale" className="mt-4 space-y-4">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Cuerpo</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {[
                                            { key: 'show_seller', label: 'Mostrar vendedor' },
                                            { key: 'show_branch', label: 'Mostrar sucursal' },
                                            { key: 'show_tax', label: 'Mostrar impuesto' },
                                        ].map(({ key, label }) => (
                                            <div key={key} className="flex items-center justify-between">
                                                <Label htmlFor={`sale_${key}`} className="text-sm">
                                                    {label}
                                                </Label>
                                                <Switch
                                                    id={`sale_${key}`}
                                                    checked={data[key as keyof TicketConfig] as boolean}
                                                    onCheckedChange={toggle(key as keyof TicketConfig)}
                                                />
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Código visual</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <p className="text-xs text-muted-foreground">
                                            Imprime un QR o código de barras con el número de venta para buscarlo rápidamente.
                                        </p>
                                        <CodeGraphicSelector value={data.sale_code_graphic} onChange={(v) => setData('sale_code_graphic', v)} />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Mensaje de pie</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Línea 1</Label>
                                            <Input
                                                value={data.footer_line1}
                                                maxLength={60}
                                                onChange={(e) => setData('footer_line1', e.target.value)}
                                                placeholder="¡Gracias por su compra!"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Línea 2</Label>
                                            <Input
                                                value={data.footer_line2}
                                                maxLength={60}
                                                onChange={(e) => setData('footer_line2', e.target.value)}
                                                placeholder="Vuelva pronto"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* ── Return tab ── */}
                            <TabsContent value="return" className="mt-4 space-y-4">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Cuerpo</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {[
                                            { key: 'return_show_seller', label: 'Mostrar vendedor' },
                                            { key: 'return_show_branch', label: 'Mostrar sucursal' },
                                            { key: 'return_show_reason', label: 'Mostrar motivo de devolución' },
                                        ].map(({ key, label }) => (
                                            <div key={key} className="flex items-center justify-between">
                                                <Label htmlFor={key} className="text-sm">
                                                    {label}
                                                </Label>
                                                <Switch
                                                    id={key}
                                                    checked={data[key as keyof TicketConfig] as boolean}
                                                    onCheckedChange={toggle(key as keyof TicketConfig)}
                                                />
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Código visual</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <p className="text-xs text-muted-foreground">Imprime un QR o código de barras con el número de devolución.</p>
                                        <CodeGraphicSelector value={data.return_code_graphic} onChange={(v) => setData('return_code_graphic', v)} />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Mensaje de pie</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Línea 1</Label>
                                            <Input
                                                value={data.return_footer_line1}
                                                maxLength={60}
                                                onChange={(e) => setData('return_footer_line1', e.target.value)}
                                                placeholder="Devolución procesada."
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Línea 2</Label>
                                            <Input
                                                value={data.return_footer_line2}
                                                maxLength={60}
                                                onChange={(e) => setData('return_footer_line2', e.target.value)}
                                                placeholder="Gracias por su preferencia."
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>

                        {/* ── Actions ── */}
                        <div className="flex gap-2">
                            <Button type="submit" disabled={processing} className="flex-1 gap-2">
                                <Save className="size-4" />
                                {processing ? 'Guardando…' : 'Guardar'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={printing || printer.status !== 'connected'}
                                onClick={handleTestPrint}
                                className="gap-2"
                                title={printer.status !== 'connected' ? 'QZ Tray no conectado' : undefined}
                            >
                                <Printer className="size-4" />
                                {printing ? 'Imprimiendo…' : 'Prueba'}
                            </Button>
                        </div>
                        {printer.status !== 'connected' && (
                            <p className="text-xs text-muted-foreground">
                                Para imprimir, activa QZ Tray en{' '}
                                <a href="/settings/printer" className="underline">
                                    Configuración → Impresora
                                </a>
                                .
                            </p>
                        )}
                    </form>

                    {/* ── Right: live preview ── */}
                    <div className="flex flex-col items-center gap-3">
                        <p className="text-center text-sm text-muted-foreground">
                            Vista previa ·{' '}
                            <span className="font-medium text-foreground">{activeTab === 'sale' ? 'Ticket de venta' : 'Ticket de devolución'}</span>
                            <span className="text-xs"> · datos de muestra</span>
                        </p>
                        <div className="overflow-x-auto rounded-lg bg-muted/40 p-6">
                            {activeTab === 'sale' ? (
                                <SaleTicketPreview config={data} business={business} />
                            ) : (
                                <ReturnTicketPreview config={data} business={business} />
                            )}
                        </div>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
