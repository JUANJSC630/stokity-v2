import { SettingsSection } from '@/components/settings/settings-section';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { usePrinter } from '@/hooks/use-printer';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { CheckCircle, Download, ExternalLink, PowerOff, Printer, Wifi, WifiOff } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Configuración de impresora',
        href: '/settings/printer',
    },
];

const steps = [
    {
        number: 1,
        title: 'Descargar e instalar QZ Tray',
        description: (
            <span>
                QZ Tray es un programa gratuito que permite imprimir desde el navegador a impresoras locales (USB, Bluetooth, red). Descárgalo desde{' '}
                <a
                    href="https://qz.io/download"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline"
                >
                    qz.io/download <ExternalLink className="size-3" />
                </a>{' '}
                e instálalo. Al abrirlo aparecerá un ícono en la barra de tareas.
            </span>
        ),
    },
    {
        number: 2,
        title: 'Descargar el certificado de Stokity',
        description: (
            <span>
                Haz clic en el botón <strong>"Descargar certificado"</strong> que aparece abajo. Guarda el archivo{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">stokity-qztray.pem</code> en un lugar fácil de encontrar (por ejemplo, el
                Escritorio).
            </span>
        ),
    },
    {
        number: 3,
        title: 'Abrir QZ Tray Site Manager',
        description: (
            <span>
                Haz clic derecho en el ícono de QZ Tray en la barra de tareas y selecciona <strong>"Site Manager"</strong>. Se abrirá una ventana con
                pestañas.
            </span>
        ),
    },
    {
        number: 4,
        title: 'Agregar el certificado',
        description: (
            <span>
                En Site Manager, ve a la pestaña <strong>"Allowed"</strong>. Haz clic en el botón <strong>"+"</strong> (esquina inferior izquierda).
                Busca y selecciona el archivo <code className="rounded bg-muted px-1 py-0.5 text-xs">stokity-qztray.pem</code> que descargaste. Verás
                que aparece <strong>"Stokity POS — Verified by QZ Industries, LLC"</strong>.
            </span>
        ),
    },
    {
        number: 5,
        title: '¡Listo! Conecta y selecciona tu impresora',
        description: (
            <span>
                Regresa a Stokity. En el POS o en esta página verás el estado de la impresora. Selecciona tu impresora de la lista y configura el
                ancho de papel (58 mm o 80 mm). A partir de ahora, cada venta se imprimirá automáticamente.
            </span>
        ),
    },
];

