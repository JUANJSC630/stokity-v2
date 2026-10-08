import { describe, expect, it } from 'vitest';
import { getTrialInfo } from '../tenant-status';

describe('getTrialInfo', () => {
    const now = new Date('2026-10-08T12:00:00Z');

    it('returns null when there is no trial end date', () => {
        expect(getTrialInfo(null, now)).toBeNull();
        expect(getTrialInfo(undefined, now)).toBeNull();
        expect(getTrialInfo('nope', now)).toBeNull();
    });

    it('counts the remaining days, rounding a partial day up', () => {
        expect(getTrialInfo('2026-10-20T12:00:00Z', now)).toEqual({ label: '12 días restantes', expired: false, urgent: false });
        expect(getTrialInfo('2026-10-09T01:00:00Z', now)).toEqual({ label: '1 día restante', expired: false, urgent: true });
    });

    it('marks the last 3 days as urgent', () => {
        expect(getTrialInfo('2026-10-11T12:00:00Z', now)?.urgent).toBe(true);
        expect(getTrialInfo('2026-10-12T12:00:00Z', now)?.urgent).toBe(false);
    });

    it('reports an expired trial', () => {
        expect(getTrialInfo('2026-10-08T12:00:00Z', now)).toEqual({ label: 'Prueba vencida', expired: true, urgent: true });
        expect(getTrialInfo('2026-09-01T00:00:00Z', now)?.expired).toBe(true);
    });
});
