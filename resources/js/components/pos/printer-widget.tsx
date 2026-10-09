import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { usePrinter } from '@/hooks/use-printer';
import { Printer, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type PrinterState = ReturnType<typeof usePrinter>;

function PrinterStatusBadge({ status, selectedPrinter, onConnect }: { status: string; selectedPrinter: string; onConnect: () => void }) {
    if (status === 'connected' && selectedPrinter) {
        return (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                <Wifi className="size-3" aria-hidden="true" />
                {selectedPrinter.length > 12 ? selectedPrinter.slice(0, 10) + '…' : selectedPrinter}
            </span>
        );
    }
    if (status === 'connecting') {
        return (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                <Printer className="size-3 animate-pulse" aria-hidden="true" />
                Conectando…
            </span>
        );
    }
    if (status === 'unavailable') {
        return (
            <span
                role="button"
                tabIndex={-1}
                onClick={onConnect}
                className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/70"
            >
                <WifiOff className="size-3" aria-hidden="true" />
                Sin impresora
            </span>
        );
    }
    return null;
}

/** Header printer state with the picker for the QZ Tray printer. */
export function PrinterWidget({ printer }: { printer: PrinterState }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                aria-expanded={open}
                aria-label="Configurar impresora"
                onClick={() => setOpen((value) => !value)}
                className="flex h-10 items-center sm:h-8"
                title="Configurar impresora"
            >
                <PrinterStatusBadge status={printer.status} selectedPrinter={printer.selectedPrinter} onConnect={printer.connect} />
            </button>

            {open && (
                <div className="absolute top-full right-0 z-50 mt-1.5 w-72 rounded-xl border border-border bg-popover p-3 shadow-xl">
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">Impresora</p>

                    {printer.status === 'unavailable' && (
                        <div className="mb-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                            QZ Tray no detectado.{' '}
                            <a href="https://qz.io/download/" target="_blank" rel="noreferrer" className="underline">
                                Descargar
                            </a>
                        </div>
                    )}

                    {printer.printers.length > 0 && (
                        <Select value={printer.selectedPrinter} onValueChange={printer.setSelectedPrinter}>
                            <SelectTrigger className="h-11 w-full text-sm sm:h-9 sm:text-xs">
                                <SelectValue placeholder="Selecciona impresora…" />
                            </SelectTrigger>
                            <SelectContent>
                                {printer.printers.map((name) => (
                                    <SelectItem key={name} value={name} className="text-xs">
                                        {name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                            Ancho del papel:{' '}
                            <a href="/settings/ticket" className="font-medium text-[var(--brand-primary)] underline">
                                Configurar
                            </a>
                        </p>
                        <button
                            type="button"
                            onClick={() => printer.connect()}
                            className="flex min-h-11 items-center px-1 text-xs font-medium text-[var(--brand-primary)] hover:underline sm:min-h-0"
                        >
                            Reconectar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
