/**
 * QZ Tray integration service
 *
 * QZ Tray is a local Java agent that bridges the browser to USB/network
 * printers.  The browser communicates via WebSocket on localhost:8181.
 *
 * Download: https://qz.io/download/
 */

// Lazy import — qz-tray ships as a plain JS module (no TS types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _qz: any = null;

async function getQZ() {
    if (!_qz) {
        _qz = (await import('qz-tray')).default;
    }
    return _qz;
}

let _signingReady = false;

async function ensureSigning() {
    if (_signingReady) return;
    const qz = await getQZ();

    qz.security.setCertificatePromise((_resolve: (v: string) => void, _reject: (e: unknown) => void) => {
        fetch('/qz/certificate')
            .then((r) => r.text())
            .then(_resolve)
            .catch(_reject);
    });

    qz.security.setSignatureAlgorithm('SHA512');

    qz.security.setSignaturePromise(
        (toSign: string) =>
            (resolve: (v: string) => void, reject: (e: unknown) => void) => {
                fetch('/qz/sign?request=' + encodeURIComponent(toSign))
                    .then((r) => r.text())
                    .then(resolve)
                    .catch(reject);
            },
    );

    _signingReady = true;
}

/** Establish a WebSocket connection to the local QZ Tray agent. */
export async function connectQZ(): Promise<void> {
    const qz = await getQZ();
    await ensureSigning();

    if (qz.websocket.isActive()) return;

    await qz.websocket.connect({ retries: 1, delay: 1 });
}

/** Disconnect from QZ Tray. */
export async function disconnectQZ(): Promise<void> {
    const qz = await getQZ();
    if (qz.websocket.isActive()) {
        await qz.websocket.disconnect();
    }
}

/** Returns true when QZ Tray WebSocket is connected. */
export async function isConnected(): Promise<boolean> {
    const qz = await getQZ();
    return qz.websocket.isActive();
}

/**
 * List all printers known to the OS.
 * Returns empty array if QZ Tray is not running.
 */
export async function listPrinters(): Promise<string[]> {
    try {
        await connectQZ();
        const qz = await getQZ();
        const result = await qz.printers.find();
        return Array.isArray(result) ? result : [result];
    } catch {
        return [];
    }
}

/**
 * Send raw ESC/POS bytes (base64-encoded) to the selected printer.
 *
 * @param printerName  Exact name as returned by listPrinters()
 * @param base64Data   Base64-encoded ESC/POS bytes from /print/receipt/{id}
 */
export async function printBase64(printerName: string, base64Data: string): Promise<void> {
    await connectQZ();
    const qz = await getQZ();

    const config = qz.configs.create(printerName);
    const data = [{ type: 'raw', format: 'base64', data: base64Data }];

    await qz.print(config, data);
}

// ── ESC/POS helpers ───────────────────────────────────────────────────────────

function encodeText(text: string): number[] {
    return Array.from(new TextEncoder().encode(text));
}

function buildTestTicket(paperWidth: 58 | 80): string {
    const cols = paperWidth >= 80 ? 48 : 32;
    const sep  = '='.repeat(cols);
    const line = '-'.repeat(cols);

    const bytes: number[] = [];

    const w  = (...b: number[]) => bytes.push(...b);
    const t  = (text: string) => bytes.push(...encodeText(text));

    // Initialize printer
    w(0x1b, 0x40);
    // Center alignment
    w(0x1b, 0x61, 0x01);
    // Double height + width
    w(0x1d, 0x21, 0x11);
    t('Stokity POS\n');
    // Normal size
    w(0x1d, 0x21, 0x00);
    t('Prueba de impresora\n');
    t(sep + '\n');

    // Left alignment
    w(0x1b, 0x61, 0x00);
    t(`Ancho: ${paperWidth} mm   Cols: ${cols}\n`);
    t(`Fecha: ${new Date().toLocaleString('es-CO')}\n`);
    t(line + '\n');

    // Center + bold
    w(0x1b, 0x61, 0x01);
    w(0x1b, 0x45, 0x01);
    t('Si ves este recibo,\n');
    t('la impresora funciona!\n');
    // Bold off
    w(0x1b, 0x45, 0x00);
    t(sep + '\n');

    // Feed + full cut
    w(0x1b, 0x64, 0x05);
    w(0x1d, 0x56, 0x41, 0x00);

    // Convert to base64
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
}

/**
 * Print a test page to verify printer connectivity.
 * Bytes are generated locally — no backend call needed.
 */
export async function printTest(printerName: string, paperWidth: 58 | 80 = 80): Promise<void> {
    const base64 = buildTestTicket(paperWidth);
    await printBase64(printerName, base64);
}

/**
 * Fetch ESC/POS receipt bytes from the server and send to printer.
 */
export async function printReceipt(saleId: number, printerName: string, paperWidth: 58 | 80 = 80): Promise<void> {
    const res = await fetch(`/print/receipt/${saleId}?width=${paperWidth}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });

    if (!res.ok) {
        throw new Error(`Receipt fetch failed: ${res.status}`);
    }

    const { data } = (await res.json()) as { data: string };
    await printBase64(printerName, data);
}

/**
 * Fetch ESC/POS cash session arqueo report from the server and send to printer.
 */
export async function printCashSession(sessionId: number, printerName: string, paperWidth: 58 | 80 = 80): Promise<void> {
    const res = await fetch(`/print/cash-session/${sessionId}?width=${paperWidth}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });

    if (!res.ok) {
        throw new Error(`Cash session report fetch failed: ${res.status}`);
    }

    const { data } = (await res.json()) as { data: string };
    await printBase64(printerName, data);
}

/**
 * Fetch ESC/POS return receipt bytes from the server and send to printer.
 */
export async function printReturn(saleReturnId: number, printerName: string, paperWidth: 58 | 80 = 80): Promise<void> {
    const res = await fetch(`/print/return-receipt/${saleReturnId}?width=${paperWidth}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });

    if (!res.ok) {
        throw new Error(`Return receipt fetch failed: ${res.status}`);
    }

    const { data } = (await res.json()) as { data: string };
    await printBase64(printerName, data);
}
