import { RoleForm } from '@/components/admin/role-form';
import { BACK_BUTTON, PILL } from '@/components/admin/styles';
import { type PermissionsByModule } from '@/components/settings/permission-matrix';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';

interface RoleData {
    id: number;
    name: string;
    description: string | null;
    data_scope: 'all' | 'branch' | 'own';
    is_system: boolean;
    permissions: string[];
}

export default function AdminTenantRoleEdit({
    tenant,
    role,
    permissionsByModule,
}: {
    tenant: { id: number; name: string };
    role: RoleData;
    permissionsByModule: PermissionsByModule;
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Negocios', href: '/admin/tenants' },
        { title: tenant.name, href: `/admin/tenants/${tenant.id}` },
        { title: 'Roles y permisos', href: `/admin/tenants/${tenant.id}/roles` },
        { title: role.name, href: `/admin/tenants/${tenant.id}/roles/${role.id}/edit` },
    ];

    const form = useForm({
        name: role.name,
        description: role.description ?? '',
        data_scope: (role.data_scope === 'own' ? 'branch' : role.data_scope) as 'all' | 'branch',
        permissions: role.permissions,
        _method: 'PUT',
    });

    const [selected, setSelected] = useState<Set<string>>(new Set(role.permissions));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.transform((data) => ({ ...data, permissions: [...selected] }));
        form.post(`/admin/tenants/${tenant.id}/roles/${role.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${role.name} · ${tenant.name}`} />
            <div className="flex flex-col gap-5 p-4 sm:p-6">
                <div className="flex items-start gap-3">
                    <Link href={`/admin/tenants/${tenant.id}/roles`} aria-label="Volver a roles" className={BACK_BUTTON}>
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h1 className="min-w-0 text-xl leading-tight font-bold break-words">Editar rol: {role.name}</h1>
                            {role.is_system && <span className={PILL}>del sistema</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">Para {tenant.name}.</p>
                    </div>
                </div>

                <RoleForm
                    values={form.data}
                    errors={form.errors}
                    processing={form.processing}
                    onChange={(patch) => form.setData((current) => ({ ...current, ...patch }))}
                    onSubmit={handleSubmit}
                    permissionsByModule={permissionsByModule}
                    selected={selected}
                    onSelectedChange={setSelected}
                    nameLocked={role.is_system}
                    submitLabel="Guardar cambios"
                    processingLabel="Guardando..."
                />
            </div>
        </AppLayout>
    );
}
