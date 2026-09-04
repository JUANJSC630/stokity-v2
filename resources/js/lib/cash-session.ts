/**
 * F7: whether a cash session has been open long enough to warn the user
 * they might have forgotten to close their turno. Pure function so the
 * 10-hour threshold is testable without mounting the full POS page.
 */
export function isSessionOpenTooLong(openedAt: string, now: number, thresholdHours = 10): boolean {
    const elapsedMs = now - new Date(openedAt).getTime();
    return elapsedMs > thresholdHours * 60 * 60 * 1000;
}
