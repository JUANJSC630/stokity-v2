import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prepareImageForUpload } from '../image-upload';

const MB = 1024 * 1024;

function fileOf(size: number, type = 'image/jpeg', name = 'foto.jpeg'): File {
    return new File([new Uint8Array(size)], name, { type });
}

function stubCanvas(blobSizeFor: (type: string, quality?: number) => number | null) {
    const context = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() };
    const canvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => context),
        toBlob: vi.fn((cb: (b: Blob | null) => void, type: string, quality?: number) => {
            const size = blobSizeFor(type, quality);
            cb(size === null ? null : new Blob([new Uint8Array(size)], { type }));
        }),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLElement);
    return canvas;
}

function stubBitmap(width: number, height: number) {
    const bitmap = { width, height, close: vi.fn() };
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
    return bitmap;
}

describe('prepareImageForUpload', () => {
    beforeEach(() => vi.unstubAllGlobals());
    afterEach(() => vi.restoreAllMocks());

    it('returns small images within the dimension limit untouched', async () => {
        stubBitmap(800, 600);
        const file = fileOf(200 * 1024);

        expect(await prepareImageForUpload(file)).toBe(file);
    });

    it('leaves gifs and non-images untouched', async () => {
        stubBitmap(4000, 3000);
        const gif = fileOf(5 * MB, 'image/gif', 'a.gif');
        const pdf = fileOf(5 * MB, 'application/pdf', 'a.pdf');

        expect(await prepareImageForUpload(gif)).toBe(gif);
        expect(await prepareImageForUpload(pdf)).toBe(pdf);
    });

    it('resizes a big phone photo to the max dimension and exports a smaller jpeg', async () => {
        stubBitmap(4000, 3000);
        const canvas = stubCanvas(() => 600 * 1024);
        const file = fileOf(6 * MB, 'image/jpeg', 'IMG_0001.jpeg');

        const result = await prepareImageForUpload(file);

        expect(canvas.width).toBe(1600);
        expect(canvas.height).toBe(1200);
        expect(result.type).toBe('image/jpeg');
        expect(result.name).toBe('IMG_0001.jpg');
        expect(result.size).toBe(600 * 1024);
    });

    it('lowers the jpeg quality until it fits under the byte limit', async () => {
        stubBitmap(4000, 3000);
        const canvas = stubCanvas((_type, quality) => (quality && quality > 0.7 ? 3 * MB : 1 * MB));

        const result = await prepareImageForUpload(fileOf(8 * MB));

        expect(result.size).toBe(1 * MB);
        expect(canvas.toBlob).toHaveBeenCalledTimes(3);
    });

    it('keeps a transparent png as png when it fits', async () => {
        stubBitmap(3000, 3000);
        stubCanvas(() => 400 * 1024);

        const result = await prepareImageForUpload(fileOf(4 * MB, 'image/png', 'logo.png'));

        expect(result.type).toBe('image/png');
        expect(result.name).toBe('logo.png');
    });

    it('returns the original when the image cannot be decoded', async () => {
        vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('bad')));
        const file = fileOf(5 * MB);

        expect(await prepareImageForUpload(file)).toBe(file);
    });

    it('returns the original when compression would not make it smaller', async () => {
        stubBitmap(4000, 3000);
        stubCanvas(() => 9 * MB);
        const file = fileOf(5 * MB);

        expect(await prepareImageForUpload(file)).toBe(file);
    });
});
