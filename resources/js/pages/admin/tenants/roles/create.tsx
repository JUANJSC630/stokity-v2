import { RoleForm } from '@/components/admin/role-form';
import { BACK_BUTTON } from '@/components/admin/styles';
import { type PermissionsByModule } from '@/components/settings/permission-matrix';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';

export default function AdminTenantRoleCreate({
    tenant,
    permissionsByModule,
}: {
    tenant: { id: number; name: string };
    permissionsByModule: PermissionsByModule;
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Negocios', href: '/admin/tenants' },
        { title: tenant.name, href: `/admin/tenants/${tenant.id}` },
        { title: 'Roles y permisos', href: `/admin/tenants/${tenant.id}/roles` },
        { title: 'Nuevo rol', href: `/admin/tenants/${tenant.id}/roles/create` },
    ];

    const form = useForm({
        name: '',
        description: '',
        data_scope: 'branch' as 'all' | 'branch',
        permissions: [] as string[],
    });

    const [selected, setSelected] = useState<Set<string>>(new Set());

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.transform((data) => ({ ...data, permissions: [...selected] }));
        form.post(`/admin/tenants/${tenant.id}/roles`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Nuevo rol · ${tenant.name}`} />
            <div className="flex flex-col gap-5 p-4 sm:p-6">
                <div className="flex items-start gap-3">
                    <Link href={`/admin/tenants/${tenant.id}/roles`} aria-label="Volver a roles" className={BACK_BUTTON}>
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-xl leading-tight font-bold">Nuevo rol</h1>
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
                    submitLabel="Crear rol"
                    processingLabel="Creando..."
                />
            </div>
        </AppLayout>
    );
}
