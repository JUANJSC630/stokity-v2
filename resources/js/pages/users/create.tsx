import { UserForm } from '@/components/users/user-form';
import { useScrollToError } from '@/hooks/use-scroll-to-error';
import AppLayout from '@/layouts/app-layout';
import { type AssignableRole, type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

type Branch = {
    id: number;
    name: string;
};

interface Props {
    branches: Branch[];
    roles: AssignableRole[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Usuarios',
        href: '/users',
    },
    {
        title: 'Crear Usuario',
        href: '/users/create',
    },
];

export default function CreateUser({ branches, roles }: Props) {
    const defaultRoleId = roles.find((r) => r.name === 'Vendedor')?.id ?? roles[0]?.id ?? '';

    const form = useForm<{
        name: string;
        email: string;
        role_id: number | '';
        branch_id: string;
        password: string;
        password_confirmation: string;
        status: boolean;
        photo: File | null;
    }>({
        name: '',
        email: '',
        role_id: defaultRoleId,
        branch_id: '',
        password: '',
        password_confirmation: '',
        status: true,
        photo: null,
    });

    useScrollToError(form.errors);

    // El campo de sucursal solo aplica a roles que no ven todas las sucursales.
    const [showBranchField, setShowBranchField] = useState(() => roles.find((r) => r.id === defaultRoleId)?.data_scope !== 'all');

    const handleRoleChange = (newRoleId: number) => {
        form.setData('role_id', newRoleId);

        const selectedRole = roles.find((r) => r.id === newRoleId);
        if (selectedRole?.data_scope === 'all') {
            setShowBranchField(false);
            form.setData('branch_id', '');
        } else {
            setShowBranchField(true);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/users', {
            forceFormData: true, // Forzar el uso de FormData para manejar archivos correctamente
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Usuario" />
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex items-start gap-3">
                    <Link
                        href="/users"
                        aria-label="Volver a usuarios"
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Crear Nuevo Usuario</h1>
                        <p className="text-sm text-muted-foreground">
                            Da acceso a una persona de tu equipo con el rol y la sucursal que le corresponden.
                        </p>
                    </div>
                </div>

                <UserForm
                    mode="create"
                    data={form.data}
                    errors={form.errors}
                    setData={form.setData}
                    processing={form.processing}
                    roles={roles}
                    branches={branches}
                    showBranchField={showBranchField}
                    onRoleChange={handleRoleChange}
                    submitLabel={form.processing ? 'Creando...' : 'Crear Usuario'}
                    cancelHref="/users"
                    onSubmit={handleSubmit}
                />
            </div>
        </AppLayout>
    );
}
