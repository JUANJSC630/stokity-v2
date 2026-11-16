import { IMAGE_INPUT_ACCEPT, IMAGE_UPLOAD_MAX_BYTES, isHeicFile, prepareImageForUpload } from '@/lib/image-upload';
import { cn } from '@/lib/utils';
import { ImageOff, ImagePlus, Loader2, RotateCcw, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type ClipboardEvent, type DragEvent, type ReactNode } from 'react';

type Shape = 'landscape' | 'square' | 'circle';

export interface ImageUploadProps {
    /** Id of the hidden file input; also the prefix for the hint, status and error ids. */
    id: string;
    label: string;
    /** Photo picked in this session and not yet saved. `null` shows `currentUrl`. */
    file: File | null;
    onChange: (file: File | null) => void;
    /** Image already saved on the server. */
    currentUrl?: string | null;
    /** Server validation error; local problems (not an image, conversion failed) are shown by the component itself. */
    error?: string;
    /** Extra guidance under the field, after the accepted formats. */
    hint?: ReactNode;
    /** `canvas`: big drop zone with the preview (product photo). `inline`: compact thumbnail + actions (settings, avatars). */
    layout?: 'canvas' | 'inline';
    shape?: Shape;
    /** `contain` + white background for logos, so nothing gets cropped. */
    fit?: 'cover' | 'contain';
    placeholderIcon?: LucideIcon;
    emptyText?: string;
    disabled?: boolean;
    /** Additional controls next to the pick button (e.g. "Usar URL"). */
    actions?: ReactNode;
    className?: string;
}

interface PickedInfo {
    file: File;
    originalName: string;
    originalSize: number;
    wasHeic: boolean;
    wasOptimized: boolean;
}

const sizeFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

export function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) {
        return `${sizeFormatter.format(Math.max(1, Math.round(bytes / 1024)))} KB`;
    }
    return `${sizeFormatter.format(bytes / (1024 * 1024))} MB`;
}

const SHAPE_CLASS: Record<Shape, string> = {
    landscape: 'aspect-[4/3] rounded-xl',
    square: 'aspect-square rounded-xl',
    circle: 'aspect-square rounded-full',
};

const FOCUS_RING =
    'outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** The one image picker for every upload in Stokity: pick, drop or paste; HEIC and big photos are converted before upload. */
