declare module 'qz-tray' {
    interface QZWebSocket {
        connect(options?: { retries?: number; delay?: number }): Promise<void>;
        disconnect(): Promise<void>;
        isActive(): boolean;
    }

    interface QZSecurity {
        setCertificatePromise(fn: (resolve: (v: string) => void, reject: (e: unknown) => void) => void): void;
        setSignatureAlgorithm(algorithm: string): void;
        setSignaturePromise(
            fn: (toSign: string) => (resolve: (v: string) => void, reject: (e: unknown) => void) => void,
        ): void;
    }

    interface QZConfig {
        // opaque config object returned by configs.create()
    }

    interface QZPrinters {
        find(query?: string): Promise<string | string[]>;
    }

    interface QZConfigs {
        create(printerName: string, options?: Record<string, unknown>): QZConfig;
    }

    type QZDataElement = {
        type: 'raw';
        format: 'base64' | 'hex' | 'plain';
        data: string;
    };

    interface QZ {
        websocket: QZWebSocket;
        security: QZSecurity;
        printers: QZPrinters;
        configs: QZConfigs;
        print(config: QZConfig, data: QZDataElement[]): Promise<void>;
    }

    const qz: QZ;
    export default qz;
}
