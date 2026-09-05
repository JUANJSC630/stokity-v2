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
