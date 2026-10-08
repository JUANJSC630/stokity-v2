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

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "hace 5 min", "hace 2 h", "hace 3 días", "hace 2 meses"; a year or older falls back to the date. */
export function formatRelativeTime(date: string | Date | null | undefined, now: Date = new Date()): string {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';

    const elapsed = now.getTime() - d.getTime();
    if (elapsed < MINUTE) return 'justo ahora';
    if (elapsed < HOUR) return `hace ${Math.floor(elapsed / MINUTE)} min`;
    if (elapsed < DAY) return `hace ${Math.floor(elapsed / HOUR)} h`;
    const days = Math.floor(elapsed / DAY);
    if (days < 30) return days === 1 ? 'ayer' : `hace ${days} días`;
    const months = Math.floor(days / 30);
    if (months < 12) return months === 1 ? 'hace 1 mes' : `hace ${months} meses`;

    return formatDate(d);
}

/** "8 oct 2026" for a plain Y-m-d date, read as that calendar day (no timezone shift). */
export function formatDateOnly(date: string | null | undefined): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date ?? '');
    if (!match) return '—';

    const local = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

    return local.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
}
