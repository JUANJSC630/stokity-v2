import { StickyActions } from '@/components/admin/sticky-actions';
import { INPUT, PRIMARY_BUTTON } from '@/components/admin/styles';
import { PermissionMatrix, type PermissionsByModule } from '@/components/settings/permission-matrix';
import { Save } from 'lucide-react';

export interface RoleFormValues {
    name: string;
    description: string;
    data_scope: 'all' | 'branch';
}

interface RoleFormProps {
    values: RoleFormValues;
    errors: Partial<Record<'name' | 'description' | 'data_scope' | 'permissions', string>>;
    processing: boolean;
    onChange: (patch: Partial<RoleFormValues>) => void;
    onSubmit: (event: React.FormEvent) => void;
    permissionsByModule: PermissionsByModule;
    selected: Set<string>;
    onSelectedChange: (next: Set<string>) => void;
    nameLocked?: boolean;
    submitLabel: string;
    processingLabel: string;
}

const CARD = 'rounded-2xl border border-border/60 bg-card px-4 py-5 sm:px-6';

export function RoleForm({
    values,
    errors,
    processing,
    onChange,
    onSubmit,
    permissionsByModule,
    selected,
    onSelectedChange,
    nameLocked = false,
    submitLabel,
    processingLabel,
}: RoleFormProps) {
    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <div className={`${CARD} grid gap-4 sm:grid-cols-2`}>
                <div className="space-y-1.5">
                    <label htmlFor="name" className="text-xs font-medium">
                        Nombre
                    </label>
                    <input
                        id="name"
                        value={values.name}
                        onChange={(e) => onChange({ name: e.target.value })}
                        disabled={processing || nameLocked}
                        className={`${INPUT} disabled:opacity-50`}
                    />
                    {nameLocked && <p className="mt-1 text-xs text-muted-foreground">El nombre de un rol del sistema no se puede cambiar.</p>}
                    {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="data_scope" className="text-xs font-medium">
                        Alcance de datos
                    </label>
                    <select
                        id="data_scope"
                        value={values.data_scope}
                        onChange={(e) => onChange({ data_scope: e.target.value as RoleFormValues['data_scope'] })}
                        disabled={processing}
                        className={INPUT}
                    >
                        <option value="branch">Solo su sucursal</option>
                        <option value="all">Todas las sucursales</option>
                    </select>
                    {errors.data_scope && <p className="text-xs text-red-500">{errors.data_scope}</p>}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="description" className="text-xs font-medium">
                        Descripción (opcional)
                    </label>
                    <textarea
                        id="description"
                        value={values.description}
                        onChange={(e) => onChange({ description: e.target.value })}
                        disabled={processing}
                        rows={2}
                        className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-base focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none sm:text-sm"
                    />
                    {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
                </div>
            </div>

            <div className={CARD}>
                <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Permisos</p>
                <PermissionMatrix permissionsByModule={permissionsByModule} selected={selected} onChange={onSelectedChange} disabled={processing} />
                {errors.permissions && <p className="mt-2 text-xs text-red-500">{errors.permissions}</p>}
            </div>

            <StickyActions>
                <button type="submit" disabled={processing} className={`${PRIMARY_BUTTON} flex w-full items-center justify-center gap-1.5 sm:w-auto`}>
                    <Save className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    {processing ? processingLabel : submitLabel}
                </button>
            </StickyActions>
        </form>
    );
}
