import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
    String(now.getDate()).padStart(2, '0') + '/' +
    String(now.getMonth() + 1).padStart(2, '0') + '/' +
    now.getFullYear() + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0');

const SAMPLE = {
    code: '20260303154938742',
    date: SAMPLE_DATE,
    client: 'Consumidor Final',
    seller: 'Administrador User',
    branch: 'Sucursal Principal',
    products: [
        { name: 'Chocolate Bon Bon', qty: 2, price: 7500, subtotal: 15000 },
        { name: 'Gaseosa 2L',        qty: 1, price: 5000, subtotal: 5000  },
        { name: 'Chicle Trident',    qty: 3, price: 1500, subtotal: 4500  },
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

function fmt(n: number) {
    return '$' + n.toLocaleString('es-CO');
}

// ── Receipt preview — visually matches physical print ─────────────────────────
function TicketPreview({ config, business }: { config: TicketConfig; business: Business }) {
    const is58   = config.paper_width === 58;
    const width  = is58 ? 260 : 368;
    const chars  = is58 ? 32  : 48;

    const mono: React.CSSProperties = {
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: '12px',
    };

    /** Character-based separator — matches what the printer outputs */
    const Sep = ({ double = false }: { double?: boolean }) => (
        <div style={{ ...mono, fontSize: '10px', overflow: 'hidden', whiteSpace: 'nowrap',
            color: '#555', margin: '3px 0', letterSpacing: '0px' }}>
            {(double ? '=' : '-').repeat(chars)}
        </div>
    );

    /** Label-right / value-right row used for totals & payment */
    const Row = ({ label, value }: { label: string; value: string }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', ...mono }}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );

    return (
        <div style={{
            ...mono,
            lineHeight: '1.6',
            color: '#111',
            backgroundColor: '#fff',
            padding: '16px 14px',
            width: width + 'px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            borderRadius: '4px',
        }}>
            {/* ── Header ── */}
            <div style={{ textAlign: 'center', marginBottom: '2px' }}>
                {config.show_logo && business.logo_url && (
                    <img
                        src={business.logo_url}
                        alt="Logo"
                        style={{ maxWidth: is58 ? '80px' : '110px', height: 'auto',
                            display: 'block', margin: '0 auto 4px' }}
                    />
                )}
                <div style={{
                    fontWeight: 'bold',
                    fontSize: config.header_size === 'large' ? '22px' : '14px',
                    lineHeight: 1.2,
                    marginBottom: '3px',
                }}>
                    {business.name}
                </div>
                {config.show_nit && (
                    <div style={{ ...mono, color: business.nit ? '#111' : '#aaa' }}>
                        NIT: {business.nit ?? '(no configurado)'}
                    </div>
                )}
                {config.show_address && (
                    <div style={{ ...mono, color: business.address ? '#111' : '#aaa' }}>
                        {business.address ?? '(dirección no configurada)'}
                    </div>
                )}
                {config.show_phone && (
                    <div style={{ ...mono, color: business.phone ? '#111' : '#aaa' }}>
                        Tel: {business.phone ?? '(no configurado)'}
                    </div>
                )}
            </div>

            <Sep double />

            {/* ── Sale info ── */}
            {[
                { label: 'Recibo:  ', value: SAMPLE.code },
                { label: 'Fecha:   ', value: SAMPLE.date },
                { label: 'Cliente: ', value: SAMPLE.client },
                ...(config.show_seller ? [{ label: 'Vendedor:', value: ' ' + SAMPLE.seller }] : []),
                ...(config.show_branch ? [{ label: 'Sucursal:', value: ' ' + SAMPLE.branch }] : []),
            ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', ...mono }}>
                    <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{label}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                </div>
            ))}

            <Sep />

            {/* ── Products table ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto',
                gap: '0 8px', fontWeight: 'bold', ...mono,
                borderBottom: '1px dashed #999', paddingBottom: '3px', marginBottom: '3px' }}>
                <span>Producto</span>
                <span style={{ textAlign: 'right' }}>Cant</span>
                <span style={{ textAlign: 'right' }}>Precio</span>
                <span style={{ textAlign: 'right' }}>Total</span>
            </div>

            {SAMPLE.products.map((p, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto',
                    gap: '0 8px', ...mono }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                    </span>
                    <span style={{ textAlign: 'right' }}>{p.qty}</span>
                    <span style={{ textAlign: 'right' }}>{fmt(p.price)}</span>
                    <span style={{ textAlign: 'right' }}>{fmt(p.subtotal)}</span>
                </div>
            ))}

            <Sep />

            {/* ── Totals ── */}
            <Row label="Subtotal:" value={fmt(SAMPLE.net)} />
            {config.show_tax && <Row label="Impuesto:" value={fmt(SAMPLE.tax)} />}
            <Row label={is58 ? `Descto (${SAMPLE.discount_pct}%):` : `Descuento (${SAMPLE.discount_pct})%:`}
                 value={`- ${fmt(SAMPLE.discount_amount)}`} />

            <Sep double />

            {/* ── TOTAL (double height in real print) ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between',
                fontWeight: 'bold', fontSize: '20px', lineHeight: 1.3,
                fontFamily: "'Courier New', Courier, monospace", margin: '2px 0' }}>
                <span>TOTAL:</span>
                <span>{fmt(SAMPLE.total)}</span>
            </div>

            <Sep />

            {/* ── Payment ── */}
            <Row label="Metodo pago:" value={SAMPLE.payment} />
            <Row label="Efectivo:" value={fmt(SAMPLE.amount_paid)} />
            <Row label="Cambio:" value={fmt(SAMPLE.change)} />

            <Sep double />

            {/* ── Footer ── */}
            <div style={{ textAlign: 'center', marginTop: '4px', ...mono }}>
                {config.footer_line1 && <div>{config.footer_line1}</div>}
                {config.footer_line2 && <div>{config.footer_line2}</div>}
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TicketSettings({ config, business }: Props) {
    const printer = usePrinter();
    const [printing, setPrinting] = useState(false);

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
            const res = await fetch(`/print/test-template?width=${data.paper_width}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
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

    const toggle = (key: keyof TicketConfig) => () =>
        setData(key, !data[key] as never);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Plantilla del ticket" />
            <SettingsLayout>
                <HeadingSmall
                    title="Plantilla del ticket"
                    description="Personaliza el diseño del recibo térmico"
                />

                <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
                    {/* ── Left: config panel ── */}
                    <form onSubmit={handleSave} className="space-y-4">
                        {/* Paper width */}
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

                        {/* Header size */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Tamaño del título</CardTitle>
                            </CardHeader>
                            <CardContent className="flex gap-2">
                                {(['normal', 'large'] as const).map((s) => (
                                    <Button
                                        key={s}
                                        type="button"
                                        size="sm"
                                        variant={data.header_size === s ? 'default' : 'outline'}
                                        onClick={() => setData('header_size', s)}
                                    >
                                        {s === 'large' ? 'Grande (2×)' : 'Normal'}
                                    </Button>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Show/hide fields */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Encabezado</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-xs text-muted-foreground">
                                    Estos datos vienen de{' '}
                                    <a href="/settings/business" className="underline">Configuración → Negocio</a>.
                                    Si un campo está vacío aparecerá en gris en la vista previa y{' '}
                                    <strong>no se imprimirá</strong> en el ticket.
                                </p>
                                {[
                                    { key: 'show_logo',    label: 'Mostrar logo' },
                                    { key: 'show_nit',     label: 'Mostrar NIT' },
                                    { key: 'show_address', label: 'Mostrar dirección' },
                                    { key: 'show_phone',   label: 'Mostrar teléfono' },
                                ].map(({ key, label }) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <Label htmlFor={key} className="text-sm">{label}</Label>
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
                                <CardTitle className="text-sm">Cuerpo</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {[
                                    { key: 'show_seller', label: 'Mostrar vendedor' },
                                    { key: 'show_branch', label: 'Mostrar sucursal' },
                                    { key: 'show_tax',    label: 'Mostrar impuesto' },
                                ].map(({ key, label }) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <Label htmlFor={key} className="text-sm">{label}</Label>
                                        <Switch
                                            id={key}
                                            checked={data[key as keyof TicketConfig] as boolean}
                                            onCheckedChange={toggle(key as keyof TicketConfig)}
                                        />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Footer text */}
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

                        {/* Actions */}
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
                                className="flex-1 gap-2"
                                title={printer.status !== 'connected' ? 'QZ Tray no conectado' : undefined}
                            >
                                <Printer className="size-4" />
                                {printing ? 'Imprimiendo…' : 'Imprimir prueba'}
                            </Button>
                        </div>
                        {printer.status !== 'connected' && (
                            <p className="text-xs text-muted-foreground">
                                Para imprimir, activa QZ Tray en{' '}
                                <a href="/settings/printer" className="underline">Configuración → Impresora</a>.
                            </p>
                        )}
                    </form>

                    {/* ── Right: live preview ── */}
                    <div className="flex flex-col items-center gap-3">
                        <p className="text-sm text-muted-foreground">Vista previa (datos de muestra)</p>
                        <div className="overflow-x-auto rounded-lg bg-muted/40 p-6">
                            <TicketPreview config={data} business={business} />
                        </div>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
