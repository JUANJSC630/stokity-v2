export interface PrepareImageOptions {
    /** Longest side in px after resizing. */
    maxDimension?: number;
    /** Files at or below this size (and within maxDimension) are returned untouched. */
    maxBytes?: number;
}

const DEFAULT_MAX_DIMENSION = 1600;
// Kept well under the 2MB PHP upload_max_filesize default so phone photos never hit the server limit.
const DEFAULT_MAX_BYTES = 1.5 * 1024 * 1024;
const JPEG_QUALITIES = [0.85, 0.75, 0.65, 0.5];

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function renamedTo(file: File, extension: string): string {
    return `${file.name.replace(/\.[^.]+$/, '')}.${extension}`;
}

/**
 * Shrinks a phone-sized photo before upload so it stays under the server limits.
 * Never throws: if the image cannot be decoded or compressed it returns the original file.
 */
export async function prepareImageForUpload(file: File, options: PrepareImageOptions = {}): Promise<File> {
    const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
    const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

    if (!file.type.startsWith('image/') || file.type === 'image/gif' || typeof createImageBitmap !== 'function') {
        return file;
    }

    try {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));

        if (scale === 1 && file.size <= maxBytes) {
            bitmap.close();
            return file;
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const context = canvas.getContext('2d');
        if (!context) {
            bitmap.close();
            return file;
        }

        // Transparent PNGs (logos) keep their format when they fit; everything else becomes JPEG on white.
        if (file.type === 'image/png') {
            context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            const png = await toBlob(canvas, 'image/png');
            if (png && png.size <= maxBytes) {
                bitmap.close();
                return new File([png], file.name, { type: 'image/png' });
            }
        }

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();

        let smallest: Blob | null = null;
        for (const quality of JPEG_QUALITIES) {
            const blob = await toBlob(canvas, 'image/jpeg', quality);
            if (!blob) {
                continue;
            }
            smallest = blob;
            if (blob.size <= maxBytes) {
                break;
            }
        }

        if (!smallest || smallest.size >= file.size) {
            return file;
        }

        return new File([smallest], renamedTo(file, 'jpg'), { type: 'image/jpeg' });
    } catch {
        return file;
    }
}
