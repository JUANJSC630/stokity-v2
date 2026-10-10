import { StickyActions } from '@/components/admin/sticky-actions';
import { SwitchRow } from '@/components/products/product-fields';
import { FormPanel, INPUT_CLASS, LabeledField, OptionSelect } from '@/components/sales/form-fields';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { type Branch } from '@/types';
import { Link } from '@inertiajs/react';
import { Loader2, Save } from 'lucide-react';
import { type FormEvent } from 'react';

export interface SupplierFormData {
    branch_id: string;
    name: string;
    nit: string;
    contact_name: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
    status: boolean;
}

interface SupplierFormProps {
    data: SupplierFormData;
    errors: Partial<Record<keyof SupplierFormData, string>>;
    setData: <K extends keyof SupplierFormData>(key: K, value: SupplierFormData[K]) => void;
    processing: boolean;
    branches: Branch[];
    submitLabel: string;
    cancelHref: string;
    onSubmit: (event: FormEvent) => void;
}

/** One form for creating and editing a supplier: data, contact and settings in panels, with the save bar fixed on phones. */
export function SupplierForm({ data, errors, setData, processing, branches, submitLabel, cancelHref, onSubmit }: SupplierFormProps) {
    const onBrand = useOnBrandColor();

    return (
        <form onSubmit={onSubmit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="flex flex-col gap-5">
                <FormPanel title="Datos del proveedor" description="Los campos marcados con * son obligatorios.">
                    <LabeledField id="name" label="Nombre / Razón social" required error={errors.name}>
                        <input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Distribuidora XYZ S.A.S."
                            required
                            className={INPUT_CLASS}
                        />
                    </LabeledField>
                    <LabeledField id="nit" label="NIT / RUT" error={errors.nit}>
                        <input
                            id="nit"
                            value={data.nit}
                            onChange={(e) => setData('nit', e.target.value)}
                            placeholder="900.123.456-7"
                            className={INPUT_CLASS}
                        />
                    </LabeledField>
                </FormPanel>

                <FormPanel title="Contacto">
                    <LabeledField id="contact_name" label="Nombre de contacto" error={errors.contact_name}>
                        <input
                            id="contact_name"
                            value={data.contact_name}
                            onChange={(e) => setData('contact_name', e.target.value)}
                            placeholder="Juan Pérez"
                            className={INPUT_CLASS}
                        />
                    </LabeledField>
                    <LabeledField id="phone" label="Teléfono" error={errors.phone}>
                        <input
                            id="phone"
                            type="tel"
                            inputMode="tel"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            placeholder="310 123 4567"
                            className={INPUT_CLASS}
                        />
                    </LabeledField>
                    <LabeledField id="email" label="Correo electrónico" error={errors.email}>
                        <input
                            id="email"
                            type="email"
                            inputMode="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="ventas@distribuidora.com"
                            className={INPUT_CLASS}
                        />
                    </LabeledField>
                    <LabeledField id="address" label="Dirección" error={errors.address}>
                        <input
                            id="address"
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                            placeholder="Cra 7 # 32-15, Bogotá"
                            className={INPUT_CLASS}
                        />
                    </LabeledField>
                </FormPanel>

                <FormPanel title="Notas">
                    <LabeledField id="notes" label="Notas" error={errors.notes} className="sm:col-span-2">
                        <Textarea
                            id="notes"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            placeholder="Términos de pago, observaciones, etc."
                            rows={4}
                            className="text-base sm:text-sm"
                        />
                    </LabeledField>
                </FormPanel>
            </div>

            <div className="flex flex-col gap-5">
                <FormPanel title="Configuración">
                    {branches.length > 1 && (
                        <LabeledField id="branch_id" label="Sucursal" required error={errors.branch_id} className="sm:col-span-2">
                            <OptionSelect
                                id="branch_id"
                                value={data.branch_id}
                                onValueChange={(value) => setData('branch_id', value)}
                                options={branches}
                                placeholder="Selecciona una sucursal"
                            />
                        </LabeledField>
                    )}
                    <SwitchRow
                        id="status"
                        title="Estado"
                        checked={data.status}
                        onCheckedChange={(checked) => setData('status', checked)}
                        label="Proveedor activo"
                        hint="Un proveedor inactivo deja de ofrecerse al registrar compras."
                    />
                </FormPanel>
            </div>

            <div className="lg:col-span-2">
                <StickyActions>
                    <Link href={cancelHref}>
                        <Button type="button" variant="outline" className="h-11 sm:h-10">
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
