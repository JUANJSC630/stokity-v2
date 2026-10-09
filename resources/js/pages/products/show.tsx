import { StatusPill, TypePill, isLowStock } from '@/components/products/product-meta';
import { Section } from '@/components/sales/form-fields';
import { GrowBar } from '@/components/ui/bencho/grow-bar';
import { RollingNumber } from '@/components/ui/bencho/rolling-number';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { usePrinter } from '@/hooks/use-printer';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type Product } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowLeftRight, Download, MinusCircle, Package, PackagePlus, Pencil, Printer } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';

interface ProductShowProps {
    product: Product;
}

const formatPesos = (value: number): string => formatCurrency(value);

const ACTION =
    'flex h-11 items-center justify-center gap-2 rounded-xl border border-border/60 bg-card px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60 sm:h-10';

function Fact({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-right text-sm font-medium">{children}</dd>
        </div>
    );
}

export default function ProductShow({ product }: ProductShowProps) {
    const isService = product.type === 'servicio';
    const onBrand = useOnBrandColor();
    const printer = usePrinter();
    const [printingLabel, setPrintingLabel] = useState(false);

    const handlePrintLabel = async () => {
        if (printingLabel) return;
        if (printer.status !== 'connected' || !printer.selectedPrinter) {
            toast.error('QZ Tray no conectado. Configura la impresora en el POS.');
            return;
        }
        setPrintingLabel(true);
        try {
            const { printedCount } = await printer.printLabels([product.id]);
            if (printedCount > 0) {
                toast.success('Etiqueta enviada a la impresora');
            } else {
                toast.error('No se pudo imprimir la etiqueta: producto no disponible.');
            }
        } catch (err) {
            toast.error('Error al imprimir: ' + (err as Error).message);
        } finally {
            setPrintingLabel(false);
        }
    };

    const downloadQr = () => {
        const svg = document.getElementById('product-qr') as SVGSVGElement | null;
        if (!svg) return;
        const serialized = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const img = new Image();
        img.onload = () => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);
            ctx.drawImage(img, 0, 0, size, size);
            const a = document.createElement('a');
            a.download = `qr-${product.code}.png`;
            a.href = canvas.toDataURL('image/png');
            a.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(serialized)));
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inicio', href: '/dashboard' },
        { title: 'Catálogo', href: '/products' },
        { title: product.name, href: `/products/${product.id}` },
    ];

    const low = isLowStock(product);
    const stockPercent = Math.min(100, Math.round((product.stock / Math.max(product.min_stock * 3, product.stock, 1)) * 100));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${isService ? 'Servicio' : 'Producto'}: ${product.name}`} />

            <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex items-start gap-3">
                    <Link
                        href="/products"
                        aria-label="Volver"
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                    </Link>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            Detalles del {isService ? 'servicio' : 'producto'}
                        </p>
                        <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{product.name}</h1>
                    </div>
                </div>

                <section className="grid gap-5 rounded-2xl border border-border/60 bg-card p-4 sm:p-5 md:grid-cols-[minmax(0,18rem)_1fr] md:gap-6">
                    <div className="aspect-[16/10] w-full overflow-hidden rounded-xl border border-border/60 bg-muted md:aspect-square">
                        {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="size-full object-cover" />
                        ) : (
                            <div className="flex size-full items-center justify-center text-muted-foreground">
                                <Package className="size-10" aria-hidden="true" />
                            </div>
                        )}
                    </div>

                    <div className="flex min-w-0 flex-col gap-5">
                        <div className="flex flex-wrap items-center gap-2">
                            <TypePill type={product.type} />
                            <StatusPill active={product.status} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    {isService ? 'Precio base' : 'Precio de venta'}
                                </p>
                                <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
                                    {isService && product.variable_price ? (
                                        <span className="text-2xl font-semibold text-violet-600 dark:text-violet-300">Variable</span>
                                    ) : (
                                        <RollingNumber value={Number(product.sale_price)} format={formatPesos} intro />
                                    )}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    {isService ? 'Costo del servicio' : 'Precio de compra'}
                                </p>
                                <p className="mt-1 text-xl font-semibold text-muted-foreground tabular-nums sm:text-2xl">
                                    {formatCurrency(Number(product.purchase_price))}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                            <Link
                                href={`/products/${product.id}/edit`}
                                className="col-span-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 sm:col-span-1 sm:h-10"
                                style={{ color: onBrand.hex }}
                            >
                                <Pencil className="size-4" aria-hidden="true" />
                                Editar
                            </Link>
                            <button
                                type="button"
                                className={ACTION}
                                onClick={handlePrintLabel}
                                disabled={printingLabel}
                                aria-label={printingLabel ? 'Imprimiendo etiqueta' : 'Imprimir etiqueta'}
                            >
                                <Printer className="size-4" aria-hidden="true" />
                                {printingLabel ? 'Imprimiendo...' : 'Imprimir etiqueta'}
                            </button>
                            {!isService && (
                                <>
                                    <Link href={`/products/${product.id}/movements`} className={ACTION}>
                                        <ArrowLeftRight className="size-4" aria-hidden="true" />
                                        Movimientos
                                    </Link>
                                    <Link href={`/stock-movements/create?product_id=${product.id}`} className={ACTION}>
                                        <PackagePlus className="size-4" aria-hidden="true" />
                                        Nuevo movimiento
                                    </Link>
                                    <Link
                                        href={`/stock-movements/create?product_id=${product.id}&type=write_off`}
                                        className={cn(ACTION, 'text-orange-600 dark:text-orange-400')}
                                    >
                                        <MinusCircle className="size-4" aria-hidden="true" />
                                        Registrar baja
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                <div className="grid gap-5 lg:grid-cols-3">
                    <div className="flex flex-col gap-5 lg:col-span-2">
                        {!isService && (
                            <Section title="Inventario">
                                <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Stock actual</p>
                                        <div className="mt-1 flex items-center gap-2">
                                            <span className="text-3xl font-bold tabular-nums">{product.stock}</span>
                                            {low && (
                                                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                                                    Bajo
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Stock mínimo</p>
                                        <p className="mt-1 text-3xl font-bold text-muted-foreground tabular-nums">{product.min_stock}</p>
                                    </div>
                                    <div
                                        role="img"
                                        aria-label={`Stock de ${product.stock} unidades, mínimo ${product.min_stock}`}
                                        className="h-2 overflow-hidden rounded-full bg-muted sm:col-span-2"
                                    >
                                        <GrowBar percent={stockPercent} className={low ? 'bg-red-500' : 'bg-emerald-500'} />
                                    </div>
                                </div>
                            </Section>
                        )}

                        <Section title="Descripción">
                            <p className="px-5 pb-5 text-sm whitespace-pre-wrap">{product.description || 'Sin descripción'}</p>
                        </Section>
                    </div>

                    <div className="flex flex-col gap-5">
                        <Section title="Datos">
                            <dl className="divide-y divide-border/50 px-5 pb-2">
                                <Fact label="Impuesto">{product.tax || 0}%</Fact>
                                <Fact label="Categoría">{product.category?.name}</Fact>
                                <Fact label="Sucursal">{product.branch?.name}</Fact>
                                <Fact label="Creado">{formatDate(product.created_at)}</Fact>
                                <Fact label="Actualizado">{formatDate(product.updated_at)}</Fact>
                            </dl>
                        </Section>

                        <Section title="Código">
                            <div className="flex items-center gap-4 px-5 pb-5">
                                <div className="shrink-0 rounded-xl bg-white p-2.5">
                                    <QRCode
                                        id="product-qr"
                                        value={product.code}
                                        size={96}
                                        style={{ height: 'auto', maxWidth: 96, width: '100%' }}
                                        viewBox="0 0 256 256"
                                    />
                                </div>
                                <div className="flex min-w-0 flex-col items-start gap-1">
                                    <span className="font-mono text-sm font-semibold break-all">{product.code}</span>
                                    <p className="text-xs text-muted-foreground">Escanea para agregar al POS</p>
                                    <button
                                        type="button"
                                        onClick={downloadQr}
                                        className="-ml-3 flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-[var(--brand-primary)] hover:bg-muted sm:h-9"
                                    >
                                        <Download className="size-4" aria-hidden="true" />
                                        Descargar PNG
                                    </button>
                                </div>
                            </div>
                        </Section>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
