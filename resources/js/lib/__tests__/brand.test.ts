import { describe, expect, it } from 'vitest';
import { DEFAULT_BRAND_PRIMARY, getReadableTextColor } from '../brand';

describe('getReadableTextColor', () => {
    it('uses white text on the default graphite brand color', () => {
        expect(getReadableTextColor(DEFAULT_BRAND_PRIMARY).hex).toBe('#ffffff');
    });

    it('uses white text on a dark teal', () => {
        expect(getReadableTextColor('#0F766E').hex).toBe('#ffffff');
    });

    it('uses dark text on a light amber', () => {
        expect(getReadableTextColor('#F59E0B').hex).toBe('#0a0a0a');
    });

    it('uses dark text on white and white text on black', () => {
        expect(getReadableTextColor('#FFFFFF').hex).toBe('#0a0a0a');
        expect(getReadableTextColor('#000000').hex).toBe('#ffffff');
    });

    it('accepts a hex without the leading hash', () => {
        expect(getReadableTextColor('FFFF00').hex).toBe('#0a0a0a');
    });

    it('returns the matching rgb triplet', () => {
        expect(getReadableTextColor('#000000').rgb).toBe('255, 255, 255');
        expect(getReadableTextColor('#ffffff').rgb).toBe('10, 10, 10');
    });

    it.each([null, undefined, '', 'red', '#12345', '#GGGGGG'])('falls back to white text for malformed input %p', (input) => {
        expect(getReadableTextColor(input).hex).toBe('#ffffff');
    });
});
