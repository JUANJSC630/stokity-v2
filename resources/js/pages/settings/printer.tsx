import HeadingSmall from '@/components/heading-small';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { usePrinter } from '@/hooks/use-printer';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { CheckCircle, Download, ExternalLink, Monitor, Printer, Wifi, WifiOff } from 'lucide-react';
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Configuración de impresora" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Impresora térmica" description="Configura la impresión ESC/POS para tu impresora local" />

                    {/* Estado actual */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Monitor className="size-4" /> Estado de QZ Tray
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Agente QZ Tray</p>
                                    <p className="text-xs text-muted-foreground/70">
                                        Solo indica si el programa está corriendo en este equipo, no el estado de la impresora.
                                    </p>
                                </div>
                                {statusBadge()}
                            </div>

                            {printer.status === 'connected' && (
                                <>
                                    <Separator />
                                    <Alert>
                                        <AlertDescription className="text-xs text-muted-foreground">
                                            QZ Tray está activo. La lista de impresoras proviene del sistema operativo — incluye impresoras apagadas o
                                            desconectadas. Asegúrate de que la impresora esté
                                            <strong> encendida y conectada</strong> antes de imprimir.
                                        </AlertDescription>
                                    </Alert>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Impresora seleccionada</span>
                                            <span className="text-sm font-medium">
                                                {printer.selectedPrinter ?? <span className="text-muted-foreground italic">Ninguna</span>}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Ancho de papel</span>
                                            <span className="text-sm font-medium">{printer.paperWidth} mm</span>
                                        </div>
                                    </div>

                                    {printer.printers.length > 0 && (
                                        <>
                                            <Separator />
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium">Impresoras disponibles</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {printer.printers.map((name) => (
                                                        <Button
                                                            key={name}
                                                            size="sm"
                                                            variant={printer.selectedPrinter === name ? 'default' : 'outline'}
                                                            className="h-7 text-xs"
                                                            onClick={() => printer.setSelectedPrinter(name)}
                                                        >
                                                            <Printer className="mr-1 size-3" />
                                                            {name}
                                                            {printer.selectedPrinter === name && <CheckCircle className="ml-1 size-3" />}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant={printer.paperWidth === 58 ? 'default' : 'outline'}
                                                    className="h-7 text-xs"
                                                    onClick={() => printer.setPaperWidth(58)}
                                                >
                                                    58 mm
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={printer.paperWidth === 80 ? 'default' : 'outline'}
                                                    className="h-7 text-xs"
                                                    onClick={() => printer.setPaperWidth(80)}
                                                >
                                                    80 mm
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="ml-auto h-7 gap-1 text-xs"
                                                    onClick={handleTestPrint}
                                                    disabled={testing || !printer.selectedPrinter}
                                                >
                                                    <Printer className="size-3" />
                                                    {testing ? 'Imprimiendo…' : 'Probar impresora'}
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                            {printer.status === 'unavailable' && (
                                <Alert>
                                    <AlertDescription className="text-sm">
                                        QZ Tray no está ejecutándose en este equipo. Instálalo y ábrelo para habilitar la impresión térmica. Sigue la
                                        guía de configuración a continuación.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>

                    {/* Descargar certificado */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Download className="size-4" /> Certificado de seguridad
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                QZ Tray requiere un certificado para autorizar a Stokity a enviar trabajos de impresión. Descarga este archivo y
                                agrégalo una sola vez en el Site Manager de QZ Tray (ver guía abajo).
                            </p>
                            <a href="/qz/certificate/download" download="stokity-qztray.pem">
                                <Button variant="outline" className="gap-2">
                                    <Download className="size-4" />
                                    Descargar certificado (.pem)
                                </Button>
                            </a>
                            <p className="text-xs text-muted-foreground">
                                Este archivo es el mismo para todos los equipos. Solo necesitas descargarlo una vez por computadora.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Guía paso a paso */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Guía de configuración</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ol className="space-y-5">
                                {steps.map((step) => (
                                    <li key={step.number} className="flex gap-4">
                                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                            {step.number}
                                        </div>
                                        <div className="space-y-1 pt-0.5">
                                            <p className="text-sm font-semibold">{step.title}</p>
                                            <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </CardContent>
                    </Card>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
