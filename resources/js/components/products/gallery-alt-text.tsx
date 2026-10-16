import { INPUT_CLASS, LabeledField, Section } from '@/components/sales/form-fields';
import { Button } from '@/components/ui/button';
import { type ProductImage } from '@/types';
import { router } from '@inertiajs/react';
import { Save } from 'lucide-react';
import { useState } from 'react';

interface GalleryAltTextProps {
    productId: number;
    images: ProductImage[];
}

/** The extra photos uploaded by the web store, each with the text a screen reader or Google uses instead of the picture. */
export function GalleryAltText({ productId, images }: GalleryAltTextProps) {
    const [texts, setTexts] = useState<Record<number, string>>(() => Object.fromEntries(images.map((image) => [image.id, image.alt_text ?? ''])));
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    if (images.length === 0) return null;

    const save = (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        router.put(
            `/products/${productId}/images-alt-text`,
            { images: images.map((image) => ({ id: image.id, alt_text: texts[image.id] ?? '' })) },
            { preserveScroll: true, onError: setErrors, onSuccess: () => setErrors({}), onFinish: () => setSaving(false) },
        );
    };

    return (
        <Section
            title="Fotos de la galería"
            description="Describe cada foto en una frase corta (ej: «Pulsera dorada con dije de luna»). Ayuda a personas con lectores de pantalla y a Google."
        >
            <form onSubmit={save} className="flex flex-col gap-4 px-5 pb-5">
                <ul className="flex flex-col gap-3">
                    {images.map((image, index) => (
                        <li key={image.id} className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
                            <img src={image.image_url} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
                            <LabeledField
                                id={`alt-${image.id}`}
                                label={`Texto alternativo de la foto ${index + 1}`}
                                error={errors[`images.${index}.alt_text`]}
                                className="min-w-0 flex-1"
                            >
                                <input
                                    id={`alt-${image.id}`}
                                    maxLength={255}
                                    value={texts[image.id] ?? ''}
                                    onChange={(event) => setTexts((previous) => ({ ...previous, [image.id]: event.target.value }))}
                                    className={INPUT_CLASS}
                                />
                            </LabeledField>
                        </li>
                    ))}
                </ul>
                <div className="flex justify-end">
                    <Button type="submit" className="h-11 gap-2 sm:h-10" disabled={saving}>
                        <Save className="size-4" aria-hidden="true" />
                        {saving ? 'Guardando...' : 'Guardar textos'}
                    </Button>
                </div>
            </form>
        </Section>
    );
}
