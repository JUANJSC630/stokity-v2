import { formatRelativeTime } from '@/lib/format';
import { getTrialInfo, TENANT_STATUS_DOT_CLASS, TENANT_STATUS_LABELS, TENANT_STATUS_PILL_CLASS } from '@/lib/tenant-status';
import { Clock } from 'lucide-react';

export const initialsOf = (name: string): string =>
    name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();

/** Most recent ISO timestamp in the list, ignoring nulls; null when there is none. */
export function latestTimestamp(values: (string | null | undefined)[]): string | null {
    const times = values.filter((value): value is string => Boolean(value)).map((value) => new Date(value).getTime());
    const valid = times.filter((time) => !isNaN(time));

    return valid.length > 0 ? new Date(Math.max(...valid)).toISOString() : null;
}

export function StatusPill({ status }: { status: string }) {
    return (
        <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${TENANT_STATUS_PILL_CLASS[status] ?? 'bg-muted text-muted-foreground'}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${TENANT_STATUS_DOT_CLASS[status] ?? 'bg-muted-foreground'}`} />
            {TENANT_STATUS_LABELS[status] ?? status}
        </span>
    );
}

export function TrialNote({ trialEndsAt }: { trialEndsAt: string | null }) {
    const trial = getTrialInfo(trialEndsAt);
    if (!trial) return null;

    return <span className={`text-xs ${trial.urgent ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>{trial.label}</span>;
}

export function LastActivity({ at }: { at: string | null }) {
    return (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Última actividad">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {at ? <>Activo {formatRelativeTime(at)}</> : 'Sin actividad'}
        </span>
    );
}
