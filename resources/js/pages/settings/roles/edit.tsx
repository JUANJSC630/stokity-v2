import { type PermissionsByModule } from '@/components/settings/permission-matrix';
import { RoleForm } from '@/components/settings/role-form';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

interface RoleData {
    id: number;
    name: string;
    description: string | null;
    data_scope: 'all' | 'branch' | 'own';
    is_system: boolean;
    permissions: string[];
}

export default function EditRole({ role, permissionsByModule }: { role: RoleData; permissionsByModule: PermissionsByModule }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Roles', href: '/settings/roles' },
        { title: role.name, href: `/settings/roles/${role.id}/edit` },
    ];

    const form = useForm({
        name: role.name,
        description: role.description ?? '',
        data_scope: role.data_scope === 'own' ? 'branch' : role.data_scope,
        permissions: role.permissions,
        _method: 'PUT',
    });

    const [selected, setSelected] = useState<Set<string>>(new Set(role.permissions));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.transform((data) => ({ ...data, permissions: [...selected] }));
        form.post(route('settings.roles.update', role.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar rol: ${role.name}`} />
            <SettingsLayout wide>
                <div className="flex items-start gap-3">
                    <Link
                        href={route('settings.roles.index')}
                        aria-label="Volver a roles"
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                    </Link>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold">Editar rol: {role.name}</h3>
                            {role.is_system && <Badge variant="secondary">del sistema</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">Ajusta el alcance de datos y qué puede hacer este rol</p>
                    </div>
                </div>

                <RoleForm
                    data={form.data}
                    errors={form.errors}
                    setData={form.setData}
                    processing={form.processing}
                    nameLocked={role.is_system}
                    permissionsByModule={permissionsByModule}
                    selected={selected}
                    onSelectedChange={setSelected}
                    submitLabel={form.processing ? 'Guardando...' : 'Guardar cambios'}
                    cancelHref={route('settings.roles.index')}
                    onSubmit={handleSubmit}
                />
            </SettingsLayout>
        </AppLayout>
    );
}
