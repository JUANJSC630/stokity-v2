import { describe, expect, it } from 'vitest';
import { getRoleLabel } from '../roles';

describe('getRoleLabel', () => {
    it('translates the known roles', () => {
        expect(getRoleLabel('administrador')).toBe('Administrador');
        expect(getRoleLabel('encargado')).toBe('Encargado');
        expect(getRoleLabel('vendedor')).toBe('Vendedor');
        expect(getRoleLabel('super_admin')).toBe('Super administrador');
    });

    it('falls back to the raw role for custom roles', () => {
        expect(getRoleLabel('contador')).toBe('contador');
    });

    it('returns an empty string when there is no role', () => {
        expect(getRoleLabel(null)).toBe('');
        expect(getRoleLabel(undefined)).toBe('');
        expect(getRoleLabel('')).toBe('');
    });
});
