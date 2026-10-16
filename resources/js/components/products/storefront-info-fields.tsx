import { FormPanel, INPUT_CLASS, LabeledField, OptionSelect } from '@/components/sales/form-fields';
import { Textarea } from '@/components/ui/textarea';
import { NumberField } from './product-fields';

export type StorefrontInfoData = {
    material: string;
    dimensions: string;
    weight_grams: number | '';
    origin: string;
    manufacturing: string;
    care_instructions: string;
    color: string;
    style: string;
    seo_title: string;
    seo_description: string;
};

type TextKey = 'material' | 'dimensions' | 'origin' | 'color' | 'style' | 'seo_title' | 'seo_description' | 'care_instructions';

interface StorefrontInfoFieldsProps {
    data: StorefrontInfoData;
    errors: Partial<Record<keyof StorefrontInfoData, string>>;
    onChange: <K extends keyof StorefrontInfoData>(key: K, value: StorefrontInfoData[K]) => void;
}

/** Sentinel for "not specified": the select cannot hold an empty value. */
const NOT_SPECIFIED = 'none';

const MANUFACTURING_OPTIONS = [
    { id: NOT_SPECIFIED, name: 'Sin especificar' },
    { id: 'handmade', name: 'Hecho a mano' },
    { id: 'supplier', name: 'De proveedor' },
    { id: 'mixed', name: 'Mixto' },
];

export const emptyStorefrontInfo = (source?: Partial<Record<keyof StorefrontInfoData, string | number | null>>): StorefrontInfoData => ({
    material: (source?.material as string) ?? '',
    dimensions: (source?.dimensions as string) ?? '',
    weight_grams: (source?.weight_grams as number) ?? '',
    origin: (source?.origin as string) ?? '',
    manufacturing: (source?.manufacturing as string) ?? '',
    care_instructions: (source?.care_instructions as string) ?? '',
    color: (source?.color as string) ?? '',
    style: (source?.style as string) ?? '',
    seo_title: (source?.seo_title as string) ?? '',
    seo_description: (source?.seo_description as string) ?? '',
});

/**
 * What the law (Ley 1480, art. 50) and search engines want to know about each piece.
 * Everything is optional; the web store shows only what is filled in.
 */
export function StorefrontInfoFields({ data, errors, onChange }: StorefrontInfoFieldsProps) {
    const text = (key: TextKey, label: string, placeholder: string, maxLength: number, hint?: string) => (
        <LabeledField id={key} label={label} error={errors[key]}>
            <input
                id={key}
                placeholder={placeholder}
                maxLength={maxLength}
                value={data[key]}
                onChange={(event) => onChange(key, event.target.value)}
                className={INPUT_CLASS}
            />
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </LabeledField>
    );

    return (
        <FormPanel
            title="Información para la tienda web"
            description="Datos que la ley exige informar al cliente y textos para que Google encuentre el producto. Todo es opcional."
        >
            {text('material', 'Material', 'Ej: Acero inoxidable bañado en oro', 255)}
            {text('dimensions', 'Tamaño o medidas', 'Ej: Largo 18 cm, dije 2 cm', 255)}
            <NumberField
                id="weight_grams"
                label="Peso (gramos)"
                value={data.weight_grams}
                error={errors.weight_grams}
                placeholder="Ej: 12"
                hint="Hasta 100.000 g."
                onChange={(value) => onChange('weight_grams', value)}
            />
            {text('origin', 'Origen', 'Ej: Hecho a mano en Zarzal, Colombia', 255)}
            <LabeledField id="manufacturing" label="Modo de fabricación" error={errors.manufacturing}>
                <OptionSelect
                    id="manufacturing"
                    value={data.manufacturing === '' ? NOT_SPECIFIED : data.manufacturing}
                    onValueChange={(value) => onChange('manufacturing', value === NOT_SPECIFIED ? '' : value)}
                    options={MANUFACTURING_OPTIONS}
                    placeholder="Sin especificar"
                />
            </LabeledField>
            {text('color', 'Color', 'Ej: Dorado', 60)}
            {text('style', 'Estilo', 'Ej: Minimalista', 60)}
            <LabeledField id="care_instructions" label="Cuidados" error={errors.care_instructions} className="sm:col-span-2">
                <Textarea
                    id="care_instructions"
                    rows={3}
                    maxLength={1000}
                    placeholder="Ej: Evita el contacto con agua y perfumes."
                    value={data.care_instructions}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onChange('care_instructions', event.target.value)}
                    className="text-base sm:text-sm"
                />
            </LabeledField>
            {text('seo_title', 'Título para buscadores', 'Si lo dejas vacío se usa el nombre', 70, `${data.seo_title.length}/70 caracteres`)}
            <LabeledField id="seo_description" label="Descripción para buscadores" error={errors.seo_description}>
                <Textarea
                    id="seo_description"
                    rows={3}
                    maxLength={160}
                    placeholder="Resumen que aparece bajo el título en Google"
                    value={data.seo_description}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onChange('seo_description', event.target.value)}
                    className="text-base sm:text-sm"
                />
                <p className="text-xs text-muted-foreground">{data.seo_description.length}/160 caracteres</p>
            </LabeledField>
        </FormPanel>
    );
}
