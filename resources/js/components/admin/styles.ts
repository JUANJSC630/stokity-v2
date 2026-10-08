/** Shared touch-friendly control styles for the platform-owner panel: 44 px on phones, compact from `sm`. */
export const SECONDARY_BUTTON =
    'h-11 rounded-lg border border-border/60 px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted sm:h-9 sm:px-3 sm:text-xs';

export const PRIMARY_BUTTON =
    'h-11 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50 sm:h-9 sm:px-3 sm:text-xs';

export const DANGER_BUTTON =
    'h-11 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:h-9 sm:px-3 sm:text-xs';

/** 16 px on phones so iOS does not zoom when the field is focused. */
export const INPUT =
    'h-11 w-full rounded-lg border border-border/60 bg-background px-3 text-base focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none sm:h-9 sm:text-sm';

export const PILL = 'rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground';

export const OUTLINE_ACTION =
    'flex h-11 items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-card px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-9 sm:px-3 sm:text-xs';

export const BACK_BUTTON =
    'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted sm:h-8 sm:w-8';
