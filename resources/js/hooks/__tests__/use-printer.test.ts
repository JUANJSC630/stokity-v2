import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePrinter } from '../use-printer';

// Access the mocked qzTray module
const qzTray = await vi.importMock<typeof import('@/services/qzTray')>('@/services/qzTray');

describe('usePrinter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('starts with idle status before auto-connect resolves', () => {
        // Make isConnected hang so we can observe initial state
        (qzTray.isConnected as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

        const { result } = renderHook(() => usePrinter());
        // Initial state before any async resolution
        expect(result.current.status).toBe('idle');
    });

    it('auto-connects on mount and transitions to connected', async () => {
        (qzTray.isConnected as ReturnType<typeof vi.fn>).mockResolvedValue(false);
        (qzTray.connectQZ as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
        (qzTray.listPrinters as ReturnType<typeof vi.fn>).mockResolvedValue(['POS-58', 'PDF']);

        const { result } = renderHook(() => usePrinter());

        await waitFor(() => {
            expect(result.current.status).toBe('connected');
        });

        expect(result.current.printers).toEqual(['POS-58', 'PDF']);
    });

    it('sets status to unavailable when connect fails', async () => {
        (qzTray.isConnected as ReturnType<typeof vi.fn>).mockResolvedValue(false);
        (qzTray.connectQZ as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('No QZ'));

        const { result } = renderHook(() => usePrinter());

        await waitFor(() => {
            expect(result.current.status).toBe('unavailable');
        });

        expect(result.current.errorMessage).toBeTruthy();
    });

    it('persists selected printer to localStorage', async () => {
        (qzTray.isConnected as ReturnType<typeof vi.fn>).mockResolvedValue(false);
        (qzTray.connectQZ as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
        (qzTray.listPrinters as ReturnType<typeof vi.fn>).mockResolvedValue(['POS-58', 'PDF']);

        const { result } = renderHook(() => usePrinter());

        await waitFor(() => {
            expect(result.current.status).toBe('connected');
        });

        act(() => {
            result.current.setSelectedPrinter('PDF');
        });

        expect(localStorage.setItem).toHaveBeenCalledWith('stokity_printer_name', 'PDF');
    });

    it('persists paper width to localStorage', async () => {
        (qzTray.isConnected as ReturnType<typeof vi.fn>).mockResolvedValue(false);
        (qzTray.connectQZ as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
        (qzTray.listPrinters as ReturnType<typeof vi.fn>).mockResolvedValue(['POS-58']);

        const { result } = renderHook(() => usePrinter());

        await waitFor(() => {
            expect(result.current.status).toBe('connected');
        });

        act(() => {
            result.current.setPaperWidth(58);
        });

        expect(localStorage.setItem).toHaveBeenCalledWith('stokity_printer_width', '58');
    });

    it('printReceipt throws when no printer is selected', async () => {
        (qzTray.isConnected as ReturnType<typeof vi.fn>).mockResolvedValue(false);
        (qzTray.connectQZ as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
        (qzTray.listPrinters as ReturnType<typeof vi.fn>).mockResolvedValue([]);

        const { result } = renderHook(() => usePrinter());

        await waitFor(() => {
            expect(result.current.status).toBe('connected');
        });

        await expect(result.current.printReceipt(1)).rejects.toThrow('No hay impresora seleccionada');
    });

    it('defaults paper width to 80', () => {
        (qzTray.isConnected as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

        const { result } = renderHook(() => usePrinter());
        expect(result.current.paperWidth).toBe(80);
    });
});
