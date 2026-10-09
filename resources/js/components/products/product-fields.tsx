import { INPUT_CLASS, LabeledField } from '@/components/sales/form-fields';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Switch } from '@/components/ui/switch';
import { prepareImageForUpload } from '@/lib/image-upload';
import { cn } from '@/lib/utils';
import { ImagePlus, Package, Wrench } from 'lucide-react';
import { useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react';

type ProductKind = 'producto' | 'servicio';

/** Choose between a stocked product and a service (no stock, optional variable price). */
export function TypeSwitch({ value, onChange }: { value: ProductKind; onChange: (type: ProductKind) => void }) {
    const options = [
        { type: 'producto' as const, label: 'Producto', hint: 'Con stock', icon: Package },
        { type: 'servicio' as const, label: 'Servicio', hint: 'Sin stock', icon: Wrench },
    ];

    return (
        <div className="grid grid-cols-2 gap-2 sm:col-span-2">
            {options.map(({ type, label, hint, icon: Icon }) => (
                <button
                    key={type}
                    type="button"
                    aria-pressed={value === type}
                    onClick={() => onChange(type)}
                    className={cn(
                        'flex min-h-14 items-center gap-3 rounded-xl border px-4 text-left transition-colors',
                        value === type
                            ? 'border-[var(--brand-primary)]/50 bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]'
                            : 'border-border/60 bg-card text-muted-foreground hover:bg-muted',
                    )}
                >
                    <Icon className="size-5 shrink-0" aria-hidden="true" />
                    <span className="flex flex-col">
                        <span className="text-sm font-semibold">{label}</span>
                        <span className="text-xs opacity-80">{hint}</span>
                    </span>
                </button>
            ))}
        </div>
    );
}

interface ImageFieldProps {
    /** Address of the image already saved, shown until a new one is picked. */
    initialPreview?: string | null;
    error?: string;
    onChange: (file: File | null) => void;
}

/** Tap (or drop a file) to pick the photo; big photos are fitted before they are kept. */
export function ImageField({ initialPreview = null, error, onChange }: ImageFieldProps) {
    const [preview, setPreview] = useState<string | null>(initialPreview);
    const [isDragging, setIsDragging] = useState(false);

    const keep = async (picked: File | null) => {
        const file = picked ? await prepareImageForUpload(picked) : null;
        onChange(file);

        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setPreview(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => keep(event.target.files?.[0] || null);

    const handleDrop = async (event: DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        setIsDragging(false);
        const dropped = event.dataTransfer.files?.[0];
        if (dropped && dropped.type.startsWith('image/')) {
            await keep(dropped);
        }
    };

    return (
        <div className="space-y-2 sm:col-span-2">
            <label
                htmlFor="image"
                onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                }}
                onDrop={handleDrop}
                className={cn(
                    'group relative flex aspect-[4/3] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted/50 transition-colors hover:border-[var(--brand-primary)]',
                    isDragging ? 'border-[var(--brand-primary)]' : 'border-border',
                )}
            >
                {preview ? (
                    <img src={preview} alt="Vista previa" className="size-full object-cover" />
                ) : (
                    <span className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ImagePlus className="size-8" strokeWidth={1.5} aria-hidden="true" />
                        <span className="text-sm font-medium">Sin imagen</span>
                    </span>
                )}
                <span className="absolute bottom-3 left-1/2 flex h-10 -translate-x-1/2 items-center gap-2 rounded-lg bg-background/90 px-3 text-xs font-medium shadow backdrop-blur">
                    <ImagePlus className="size-4" aria-hidden="true" />
                    {preview ? 'Cambiar imagen' : 'Subir imagen'}
                </span>
                <input id="image" type="file" className="sr-only" accept="image/*" onChange={handleChange} />
            </label>
            {error && (
                <p role="alert" className="text-xs text-red-500">
                    {error}
                </p>
            )}
            <p className="text-xs text-muted-foreground">JPG, PNG o GIF. Las fotos grandes se ajustan solas antes de subirse.</p>
        </div>
    );
}

interface MoneyFieldProps {
    id: string;
    label: string;
    value: number;
    onChange: (value: number) => void;
    hint?: string;
    error?: string;
    required?: boolean;
}

/** Pesos amount with the `$` sign inside the box; typed digits are grouped as they go. */
export function MoneyField({ id, label, value, onChange, hint, error, required }: MoneyFieldProps) {
    return (
        <LabeledField id={id} label={label} required={required} error={error}>
            <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">$</span>
                <CurrencyInput id={id} className={cn(INPUT_CLASS, 'pl-7')} value={value} onChange={onChange} />
            </div>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </LabeledField>
    );
}

interface TaxFieldProps {
    value: number;
    error?: string;
    onInput: (value: number) => void;
    onToggle: () => void;
    hint: string;
}

/** Tax percentage with a one-tap switch between 19% and 0%. */
export function TaxField({ value, error, onInput, onToggle, hint }: TaxFieldProps) {
    return (
        <LabeledField id="tax" label="Impuesto (%)" required error={error}>
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <input
                        id="tax"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="0"
                        className={cn(INPUT_CLASS, 'pr-8')}
                        value={value}
                        onChange={(event) => onInput(Number(event.target.value))}
                        onFocus={(event) => event.target.select()}
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">%</span>
                </div>
                <button
                    type="button"
                    onClick={onToggle}
                    title={value === 19 ? 'Poner IVA en 0%' : 'Poner IVA en 19%'}
                    className={cn(
                        'h-11 shrink-0 rounded-lg border px-3 text-xs font-medium whitespace-nowrap transition-colors sm:h-9',
                        value === 19
                            ? 'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
                            : 'border-border/60 bg-muted text-muted-foreground hover:bg-muted/70',
                    )}
                >
                    {value === 19 ? 'Sin IVA (0%)' : 'IVA 19%'}
                </button>
            </div>
            <p className="text-xs text-muted-foreground">{hint}</p>
        </LabeledField>
    );
}

interface SwitchRowProps {
    id: string;
    title: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    /** What the switch says in each position. */
    label: string;
    hint?: string;
    disabled?: boolean;
    error?: string;
    children?: ReactNode;
}

/** A labeled on/off row with a 44 px touch target; the label states the current meaning. */
export function SwitchRow({ id, title, checked, onCheckedChange, label, hint, disabled, error }: SwitchRowProps) {
    return (
        <div className="space-y-2 sm:col-span-2">
            <p className="text-xs font-medium">{title}</p>
            <div className="flex min-h-11 items-center gap-3 rounded-xl border border-border/60 px-4 py-2">
                <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
                <label htmlFor={id} className="flex-1 text-sm">
                    {label}
                </label>
            </div>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            {error && (
                <p role="alert" className="text-xs text-red-500">
                    {error}
                </p>
            )}
        </div>
    );
}

export function NumberField({
    id,
    label,
    value,
    onChange,
    placeholder,
    hint,
    error,
    required,
}: {
    id: string;
    label: string;
    value: number | '';
    onChange: (value: number | '') => void;
    placeholder?: string;
    hint?: string;
    error?: string;
    required?: boolean;
}) {
    return (
        <LabeledField id={id} label={label} required={required} error={error}>
            <input
                id={id}
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                placeholder={placeholder}
                value={value}
                onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))}
                onFocus={(event) => event.target.select()}
                className={INPUT_CLASS}
            />
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </LabeledField>
    );
}
