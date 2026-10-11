import { type PermissionsByModule } from '@/components/settings/permission-matrix';
import { RoleForm } from '@/components/settings/role-form';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Roles', href: '/settings/roles' },
    { title: 'Nuevo rol', href: '/settings/roles/create' },
];

export default function CreateRole({ permissionsByModule }: { permissionsByModule: PermissionsByModule }) {
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
        form.post(route('settings.roles.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo rol" />
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
                        <h3 className="text-base font-semibold">Nuevo rol</h3>
                        <p className="text-sm text-muted-foreground">Define un nombre, el alcance de datos y qué puede hacer</p>
                    </div>
                </div>

                <RoleForm
                    data={form.data}
                    errors={form.errors}
                    setData={form.setData}
                    processing={form.processing}
                    permissionsByModule={permissionsByModule}
                    selected={selected}
                    onSelectedChange={setSelected}
                    submitLabel={form.processing ? 'Creando...' : 'Crear rol'}
                    cancelHref={route('settings.roles.index')}
                    onSubmit={handleSubmit}
                />
            </SettingsLayout>
        </AppLayout>
    );
}
