import { UserForm } from '@/components/users/user-form';
import { useScrollToError } from '@/hooks/use-scroll-to-error';
import AppLayout from '@/layouts/app-layout';
import { type AssignableRole, type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

type Branch = {
    id: number;
    name: string;
};

type User = {
    id: number;
    name: string;
    email: string;
    role: string;
    status: boolean;
    photo_url?: string;
    photo?: string;
    branch_id?: number;
    branch?: {
        id: number;
        name: string;
    };
};

interface Props {
    branches: Branch[];
    user: User;
    roles: AssignableRole[];
    currentRoleId: number | null;
}

export default function EditUser({ user, branches, roles, currentRoleId }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Usuarios',
            href: '/users',
        },
        {
            title: user.name,
            href: `/users/${user.id}`,
        },
        {
            title: 'Editar',
            href: `/users/${user.id}/edit`,
        },
    ];

    const form = useForm({
        name: user.name,
        email: user.email,
        // Never default to roles[0] — is_system roles sort first and
        // "Administrador" sorts first among those, so a user with no role
        // assigned (a data-integrity edge case, not the common path) would
        // silently pre-select full admin and grant it on any unrelated
        // save. Leave it empty instead — role_id is required server-side,
        // so the form can't submit without the admin explicitly choosing.
        role_id: currentRoleId ?? ('' as number | ''),
        branch_id: user.branch_id ? String(user.branch_id) : '',
        password: '',
        password_confirmation: '',
        status: user.status,
        photo: null as File | null,
        _method: 'PUT',
    });

    useScrollToError(form.errors);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(`/users/${user.id}`, {
            forceFormData: true,
            onSuccess: () => toast.success('Usuario actualizado correctamente.'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar: ${user.name}`} />
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex items-start gap-3">
                    <Link
                        href={`/users/${user.id}`}
                        aria-label="Volver al usuario"
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Editar Usuario</h1>
                        <p className="truncate text-sm text-muted-foreground">{user.name}</p>
                    </div>
                </div>

                <UserForm
                    mode="edit"
                    data={form.data}
                    errors={form.errors}
                    setData={form.setData}
                    processing={form.processing}
                    roles={roles}
                    branches={branches}
                    showBranchField
                    onRoleChange={(roleId) => form.setData('role_id', roleId)}
                    initialPhotoUrl={user.photo_url || null}
                    submitLabel={form.processing ? 'Guardando...' : 'Guardar Cambios'}
                    cancelHref={`/users/${user.id}`}
                    onSubmit={handleSubmit}
                />
            </div>
        </AppLayout>
    );
}