export function ImageUpload({
    id,
    label,
    file,
    onChange,
    currentUrl = null,
    error,
    hint,
    layout = 'inline',
    shape = 'square',
    fit = 'cover',
    placeholderIcon: PlaceholderIcon = ImagePlus,
    emptyText = 'Sin imagen',
    disabled = false,
    actions,
    className,
}: ImageUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const labelId = useId();
    const [info, setInfo] = useState<PickedInfo | null>(null);
    const [processing, setProcessing] = useState<'heic' | 'image' | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [failedUrl, setFailedUrl] = useState<string | null>(null);

    const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
    useEffect(() => () => (objectUrl ? URL.revokeObjectURL(objectUrl) : undefined), [objectUrl]);

    const previewUrl = objectUrl ?? currentUrl;
    const previewFailed = previewUrl !== null && failedUrl === previewUrl;

    const pickedInfo = info && info.file === file ? info : null;
    const shownError = localError ?? error;
    const hintId = `${id}-hint`;
    const statusId = `${id}-status`;
    const errorId = `${id}-error`;
    const busy = processing !== null;
    const hasImage = Boolean(previewUrl);

    const accept = async (picked: File | undefined | null) => {
        if (!picked || disabled || busy) {
            return;
        }
        const heic = isHeicFile(picked);
        if (!heic && !picked.type.startsWith('image/')) {
            setLocalError('Ese archivo no es una imagen. Elige una foto JPG, PNG, WebP o HEIC.');
            return;
        }

        setLocalError(null);
        setProcessing(heic ? 'heic' : 'image');
        const prepared = await prepareImageForUpload(picked);
        setProcessing(null);

        if (isHeicFile(prepared)) {
            setLocalError('No pudimos convertir esta foto del iPhone. Prueba con otra o guárdala como JPG.');
            return;
        }
        if (prepared.size > IMAGE_UPLOAD_MAX_BYTES) {
            setLocalError(
                `La foto pesa ${formatBytes(prepared.size)} y el máximo es ${formatBytes(IMAGE_UPLOAD_MAX_BYTES)}. Prueba con otra más liviana.`,
            );
            return;
        }

        setInfo({ file: prepared, originalName: picked.name, originalSize: picked.size, wasHeic: heic, wasOptimized: prepared !== picked });
        onChange(prepared);
    };

    const openPicker = () => {
        if (!disabled && !busy) {
            inputRef.current?.click();
        }
    };

    const undo = () => {
        setLocalError(null);
        setInfo(null);
        onChange(null);
    };

    const handleDrop = (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        setIsDragging(false);
        accept(event.dataTransfer.files?.[0]);
    };

    const handlePaste = (event: ClipboardEvent<HTMLElement>) => {
        const pasted = Array.from(event.clipboardData.files).find((item) => item.type.startsWith('image/') || isHeicFile(item));
        if (pasted) {
            event.preventDefault();
            accept(pasted);
        }
    };

    const dropHandlers = {
        onDragOver: (event: DragEvent<HTMLElement>) => {
            event.preventDefault();
            if (!disabled) {
                setIsDragging(true);
            }
        },
        onDragLeave: (event: DragEvent<HTMLElement>) => {
            event.preventDefault();
            setIsDragging(false);
        },
        onDrop: handleDrop,
        onPaste: handlePaste,
    };

    const statusText = processing
        ? processing === 'heic'
            ? 'Convirtiendo la foto del iPhone…'
            : 'Optimizando la foto…'
        : pickedInfo
          ? describePicked(pickedInfo)
          : '';

    const pickLabel = hasImage ? 'Cambiar foto' : 'Subir foto';
    const describedBy = [hintId, statusText ? statusId : null, shownError ? errorId : null].filter(Boolean).join(' ');

    const preview = (
        <span
            className={cn(
                'relative flex size-full items-center justify-center overflow-hidden',
                fit === 'contain' && hasImage && !previewFailed ? 'bg-white' : 'bg-muted/60',
            )}
        >
            {hasImage && !previewFailed ? (
                <img
                    src={previewUrl ?? undefined}
                    alt={`Vista previa de ${label.toLowerCase()}`}
                    onError={() => setFailedUrl(previewUrl)}
                    className={cn('size-full', fit === 'contain' ? 'object-contain p-2' : 'object-cover')}
                />
            ) : (
                <span className="flex flex-col items-center gap-1.5 p-3 text-center text-muted-foreground">
                    {previewFailed ? (
                        <ImageOff className="size-7" strokeWidth={1.5} aria-hidden="true" />
                    ) : (
                        <PlaceholderIcon className={layout === 'canvas' ? 'size-9' : 'size-7'} strokeWidth={1.5} aria-hidden="true" />
                    )}
                    {layout === 'canvas' && <span className="text-sm font-medium">{previewFailed ? 'No se pudo mostrar la imagen' : emptyText}</span>}
                </span>
            )}
            {busy && (
                <span className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
                    <Loader2 className="size-6 animate-spin text-[var(--brand-primary)]" aria-hidden="true" />
                </span>
            )}
        </span>
    );

    const frameClass = cn(
        'group relative block overflow-hidden border-2 transition-colors',
        SHAPE_CLASS[shape],
        FOCUS_RING,
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        shownError
            ? 'border-red-500'
            : isDragging
              ? 'border-dashed border-[var(--brand-primary)] bg-[var(--brand-primary-soft)]'
              : hasImage
                ? 'border-border/60 hover:border-[var(--brand-primary)]'
                : 'border-dashed border-border hover:border-[var(--brand-primary)]',
    );

    const pickButton = (
        <button
            type="button"
            onClick={openPicker}
            disabled={disabled || busy}
            aria-describedby={describedBy}
            className={cn(
                'inline-flex h-11 items-center gap-2 rounded-xl border border-border/60 bg-card px-4 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 sm:h-10',
                FOCUS_RING,
            )}
        >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="size-4" aria-hidden="true" />}
            {busy ? 'Procesando…' : pickLabel}
        </button>
    );

    const undoButton = file && !busy && (
        <button
            type="button"
            onClick={undo}
            className={cn(
                'inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-10',
                FOCUS_RING,
            )}
        >
            <RotateCcw className="size-4" aria-hidden="true" />
            {currentUrl ? 'Deshacer' : 'Quitar'}
        </button>
    );

    const messages = (
        <div className="flex flex-col gap-1">
            <p
                id={statusId}
                role="status"
                aria-live="polite"
                className={cn('text-xs font-medium text-[var(--brand-primary)]', !statusText && 'sr-only')}
            >
                {statusText}
            </p>
            {shownError && (
                <p id={errorId} role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {shownError}
                </p>
            )}
            <p id={hintId} className="text-xs text-muted-foreground">
                JPG, PNG, WebP o fotos del iPhone (HEIC). Arrastra, pega o elige una foto: se optimiza sola.
                {hint && <> {hint}</>}
            </p>
        </div>
    );

    const input = (
        <input
            ref={inputRef}
            id={id}
            type="file"
            accept={IMAGE_INPUT_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            aria-invalid={shownError ? true : undefined}
            disabled={disabled}
            onChange={(event) => {
                accept(event.target.files?.[0]);
                event.target.value = '';
            }}
        />
    );

    if (layout === 'canvas') {
        return (
            <div className={cn('flex flex-col gap-3', className)} {...dropHandlers}>
                <span id={labelId} className="sr-only">
                    {label}
                </span>
                <button
                    type="button"
                    onClick={openPicker}
                    disabled={disabled || busy}
                    aria-labelledby={labelId}
                    aria-describedby={describedBy}
                    aria-busy={busy}
                    className={cn(frameClass, 'w-full')}
                >
                    {preview}
                    {!busy && (
                        <span className="absolute bottom-3 left-1/2 flex h-10 -translate-x-1/2 items-center gap-2 rounded-lg bg-background/90 px-3 text-xs font-medium shadow backdrop-blur">
                            <ImagePlus className="size-4" aria-hidden="true" />
                            {isDragging ? 'Suelta la foto aquí' : pickLabel}
                        </span>
                    )}
                </button>
                {input}
                {(undoButton || actions) && (
                    <div className="flex flex-wrap items-center gap-2">
                        {undoButton}
                        {actions}
                    </div>
                )}
                {messages}
            </div>
        );
    }

    return (
        <div className={cn('flex items-start gap-4', className)} {...dropHandlers}>
            <button
                type="button"
                onClick={openPicker}
                disabled={disabled || busy}
                aria-label={`${pickLabel}: ${label}`}
                aria-describedby={describedBy}
                aria-busy={busy}
                className={cn(frameClass, 'size-20 shrink-0 sm:size-24')}
            >
                {preview}
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
                <span id={labelId} className="text-xs font-medium">
                    {label}
                    {file && (
                        <span className="ml-2 rounded-full bg-[var(--brand-primary-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--brand-primary)]">
                            Sin guardar
                        </span>
                    )}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                    {pickButton}
                    {undoButton}
                    {actions}
                </div>
                {input}
                {messages}
            </div>
        </div>
    );
}

function describePicked({ file, originalSize, wasHeic, wasOptimized }: PickedInfo): string {
    const saving = file.size < originalSize ? ` (antes ${formatBytes(originalSize)})` : '';
    if (wasHeic) {
        return `Foto del iPhone convertida: ${formatBytes(file.size)}${saving}. Lista para guardar.`;
    }
    if (wasOptimized) {
        return `Foto optimizada: ${formatBytes(file.size)}${saving}. Lista para guardar.`;
    }
    return `${file.name} · ${formatBytes(file.size)}. Lista para guardar.`;
}
