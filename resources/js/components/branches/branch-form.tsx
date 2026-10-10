import { StickyActions } from '@/components/admin/sticky-actions';
import { SwitchRow } from '@/components/products/product-fields';
import { FormPanel, INPUT_CLASS, LabeledField, OptionSelect } from '@/components/sales/form-fields';
import { Button } from '@/components/ui/button';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { type User } from '@/types';
import { Link } from '@inertiajs/react';
import { Loader2, Save } from 'lucide-react';
import { type FormEvent } from 'react';

export interface BranchFormData {
    name: string;
    address: string;
    phone: string;
    email: string;
    business_name?: string;
    status: boolean;
    manager_id: string;
}

interface BranchFormProps {
    mode: 'create' | 'edit';
    data: BranchFormData;
    errors: Partial<Record<keyof BranchFormData, string>>;
    setData: <K extends keyof BranchFormData>(key: K, value: BranchFormData[K]) => void;
    processing: boolean;
    managers: User[];
    submitLabel: string;
    cancelHref: string;
    onSubmit: (event: FormEvent) => void;
}

/** One form for creating and editing a branch: identity, contact and who runs it, with the save bar fixed on phones. */
export function BranchForm({ mode, data, errors, setData, processing, managers, submitLabel, cancelHref, onSubmit }: BranchFormProps) {
    const onBrand = useOnBrandColor();
    const isEdit = mode === 'edit';

    return (
        <form onSubmit={onSubmit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="flex flex-col gap-5">
                <FormPanel title="Información de la Sucursal" description="Los campos marcados con * son obligatorios.">
                    <LabeledField id="name" label="Nombre de la sucursal" required error={errors.name}>
                        <input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            aria-invalid={Boolean(errors.name)}
                            className={INPUT_CLASS}
                        />
                    </LabeledField>
                    <LabeledField id="phone" label="Teléfono" required error={errors.phone}>
                        <input
                            id="phone"
                            type="tel"
                            inputMode="tel"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            aria-invalid={Boolean(errors.phone)}
                            className={INPUT_CLASS}
                        />
                    </LabeledField>
                    <LabeledField id="address" label="Dirección" required error={errors.address} className="sm:col-span-2">
                        <input
                            id="address"
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                            aria-invalid={Boolean(errors.address)}
                            className={INPUT_CLASS}
                        />
                    </LabeledField>
                    {isEdit && (
                        <LabeledField id="business_name" label="Nombre comercial" error={errors.business_name} className="sm:col-span-2">
                            <input
                                id="business_name"
                                value={data.business_name ?? ''}
                                onChange={(e) => setData('business_name', e.target.value)}
                                aria-invalid={Boolean(errors.business_name)}
                                className={INPUT_CLASS}
                            />
                        </LabeledField>
                    )}
                    <LabeledField id="email" label="Correo electrónico" error={errors.email} className="sm:col-span-2">
                        <input
                            id="email"
                            type="email"
                            inputMode="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            aria-invalid={Boolean(errors.email)}
                            className={INPUT_CLASS}
                        />
                    </LabeledField>
                </FormPanel>
            </div>

            <div className="flex flex-col gap-5">
                <FormPanel title="Responsable y estado">
                    <LabeledField id="manager_id" label="Gerente / Responsable" error={errors.manager_id} className="sm:col-span-2">
                        <OptionSelect
                            id="manager_id"
                            value={data.manager_id}
                            onValueChange={(value) => setData('manager_id', value)}
                            options={[{ id: 'none', name: 'Ninguno' }, ...managers.map((manager) => ({ id: manager.id, name: manager.name }))]}
                            placeholder="Seleccionar encargado"
                        />
                        {managers.length === 0 ? (
                            <p className="text-xs text-amber-600 dark:text-amber-400">No hay encargados o administradores registrados aún.</p>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                {isEdit
                                    ? 'Usuarios con rol de "Encargado" o "Administrador" pueden ser responsables de una sucursal'
                                    : 'Solo usuarios con rol de "Encargado" pueden ser asignados como responsables de una sucursal'}
                            </p>
                        )}
                    </LabeledField>
                    <SwitchRow
                        id="status"
                        title="Estado"
                        checked={data.status}
                        onCheckedChange={(checked) => setData('status', checked)}
                        label={data.status ? 'Activa' : 'Inactiva'}
                        disabled={processing}
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
