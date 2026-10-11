import { StickyActions } from '@/components/admin/sticky-actions';
import InputError from '@/components/input-error';
import { FormPanel, INPUT_CLASS, LabeledField } from '@/components/sales/form-fields';
import { PermissionMatrix, type PermissionsByModule } from '@/components/settings/permission-matrix';
import { SettingsSection } from '@/components/settings/settings-section';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { Link } from '@inertiajs/react';
import { Loader2, Save } from 'lucide-react';
import { type FormEvent } from 'react';

export interface RoleFormData {
    name: string;
    description: string;
    data_scope: 'all' | 'branch';
}

interface RoleFormProps {
    data: RoleFormData;
    errors: Partial<Record<keyof RoleFormData | 'permissions', string>>;
    setData: <K extends keyof RoleFormData>(key: K, value: RoleFormData[K]) => void;
    processing: boolean;
    nameLocked?: boolean;
    permissionsByModule: PermissionsByModule;
    selected: Set<string>;
    onSelectedChange: (next: Set<string>) => void;
    submitLabel: string;
    cancelHref: string;
    onSubmit: (event: FormEvent) => void;
}

/** One form for creating and editing a role: name and data scope, then the permission matrix, with the save bar fixed on phones. */
export function RoleForm({
    data,
    errors,
    setData,
    processing,
    nameLocked = false,
    permissionsByModule,
    selected,
    onSelectedChange,
    submitLabel,
    cancelHref,
    onSubmit,
}: RoleFormProps) {
    const onBrand = useOnBrandColor();

    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <FormPanel title="Datos del rol">
                <LabeledField id="name" label="Nombre" error={errors.name}>
                    <input
                        id="name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        disabled={processing || nameLocked}
                        aria-invalid={Boolean(errors.name)}
                        className={INPUT_CLASS}
                    />
                    {nameLocked && <p className="text-xs text-muted-foreground">El nombre de un rol del sistema no se puede cambiar.</p>}
                </LabeledField>
                <LabeledField id="data_scope" label="Alcance de datos" error={errors.data_scope}>
                    <select
                        id="data_scope"
                        value={data.data_scope}
                        onChange={(e) => setData('data_scope', e.target.value as 'all' | 'branch')}
                        disabled={processing}
                        className={`${INPUT_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                        <option value="branch">Solo su sucursal</option>
                        <option value="all">Todas las sucursales</option>
                    </select>
                </LabeledField>
                <LabeledField id="description" label="Descripción (opcional)" error={errors.description} className="sm:col-span-2">
                    <Textarea
                        id="description"
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        disabled={processing}
                        rows={2}
                        className="text-base sm:text-sm"
                    />
                </LabeledField>
            </FormPanel>

            <SettingsSection title="Permisos" description="Marca lo que este rol puede hacer. Al elegir un permiso se activan los que necesita.">
                <PermissionMatrix permissionsByModule={permissionsByModule} selected={selected} onChange={onSelectedChange} disabled={processing} />
                <InputError message={errors.permissions} className="mt-2" />
            </SettingsSection>

            <StickyActions>
                <Link href={cancelHref}>
                    <Button type="button" variant="outline" className="h-11 sm:h-10">
                        Volver
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
        </form>
    );
}
