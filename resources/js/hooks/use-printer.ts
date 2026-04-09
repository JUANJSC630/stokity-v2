import {
    connectQZ,
    disconnectQZ,
    isConnected,
    listPrinters,
    printCashSession as qzPrintCashSession,
    printReceipt as qzPrintReceipt,
    printReturn as qzPrintReturn,
    printTest as qzPrintTest,
} from '@/services/qzTray';
import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_PRINTER_KEY = 'stokity_printer_name';
const STORAGE_WIDTH_KEY = 'stokity_printer_width';
const STORAGE_AUTO_PRINT_KEY = 'stokity_auto_print';
const STORAGE_QZ_DISABLED_KEY = 'stokity_qz_disabled';

type PrinterStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'unavailable';

export interface PrinterState {
    status: PrinterStatus;
    printers: string[];
    selectedPrinter: string;
    paperWidth: 58 | 80;
    autoPrint: boolean;
    setSelectedPrinter: (name: string) => void;
    setPaperWidth: (w: 58 | 80) => void;
    setAutoPrint: (v: boolean) => void;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    printReceipt: (saleId: number) => Promise<void>;
    printReturn: (saleReturnId: number) => Promise<void>;
    printCashSession: (sessionId: number) => Promise<void>;
    printTest: () => Promise<void>;
    errorMessage: string | null;
}

export function usePrinter(): PrinterState {
    const [status, setStatus] = useState<PrinterStatus>('idle');
    const [printers, setPrinters] = useState<string[]>([]);
    const [selectedPrinter, setSelectedPrinterState] = useState<string>(() => localStorage.getItem(STORAGE_PRINTER_KEY) ?? '');
    const [paperWidth, setPaperWidthState] = useState<58 | 80>(() => (Number(localStorage.getItem(STORAGE_WIDTH_KEY)) as 58 | 80) || 80);
    const [autoPrint, setAutoPrintState] = useState<boolean>(() => localStorage.getItem(STORAGE_AUTO_PRINT_KEY) !== 'false');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const didAutoConnect = useRef(false);

    const setSelectedPrinter = useCallback((name: string) => {
        setSelectedPrinterState(name);
        localStorage.setItem(STORAGE_PRINTER_KEY, name);
    }, []);

    const setPaperWidth = useCallback((w: 58 | 80) => {
        setPaperWidthState(w);
        localStorage.setItem(STORAGE_WIDTH_KEY, String(w));
    }, []);

    const setAutoPrint = useCallback((v: boolean) => {
        setAutoPrintState(v);
        localStorage.setItem(STORAGE_AUTO_PRINT_KEY, String(v));
    }, []);

    const connect = useCallback(async () => {
        localStorage.removeItem(STORAGE_QZ_DISABLED_KEY);
        setStatus('connecting');
        setErrorMessage(null);
        try {
            await connectQZ();
            const found = await listPrinters();
            setPrinters(found);

            // Auto-select saved printer if still available
            const saved = localStorage.getItem(STORAGE_PRINTER_KEY) ?? '';
            if (saved && found.includes(saved)) {
                setSelectedPrinterState(saved);
            } else if (found.length > 0 && !saved) {
                setSelectedPrinter(found[0]);
            }

            setStatus('connected');
        } catch {
            setStatus('unavailable');
            setErrorMessage('QZ Tray no está instalado o no está ejecutándose.');
        }
    }, [setSelectedPrinter]);

    // Auto-connect once on mount — skipped if user explicitly disconnected
    useEffect(() => {
        if (didAutoConnect.current) return;
        didAutoConnect.current = true;

        if (localStorage.getItem(STORAGE_QZ_DISABLED_KEY) === 'true') {
            setStatus('idle');
            return;
        }

        isConnected()
            .then((active) => {
                if (active) {
                    setStatus('connected');
                    listPrinters().then(setPrinters);
                } else {
                    connect();
                }
            })
            .catch(() => {
                connect();
            });
    }, [connect]);

    const disconnect = useCallback(async () => {
        localStorage.setItem(STORAGE_QZ_DISABLED_KEY, 'true');
        await disconnectQZ();
        setStatus('idle');
        setPrinters([]);
    }, []);

    // No disconnect on unmount — QZ Tray WebSocket is a singleton that should
    // stay alive across page navigations. Disconnecting here breaks pages that
    // mount right after (e.g. navigating from /printer to /ticket).
    // The browser naturally closes the WebSocket when the tab is closed.

    const printReceipt = useCallback(
        async (saleId: number) => {
            if (!selectedPrinter) throw new Error('No hay impresora seleccionada');
            if (status !== 'connected') throw new Error('QZ Tray no está conectado');

            await qzPrintReceipt(saleId, selectedPrinter);
        },
        [selectedPrinter, status],
    );

    const printReturn = useCallback(
        async (saleReturnId: number) => {
            if (!selectedPrinter) throw new Error('No hay impresora seleccionada');
            if (status !== 'connected') throw new Error('QZ Tray no está conectado');

            await qzPrintReturn(saleReturnId, selectedPrinter);
        },
        [selectedPrinter, status],
    );

    const printCashSession = useCallback(
        async (sessionId: number) => {
            if (!selectedPrinter) throw new Error('No hay impresora seleccionada');
            if (status !== 'connected') throw new Error('QZ Tray no está conectado');

            await qzPrintCashSession(sessionId, selectedPrinter);
        },
        [selectedPrinter, status],
    );

    const printTest = useCallback(async () => {
        if (!selectedPrinter) throw new Error('No hay impresora seleccionada');
        if (status !== 'connected') throw new Error('QZ Tray no está conectado');

        await qzPrintTest(selectedPrinter, paperWidth);
    }, [selectedPrinter, paperWidth, status]);

    return {
        status,
        printers,
        selectedPrinter,
        paperWidth,
        autoPrint,
        setSelectedPrinter,
        setPaperWidth,
        setAutoPrint,
        connect,
        disconnect,
        printReceipt,
        printReturn,
        printCashSession,
        printTest,
        errorMessage,
    };
}
