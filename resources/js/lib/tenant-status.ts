export const TENANT_STATUS_LABELS: Record<string, string> = {
    active: 'Activo',
    suspended: 'Suspendido',
    trial: 'Prueba',
};

export const TENANT_STATUS_PILL_CLASS: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
    suspended: 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400',
    trial: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
};

export const TENANT_STATUS_DOT_CLASS: Record<string, string> = {
    active: 'bg-emerald-500',
    suspended: 'bg-red-500',
    trial: 'bg-amber-500',
};

const DAY_MS = 24 * 60 * 60 * 1000;

export interface TrialInfo {
    label: string;
    expired: boolean;
    /** True when the trial is over or ends within 3 days. */
    urgent: boolean;
}

/** Remaining trial for a tenant, or null when it has no trial end date. */
export function getTrialInfo(trialEndsAt: string | null | undefined, now: Date = new Date()): TrialInfo | null {
    if (!trialEndsAt) return null;
    const end = new Date(trialEndsAt);
    if (isNaN(end.getTime())) return null;

    const days = Math.ceil((end.getTime() - now.getTime()) / DAY_MS);
    if (days <= 0) return { label: 'Prueba vencida', expired: true, urgent: true };

    return { label: days === 1 ? '1 día restante' : `${days} días restantes`, expired: false, urgent: days <= 3 };
}
