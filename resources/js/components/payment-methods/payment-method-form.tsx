import { StickyActions } from '@/components/admin/sticky-actions';
import { SwitchRow } from '@/components/products/product-fields';
import { FormPanel, INPUT_CLASS, LabeledField } from '@/components/sales/form-fields';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { Link } from '@inertiajs/react';
import { Loader2, Save } from 'lucide-react';
import { type FormEvent } from 'react';

export interface PaymentMethodFormData {
    name: string;
    code: string;
    description: string;
    is_active: boolean;
    sort_order: number;
}

interface PaymentMethodFormProps {
    data: PaymentMethodFormData;
    errors: Partial<Record<keyof PaymentMethodFormData, string>>;
    setData: <K extends keyof PaymentMethodFormData>(key: K, value: PaymentMethodFormData[K]) => void;
    processing: boolean;
    submitLabel: string;
    cancelHref: string;
    onSubmit: (event: FormEvent) => void;
}

/** One form for creating and editing a payment method: what it is, where it sits in the POS and whether it is offered. */
export function PaymentMethodForm({ data, errors, setData, processing, submitLabel, cancelHref, onSubmit }: PaymentMethodFormProps) {
    const onBrand = useOnBrandColor();

    return (
        <form onSubmit={onSubmit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="flex flex-col gap-5">
                <FormPanel title="Datos del método" description="Los campos marcados con * son obligatorios.">
                    <LabeledField id="name" label="Nombre" required error={errors.name}>
                        <input
                            id="name"
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Ej: Efectivo, Tarjeta de Crédito, Transferencia"
                            required
                            className={INPUT_CLASS}
                        />
                    </LabeledField>
                    <LabeledField id="code" label="Código" required error={errors.code}>
                        <input
                            id="code"
                            type="text"
                            value={data.code}
                            onChange={(e) => setData('code', e.target.value)}
                            placeholder="Ej: cash, credit_card, transfer"
                            required
                            className={INPUT_CLASS}
                        />
                        <p className="text-xs text-muted-foreground">
                            Código único para identificar el método de pago (solo letras, números y guiones bajos)
                        </p>
                    </LabeledField>
                    <LabeledField id="description" label="Descripción" error={errors.description} className="sm:col-span-2">
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Descripción opcional del método de pago"
                            rows={3}
                            className="text-base sm:text-sm"
                        />
                    </LabeledField>
                </FormPanel>
            </div>

            <div className="flex flex-col gap-5">
                <FormPanel title="En el POS">
                    <LabeledField id="sort_order" label="Orden de Aparición" error={errors.sort_order} className="sm:col-span-2">
                        <input
                            id="sort_order"
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={data.sort_order}
                            onChange={(e) => setData('sort_order', parseInt(e.target.value) || 0)}
                            className={INPUT_CLASS}
                        />
                        <p className="text-xs text-muted-foreground">Número que determina el orden de aparición en los listados (0 = primero)</p>
                    </LabeledField>
                    <SwitchRow
                        id="is_active"
                        title="Estado"
                        checked={data.is_active}
                        onCheckedChange={(checked) => setData('is_active', checked === true)}
                        label="Método de pago activo"
                        hint="Un método inactivo deja de ofrecerse al cobrar."
                        error={errors.is_active}
                    />
                </FormPanel>
            </div>

            <div className="lg:col-span-2">
                <StickyActions>
                    <Link href={cancelHref}>
                        <Button type="button" variant="outline" className="h-11 sm:h-10" disabled={processing}>
                            Cancelar
                        </Button>
                    </Link>
                    <button
                        type="submit"
                        disabled={processing}
                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 sm:h-10"
                        style={{ color: onBrand.hex }}
                    >
                        {processing ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
                        {submitLabel}
                    </button>
                </StickyActions>
            </div>
        </form>
    );
}
