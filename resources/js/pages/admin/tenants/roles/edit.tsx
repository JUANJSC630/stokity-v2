import { PermissionMatrix, type PermissionsByModule } from '@/components/settings/permission-matrix';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronLeft, Save } from 'lucide-react';
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
        data_scope: role.data_scope === 'own' ? 'branch' : role.data_scope,
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
            <div className="flex flex-col gap-5 p-6">
                <div className="flex items-center gap-3">
                    <Link
                        href={`/admin/tenants/${tenant.id}/roles`}
                        aria-label="Volver a roles"
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <div>
                            <h1 className="text-xl leading-tight font-bold">Editar rol: {role.name}</h1>
                            <p className="text-xs text-muted-foreground">Para {tenant.name}.</p>
                        </div>
                        {role.is_system && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">del sistema</span>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="grid gap-4 rounded-2xl border border-border/60 bg-card px-6 py-5 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="name" className="text-xs font-medium">
                                Nombre
                            </label>
                            <input
                                id="name"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                disabled={form.processing || role.is_system}
                                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none disabled:opacity-50"
                            />
                            {role.is_system && <p className="mt-1 text-xs text-muted-foreground">El nombre de un rol del sistema no se puede cambiar.</p>}
                            {form.errors.name && <p className="text-xs text-red-500">{form.errors.name}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="data_scope" className="text-xs font-medium">
                                Alcance de datos
                            </label>
                            <select
                                id="data_scope"
                                value={form.data.data_scope}
                                onChange={(e) => form.setData('data_scope', e.target.value as 'all' | 'branch')}
                                disabled={form.processing}
                                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
                            >
                                <option value="branch">Solo su sucursal</option>
                                <option value="all">Todas las sucursales</option>
                            </select>
                            {form.errors.data_scope && <p className="text-xs text-red-500">{form.errors.data_scope}</p>}
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <label htmlFor="description" className="text-xs font-medium">
                                Descripción (opcional)
                            </label>
                            <textarea
                                id="description"
                                value={form.data.description}
                                onChange={(e) => form.setData('description', e.target.value)}
                                disabled={form.processing}
                                rows={2}
                                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
                            />
                            {form.errors.description && <p className="text-xs text-red-500">{form.errors.description}</p>}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-card px-6 py-5">
                        <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Permisos</p>
                        <PermissionMatrix
                            permissionsByModule={permissionsByModule}
                            selected={selected}
                            onChange={setSelected}
                            disabled={form.processing}
                        />
                        {form.errors.permissions && <p className="mt-2 text-xs text-red-500">{form.errors.permissions}</p>}
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
                        >
                            <Save className="h-3.5 w-3.5" />
                            {form.processing ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
