import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageUpload, formatBytes, type ImageUploadProps } from '../image-upload';

const prepareImageForUpload = vi.fn();
vi.mock('@/lib/image-upload', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/image-upload')>()),
    prepareImageForUpload: (file: File) => prepareImageForUpload(file),
}));

const KB = 1024;
const MB = 1024 * KB;

function fileOf(size: number, type: string, name: string): File {
    return new File([new Uint8Array(size)], name, { type });
}

function Harness(props: Partial<ImageUploadProps> & { onPicked?: (file: File | null) => void }) {
    const [file, setFile] = useState<File | null>(null);
    return (
        <ImageUpload
            id="image"
            label="Imagen del producto"
            file={file}
            onChange={(next) => {
                setFile(next);
                props.onPicked?.(next);
            }}
            {...props}
        />
    );
}

function pick(file: File) {
    fireEvent.change(document.getElementById('image') as HTMLInputElement, { target: { files: [file] } });
}

describe('ImageUpload', () => {
    beforeEach(() => {
        prepareImageForUpload.mockReset();
    });

    it('converts an iPhone HEIC photo and says how much it shrank', async () => {
        const heic = fileOf(846 * KB, 'image/heic', 'IMG_1665.HEIC');
        const jpeg = fileOf(187 * KB, 'image/jpeg', 'IMG_1665.jpg');
        prepareImageForUpload.mockResolvedValue(jpeg);
        const onPicked = vi.fn();
        render(<Harness onPicked={onPicked} />);

        pick(heic);

        await waitFor(() => expect(onPicked).toHaveBeenCalledWith(jpeg));
        expect(screen.getByRole('status')).toHaveTextContent('Foto del iPhone convertida: 187 KB (antes 846 KB). Lista para guardar.');
        expect(screen.getByAltText('Vista previa de imagen del producto')).toHaveAttribute('src', 'blob:IMG_1665.jpg');
        expect(screen.getByText('Sin guardar')).toBeInTheDocument();
    });

    it('accepts a HEIC dropped from Windows with no MIME type', async () => {
        const jpeg = fileOf(200 * KB, 'image/jpeg', 'IMG_0047.jpg');
        prepareImageForUpload.mockResolvedValue(jpeg);
        const onPicked = vi.fn();
        render(<Harness onPicked={onPicked} layout="canvas" />);

        fireEvent.drop(screen.getByRole('button', { name: 'Imagen del producto' }), {
            dataTransfer: { files: [fileOf(900 * KB, '', 'IMG_0047.HEIC')] },
        });

        await waitFor(() => expect(onPicked).toHaveBeenCalledWith(jpeg));
    });

    it('explains when an iPhone photo could not be converted and keeps nothing', async () => {
        const heic = fileOf(900 * KB, 'image/heic', 'IMG_1665.HEIC');
        prepareImageForUpload.mockResolvedValue(heic);
        const onPicked = vi.fn();
        render(<Harness onPicked={onPicked} />);

        pick(heic);

        expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos convertir esta foto del iPhone');
        expect(onPicked).not.toHaveBeenCalled();
        expect(document.getElementById('image')).toHaveAttribute('aria-invalid', 'true');
    });

    it('rejects files that are not images without processing them', async () => {
        const onPicked = vi.fn();
        render(<Harness onPicked={onPicked} />);

        pick(fileOf(100 * KB, 'application/pdf', 'factura.pdf'));

        expect(await screen.findByRole('alert')).toHaveTextContent('Ese archivo no es una imagen');
        expect(prepareImageForUpload).not.toHaveBeenCalled();
        expect(onPicked).not.toHaveBeenCalled();
    });

    it('rejects a photo that stays above the server limit', async () => {
        const big = fileOf(6 * MB, 'image/gif', 'anim.gif');
        prepareImageForUpload.mockResolvedValue(big);
        render(<Harness />);

        pick(big);

        expect(await screen.findByRole('alert')).toHaveTextContent('La foto pesa 6 MB y el máximo es 5 MB');
    });

    it('takes an image pasted from the clipboard', async () => {
        const png = fileOf(50 * KB, 'image/png', 'captura.png');
        prepareImageForUpload.mockResolvedValue(png);
        const onPicked = vi.fn();
        render(<Harness onPicked={onPicked} />);

        fireEvent.paste(screen.getByRole('button', { name: 'Subir foto: Imagen del producto' }), { clipboardData: { files: [png] } });

        await waitFor(() => expect(onPicked).toHaveBeenCalledWith(png));
        expect(screen.getByRole('status')).toHaveTextContent('captura.png · 50 KB. Lista para guardar.');
    });

    it('starts from the saved image and undo returns to it', async () => {
        const jpeg = fileOf(300 * KB, 'image/jpeg', 'nueva.jpg');
        prepareImageForUpload.mockResolvedValue(jpeg);
        const onPicked = vi.fn();
        render(<Harness onPicked={onPicked} currentUrl="/img/9.jpg" />);

        expect(screen.getByAltText('Vista previa de imagen del producto')).toHaveAttribute('src', '/img/9.jpg');
        expect(screen.getByRole('button', { name: 'Cambiar foto' })).toBeInTheDocument();

        pick(jpeg);
        fireEvent.click(await screen.findByRole('button', { name: 'Deshacer' }));

        expect(onPicked).toHaveBeenLastCalledWith(null);
        expect(screen.getByAltText('Vista previa de imagen del producto')).toHaveAttribute('src', '/img/9.jpg');
        expect(screen.queryByText('Sin guardar')).not.toBeInTheDocument();
    });

    it('shows the server error tied to the field', () => {
        render(<Harness error="La imagen debe ser JPG, PNG, GIF o WebP." />);

        expect(screen.getByRole('alert')).toHaveTextContent('La imagen debe ser JPG, PNG, GIF o WebP.');
        expect(screen.getByRole('button', { name: 'Subir foto: Imagen del producto' })).toHaveAttribute(
            'aria-describedby',
            expect.stringContaining('image-error'),
        );
    });

    it('shows a fallback when the saved image cannot be displayed', () => {
        render(<Harness currentUrl="/img/rota.jpg" layout="canvas" />);

        fireEvent.error(screen.getByAltText('Vista previa de imagen del producto'));

        expect(screen.getByText('No se pudo mostrar la imagen')).toBeInTheDocument();
    });

    it('does nothing while disabled', () => {
        render(<Harness disabled />);

        expect(screen.getByRole('button', { name: 'Subir foto' })).toBeDisabled();
    });
});

describe('formatBytes', () => {
    it.each([
        [500, '1 KB'],
        [187 * KB, '187 KB'],
        [1.5 * MB, '1,5 MB'],
    ])('%d bytes -> %s', (bytes, expected) => {
        expect(formatBytes(bytes)).toBe(expected);
    });
});
