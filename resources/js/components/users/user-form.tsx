import { StickyActions } from '@/components/admin/sticky-actions';
import { ImageUpload } from '@/components/image-upload';
import { SwitchRow } from '@/components/products/product-fields';
import { FormPanel, INPUT_CLASS, LabeledField } from '@/components/sales/form-fields';
import { Button } from '@/components/ui/button';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { type AssignableRole } from '@/types';
import { Link } from '@inertiajs/react';
import { Loader2, Save, UserCircle } from 'lucide-react';
import { type FormEvent } from 'react';

export interface UserFormData {
    name: string;
    email: string;
    role_id: number | '';
    branch_id: string;
    password: string;
    password_confirmation: string;
    status: boolean;
    photo: File | null;
}

interface UserFormProps {
    mode: 'create' | 'edit';
    data: UserFormData;
    errors: Partial<Record<keyof UserFormData, string>>;
    setData: <K extends keyof UserFormData>(key: K, value: UserFormData[K]) => void;
    processing: boolean;
    roles: AssignableRole[];
    branches: Array<{ id: number; name: string }>;
    showBranchField: boolean;
    onRoleChange: (roleId: number) => void;
    initialPhotoUrl?: string | null;
    submitLabel: string;
    cancelHref: string;
    onSubmit: (event: FormEvent) => void;
}

const SELECT_CLASS = `${INPUT_CLASS} disabled:cursor-not-allowed disabled:opacity-50`;

/** One form for creating and editing a user: person, account and the photo, with the save bar fixed on phones. */
export function UserForm({
    mode,
    data,
    errors,
    setData,
    processing,
    roles,
    branches,
    showBranchField,
    onRoleChange,
    initialPhotoUrl = null,
    submitLabel,
    cancelHref,
    onSubmit,
}: UserFormProps) {
    const onBrand = useOnBrandColor();
    const isEdit = mode === 'edit';
    return (
        <form onSubmit={onSubmit} className="grid items-start gap-5 lg:grid-cols-2">
            <FormPanel title="Información Personal">
                <ImageUpload
                    id="photo"
                    label="Foto"
                    shape="circle"
                    placeholderIcon={UserCircle}
                    file={data.photo}
                    currentUrl={initialPhotoUrl}
                    error={errors.photo}
                    onChange={(file) => setData('photo', file)}
                    className="sm:col-span-2"
                />

                <LabeledField id="name" label="Nombre" error={errors.name}>
                    <input
                        id="name"
                        type="text"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        aria-invalid={Boolean(errors.name)}
                        disabled={processing}
                        className={INPUT_CLASS}
                    />
                </LabeledField>
                <LabeledField id="email" label="Email" error={errors.email}>
                    <input
                        id="email"
                        type="email"
                        inputMode="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        aria-invalid={Boolean(errors.email)}
                        disabled={processing}
                        className={INPUT_CLASS}
                    />
                </LabeledField>
                <SwitchRow
                    id="status"
                    title="Estado"
                    checked={data.status}
                    onCheckedChange={(checked) => setData('status', checked)}
                    label={data.status ? 'Activo' : 'Inactivo'}
                    disabled={processing}
                />
            </FormPanel>

            <FormPanel title="Información de la Cuenta">
                <LabeledField id="role" label="Rol" error={errors.role_id} className="sm:col-span-2">
                    <select
                        id="role"
                        value={data.role_id}
                        onChange={(e) => onRoleChange(Number(e.target.value))}
                        aria-invalid={Boolean(errors.role_id)}
                        disabled={processing}
                        className={SELECT_CLASS}
                    >
                        {isEdit && data.role_id === '' && (
                            <option value="" disabled>
                                Selecciona un rol
                            </option>
                        )}
                        {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                                {role.name}
                            </option>
                        ))}
                    </select>
                </LabeledField>

                {showBranchField && (
                    <LabeledField id="branch_id" label="Sucursal" error={errors.branch_id} className="sm:col-span-2">
                        <select
                            id="branch_id"
                            value={data.branch_id}
                            onChange={(e) => setData('branch_id', e.target.value)}
                            aria-invalid={Boolean(errors.branch_id)}
                            disabled={processing}
                            className={SELECT_CLASS}
                        >
                            <option value="">{isEdit ? 'Sin sucursal asignada' : 'Seleccionar sucursal'}</option>
                            {branches.map((branch) => (
                                <option key={branch.id} value={String(branch.id)}>
                                    {branch.name}
                                </option>
                            ))}
                        </select>
                    </LabeledField>
                )}

                {isEdit && <p className="text-sm text-muted-foreground sm:col-span-2">Dejar en blanco para mantener la contraseña actual</p>}

                <LabeledField id="password" label={isEdit ? 'Nueva Contraseña' : 'Contraseña'} error={errors.password} className="sm:col-span-2">
                    <input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        aria-invalid={Boolean(errors.password)}
                        disabled={processing}
                        className={INPUT_CLASS}
                    />
                </LabeledField>
                <LabeledField
                    id="password_confirmation"
                    label={isEdit ? 'Confirmar Nueva Contraseña' : 'Confirmar Contraseña'}
                    className="sm:col-span-2"
                >
                    <input
                        id="password_confirmation"
                        type="password"
                        autoComplete="new-password"
                        value={data.password_confirmation}
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        disabled={processing}
                        className={INPUT_CLASS}
                    />
                </LabeledField>
            </FormPanel>

            <div className="lg:col-span-2">
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
            </div>
        </form>
    );
}