export default function PrinterSettings() {
    const printer = usePrinter();
    const [testing, setTesting] = useState(false);

    const handleTestPrint = async () => {
        setTesting(true);
        try {
            await printer.printTest();
            toast.success('Trabajo enviado al spooler. Si la impresora está encendida, debería imprimir en segundos.');
        } catch (err) {
            toast.error('Error: ' + (err instanceof Error ? err.message : 'Error desconocido'));
        } finally {
            setTesting(false);
        }
    };

    const statusBadge = () => {
        switch (printer.status) {
            case 'connected':
                return (
                    <Badge className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                        <Wifi className="size-3" /> QZ Tray activo
                    </Badge>
                );
            case 'connecting':
                return (
                    <Badge variant="outline" className="gap-1">
                        Buscando QZ Tray…
                    </Badge>
                );
            case 'unavailable':
                return (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <WifiOff className="size-3" /> QZ Tray no encontrado
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <WifiOff className="size-3" /> QZ Tray inactivo
                    </Badge>
                );
        }
    };

    const chip = (selected: boolean) =>
        cn(
            'flex h-11 items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors sm:h-9',
            selected
                ? 'border-[var(--brand-primary)]/40 bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]'
                : 'border-border/60 bg-card text-muted-foreground hover:bg-muted',
        );
    const actionButton =
        'flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-card px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50 sm:h-9';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Configuración de impresora" />

            <SettingsLayout>
                <SettingsSection title="Impresora térmica" description="Configura la impresión ESC/POS para tu impresora local">
                    <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-medium">Estado de QZ Tray</p>
                                <p className="text-sm text-muted-foreground">Agente QZ Tray</p>
                                <p className="text-xs text-muted-foreground/70">
                                    Solo indica si el programa está corriendo en este equipo, no el estado de la impresora.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {statusBadge()}
                                {printer.status === 'connected' && (
                                    <button
                                        type="button"
                                        className={cn(actionButton, 'text-destructive hover:bg-destructive/10 hover:text-destructive')}
                                        onClick={async () => {
                                            await printer.disconnect();
                                            toast.success('Desconectado de QZ Tray.');
                                        }}
                                    >
                                        <PowerOff className="size-3.5" aria-hidden="true" />
                                        Desconectar
                                    </button>
                                )}
                                {(printer.status === 'idle' || printer.status === 'unavailable') && (
                                    <button
                                        type="button"
                                        className={actionButton}
                                        onClick={async () => {
                                            await printer.connect();
                                        }}
                                    >
                                        <Wifi className="size-3.5" aria-hidden="true" />
                                        Conectar
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 p-4">
                            <label htmlFor="auto-print" className="min-w-0 flex-1 cursor-pointer">
                                <p className="text-sm font-medium">Impresión automática</p>
                                <p className="text-xs text-muted-foreground">
                                    Al desactivar, las ventas no se envían a la impresora. Úsalo cuando la impresora esté desconectada para evitar que
                                    los trabajos se encolen.
                                </p>
                            </label>
                            <Switch
                                id="auto-print"
                                checked={printer.autoPrint}
                                onCheckedChange={() => {
                                    printer.setAutoPrint(!printer.autoPrint);
                                    toast.success(printer.autoPrint ? 'Impresión automática desactivada.' : 'Impresión automática activada.');
                                }}
                            />
                        </div>

                        {printer.status === 'connected' && (
                            <>
                                <Alert>
                                    <AlertDescription className="text-xs text-muted-foreground">
                                        QZ Tray está activo. La lista de impresoras proviene del sistema operativo — incluye impresoras apagadas o
                                        desconectadas. Asegúrate de que la impresora esté
                                        <strong> encendida y conectada</strong> antes de imprimir.
                                    </AlertDescription>
                                </Alert>
                                <dl className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <dt className="text-sm text-muted-foreground">Impresora seleccionada</dt>
                                        <dd className="text-sm font-medium">
                                            {printer.selectedPrinter ?? <span className="text-muted-foreground italic">Ninguna</span>}
                                        </dd>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <dt className="text-sm text-muted-foreground">Ancho de papel</dt>
                                        <dd className="text-sm font-medium">
                                            <span>{printer.paperWidth} mm</span>
                                        </dd>
                                    </div>
                                </dl>

                                {printer.printers.length > 0 && (
                                    <>
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium">Impresoras disponibles</p>
                                            <div className="flex flex-wrap gap-2">
                                                {printer.printers.map((name) => (
                                                    <button
                                                        key={name}
                                                        type="button"
                                                        aria-pressed={printer.selectedPrinter === name}
                                                        className={chip(printer.selectedPrinter === name)}
                                                        onClick={() => printer.setSelectedPrinter(name)}
                                                    >
                                                        <Printer className="size-3.5" aria-hidden="true" />
                                                        {name}
                                                        {printer.selectedPrinter === name && <CheckCircle className="size-3.5" aria-hidden="true" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {([58, 80] as const).map((width) => (
                                                <button
                                                    key={width}
                                                    type="button"
                                                    aria-pressed={printer.paperWidth === width}
                                                    className={chip(printer.paperWidth === width)}
                                                    onClick={() => printer.setPaperWidth(width)}
                                                >
                                                    {width} mm
                                                </button>
                                            ))}
                                            <button
                                                type="button"
                                                className={cn(actionButton, 'sm:ml-auto')}
                                                onClick={handleTestPrint}
                                                disabled={testing || !printer.selectedPrinter}
                                            >
                                                <Printer className="size-3.5" aria-hidden="true" />
                                                {testing ? 'Imprimiendo…' : 'Probar impresora'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        {printer.status === 'unavailable' && (
                            <Alert>
                                <AlertDescription className="text-sm">
                                    QZ Tray no está ejecutándose en este equipo. Instálalo y ábrelo para habilitar la impresión térmica. Sigue la guía
                                    de configuración a continuación.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </SettingsSection>

                <SettingsSection title="Certificado de seguridad">
                    <div className="flex flex-col gap-3">
                        <p className="text-sm text-muted-foreground">
                            QZ Tray requiere un certificado para autorizar a Stokity a enviar trabajos de impresión. Descarga este archivo y agrégalo
                            una sola vez en el Site Manager de QZ Tray (ver guía abajo).
                        </p>
                        <a href="/qz/certificate/download" download="stokity-qztray.pem" className={cn(actionButton, 'w-full sm:w-fit')}>
                            <Download className="size-4" aria-hidden="true" />
                            Descargar certificado (.pem)
                        </a>
                        <p className="text-xs text-muted-foreground">
                            Este archivo es el mismo para todos los equipos. Solo necesitas descargarlo una vez por computadora.
                        </p>
                    </div>
                </SettingsSection>

                <SettingsSection title="Guía de configuración">
                    <ol className="flex flex-col gap-5">
                        {steps.map((step) => {
                            // Auto-detect completion for steps 1 and 5
                            const isComplete =
                                (step.number === 1 && printer.status === 'connected') ||
                                (step.number === 5 && printer.status === 'connected' && !!printer.selectedPrinter);
                            return (
                                <li key={step.number} className="flex gap-4">
                                    <div
                                        className={cn(
                                            'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                                            isComplete ? 'bg-green-500 text-white' : 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]',
                                        )}
                                    >
                                        {isComplete ? <CheckCircle className="size-4" aria-hidden="true" /> : step.number}
                                    </div>
                                    <div className="min-w-0 space-y-1 pt-0.5">
                                        <p className={cn('text-sm font-semibold', isComplete && 'text-green-600 line-through dark:text-green-400')}>
                                            {step.title}
                                        </p>
                                        <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </SettingsSection>
            </SettingsLayout>
        </AppLayout>
    );
}
