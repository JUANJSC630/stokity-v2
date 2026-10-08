import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatCurrency } from '../lib/format';

const root = join(__dirname, '..');

function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(path);
        return /\.tsx?$/.test(path) ? [path] : [];
    });
}

describe('Colombian peso formatting', () => {
    it('shows whole pesos with the es-CO thousands separator, never decimals', () => {
        expect(formatCurrency(12500.5).replace(/\u00a0/g, ' ')).toBe('$ 12.501');
        expect(formatCurrency(1234567).replace(/\u00a0/g, ' ')).toBe('$ 1.234.567');
    });

    it('keeps every screen on lib/format instead of building its own currency formatter', () => {
        const offenders = sourceFiles(root)
            .filter((file) => !file.endsWith(join('lib', 'format.ts')))
            .filter((file) => /style:\s*['"]currency['"]|currency:\s*['"]COP['"]/.test(readFileSync(file, 'utf8')))
            .map((file) => relative(root, file));

        expect(offenders).toEqual([]);
    });
});
