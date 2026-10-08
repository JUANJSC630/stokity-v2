export const DEFAULT_BRAND_PRIMARY = '#3F3F46';
export const DEFAULT_BRAND_SECONDARY = '#A1A1AA';

const LIGHT_TEXT = { hex: '#ffffff', rgb: '255, 255, 255' };
const DARK_TEXT = { hex: '#0a0a0a', rgb: '10, 10, 10' };

export interface ReadableTextColor {
    hex: string;
    rgb: string;
}

function channelToLinear(value: number): number {
    const srgb = value / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

const MIN_CONTRAST_FOR_WHITE_TEXT = 3;

/**
 * Picks the text color to put over a #rrggbb brand color. White is the default
 * so mid-tone brand colors keep a clean look; near-black is only used when the
 * color is so light that white drops below a 3:1 contrast. Falls back to white
 * for malformed input.
 */
export function getReadableTextColor(hex: string | null | undefined): ReadableTextColor {
    const match = /^#?([0-9a-f]{6})$/i.exec((hex ?? '').trim());
    if (!match) {
        return LIGHT_TEXT;
    }

    const value = parseInt(match[1], 16);
    const luminance =
        0.2126 * channelToLinear((value >> 16) & 255) + 0.7152 * channelToLinear((value >> 8) & 255) + 0.0722 * channelToLinear(value & 255);

    const contrastWithWhite = 1.05 / (luminance + 0.05);

    return contrastWithWhite >= MIN_CONTRAST_FOR_WHITE_TEXT ? LIGHT_TEXT : DARK_TEXT;
}
