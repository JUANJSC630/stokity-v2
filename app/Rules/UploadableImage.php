<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;

/**
 * The one rule every image upload (products, users, profile, logo, default
 * product image) goes through, so they all accept the same formats and size.
 *
 * Only formats PHP GD can decode for the WebP conversion in
 * BlobStorageService are allowed. iPhone HEIC/HEIF photos are converted to
 * JPEG in the browser (resources/js/lib/image-upload.ts); one that still
 * reaches the server means that conversion failed, so it gets its own message
 * instead of the generic "must be an image".
 */
class UploadableImage implements ValidationRule
{
    public const MAX_KILOBYTES = 5120;

    /** @var list<string> */
    public const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $value instanceof UploadedFile || ! $value->isValid()) {
            $fail('No se pudo recibir la imagen. Inténtalo de nuevo.');

            return;
        }

        if ($this->isHeic($value)) {
            $fail('No pudimos convertir esta foto del iPhone (HEIC). Actualiza el navegador o guárdala como JPG y vuelve a subirla.');

            return;
        }

        if (! in_array($value->getMimeType(), self::ALLOWED_MIME_TYPES, true)) {
            $fail('La imagen debe ser JPG, PNG, GIF o WebP.');

            return;
        }

        if ($value->getSize() > self::MAX_KILOBYTES * 1024) {
            $fail('La imagen no debe pesar más de '.(self::MAX_KILOBYTES / 1024).' MB.');
        }
    }

    private function isHeic(UploadedFile $file): bool
    {
        return in_array(strtolower($file->getClientOriginalExtension()), ['heic', 'heif'], true)
            || in_array($file->getMimeType(), ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'], true);
    }
}
