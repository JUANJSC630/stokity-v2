import { initialsOf } from '@/components/admin/tenant-badges';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RoleBadge, UserStatusPill } from '@/components/users/user-meta';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/format';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Building2, CalendarPlus, LogIn, Mail, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';

type User = {
    id: number;
    name: string;
    email: string;
    role: string;
    status: boolean;
    photo_url?: string;
    uploaded_photo_url?: string | null;
    branch?: {
        id: number;
        name: string;
    };
    created_at: string;
    updated_at: string;
    last_login_at?: string;
};

interface Props {
    user: User;
}

interface PageProps {
    auth: {
        user: {
            id: number;
        };
    };
    [key: string]: unknown;
}

const initials = (name: string): string => initialsOf(name);

export default function ShowUser({ user }: Props) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [photoFailed, setPhotoFailed] = useState(false);
    const form = useForm({
        reason: '',
    });
    const pageProps = usePage<PageProps>().props;
    const authUserId = pageProps.auth?.user?.id;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Usuarios',
            href: '/users',
        },
        {
            title: user.name,
            href: `/users/${user.id}`,
        },
    ];

    const handleDelete = () => {
        form.delete(`/users/${user.id}`, {
            onSuccess: () => setIsDeleteDialogOpen(false),
        });
    };

    const activity = [
        { icon: CalendarPlus, label: 'Fecha de registro', value: formatDateTime(user.created_at) },
        { icon: RefreshCw, label: 'Última actualización', value: formatDateTime(user.updated_at) },
        { icon: LogIn, label: 'Último acceso', value: user.last_login_at ? formatDateTime(user.last_login_at) : '—' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Usuario: ${user.name}`} />
            <div className="mx-auto grid w-full max-w-5xl items-start gap-5 p-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:p-6">
                <aside className="rounded-2xl border border-border/60 bg-card p-5 text-center sm:p-6">
                    {user.uploaded_photo_url && !photoFailed ? (
                        <img
                            src={user.uploaded_photo_url}
                            alt={user.name}
                            onError={() => setPhotoFailed(true)}
                            className="mx-auto mb-4 size-24 rounded-full border border-border/60 object-cover"
                        />
                    ) : (
                        <div className="mx-auto mb-4 flex size-24 items-center justify-center rounded-full bg-[var(--brand-primary-soft)] text-2xl font-bold text-[var(--brand-primary)]">
                            {initials(user.name)}
                        </div>
                    )}
                    <h1 className="truncate text-lg font-bold">{user.name}</h1>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{user.email}</p>

                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <RoleBadge role={user.role} className="px-3 py-1.5" />
                        <UserStatusPill active={user.status} className="px-3 py-1.5" />
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-1">
                        <Link
                            href={`/users/${user.id}/edit`}
                            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border/60 bg-card px-3 text-sm font-medium transition-colors hover:bg-muted"
                        >
                            <Pencil className="size-4" aria-hidden="true" />
                            Editar usuario
                        </Link>
                        {user.id !== authUserId && (
                            <button
                                type="button"
                                onClick={() => setIsDeleteDialogOpen(true)}
                                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-card px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                            >
                                <Trash2 className="size-4" aria-hidden="true" />
                                Eliminar
                            </button>
                        )}
                    </div>
                </aside>

                <div className="flex flex-col gap-5">
                    <section className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
                        <h2 className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Información</h2>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {user.branch && (
                                <div className="flex items-start gap-3">
                                    <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                                    <div className="min-w-0">
                                        <p className="text-[11px] text-muted-foreground">Sucursal</p>
                                        <p className="truncate text-sm font-medium">{user.branch.name}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-start gap-3">
                                <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                                <div className="min-w-0">
                                    <p className="text-[11px] text-muted-foreground">Correo</p>
                                    <p className="truncate text-sm font-medium">{user.email}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
                        <h2 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Actividad de la cuenta</h2>
                        <div className="divide-y divide-border/40">
                            {activity.map(({ icon: Icon, label, value }) => (
                                <div key={label} className="flex items-center gap-3 py-3">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-[var(--brand-primary)]">
                                        <Icon className="size-4" aria-hidden="true" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium">{label}</p>
                                        <p className="text-xs text-muted-foreground">{value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>¿Eliminar este usuario?</DialogTitle>
                            <DialogDescription>
                                Esta acción no eliminará permanentemente al usuario, se realizará un "soft delete". El usuario será archivado y no
                                podrá acceder al sistema.
                            </DialogDescription>
                        </DialogHeader>

                        <div>
                            <label htmlFor="delete-reason" className="text-sm font-medium">
                                Razón de eliminación (opcional)
                            </label>
                            <textarea
                                id="delete-reason"
                                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-base sm:text-sm"
                                value={form.data.reason}
                                onChange={(e) => form.setData('reason', e.target.value)}
                                rows={3}
                            />
                        </div>

                        <DialogFooter>
                            <button
                                type="button"
                                onClick={() => setIsDeleteDialogOpen(false)}
                                disabled={form.processing}
                                className="h-11 rounded-xl border border-border/60 px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50 sm:h-10"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={form.processing}
                                className="h-11 rounded-xl bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 sm:h-10"
                            >
                                {form.processing ? 'Eliminando...' : 'Eliminar usuario'}
                            </button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
