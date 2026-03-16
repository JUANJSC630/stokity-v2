/**
 * Centralized formatting utilities — always use 'es-CO' locale.
 * All functions handle null/undefined gracefully by returning '—'.
 */

const LOCALE = 'es-CO';
const TZ = 'America/Bogota';

/** "13 mar 2026" */
export function formatDate(date: string | Date | null | undefined): string {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
}

/** "13 mar 2026, 3:45 p. m." */
export function formatDateTime(date: string | Date | null | undefined): string {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString(LOCALE, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: TZ,
    });
}

/** "3:45 p. m." */
export function formatTime(date: string | Date | null | undefined): string {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', timeZone: TZ });
}

/** "$ 12.500" (COP, no decimals) */
export function formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined || isNaN(amount)) return '$ 0';
    return new Intl.NumberFormat(LOCALE, {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}
