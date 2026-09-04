import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/format';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Building2, CalendarPlus, ChevronLeft, LogIn, Mail, Pencil, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';

type User = {
    id: number;
    name: string;
    email: string;
    role: string;
    status: boolean;
    photo_url?: string;
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

const ROLE_LABELS: Record<string, string> = {
    administrador: 'Administrador',
    encargado: 'Encargado',
    vendedor: 'Vendedor',
};

const ROLE_PILL_CLASS: Record<string, string> = {
    administrador: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
    encargado: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
    vendedor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
};

export default function ShowUser({ user }: Props) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Usuario: ${user.name}`} />
            <div className="flex h-full flex-1 flex-col gap-5 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/users"
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                        <img
                            src={user.photo_url || '/stokity-icon.png'}
                            alt={user.name}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = '/stokity-icon.png';
                            }}
                            className="h-11 w-11 flex-shrink-0 rounded-full border border-border/60 object-cover"
                        />
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="truncate text-xl leading-tight font-bold">{user.name}</h1>
                                <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ROLE_PILL_CLASS[user.role] ?? 'bg-muted text-muted-foreground'}`}
                                >
                                    {ROLE_LABELS[user.role] ?? user.role}
                                </span>
                                <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                        user.status
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                            : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                                    }`}
                                >
                                    <span className={`h-1.5 w-1.5 rounded-full ${user.status ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    {user.status ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                    </div>
                    <div className="flex flex-shrink-0 gap-2">
                        <Link
                            href={`/users/${user.id}/edit`}
                            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                        </Link>
                        {/* Botón de eliminar solo si el usuario mostrado NO es el auth */}
                        {user.id !== authUserId && (
                            <button
                                onClick={() => setIsDeleteDialogOpen(true)}
                                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-card px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Eliminar
                            </button>
                        )}
                    </div>
                </div>

                {/* Info card */}
                <div className="rounded-xl border border-border/60 bg-card px-5 py-4">
                    <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Información</p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
                        <div className="flex items-start gap-2">
                            <Mail className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
                            <div className="min-w-0">
                                <p className="text-[11px] text-muted-foreground">Correo</p>
                                <p className="truncate text-xs font-medium">{user.email}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
                            <div className="min-w-0">
                                <p className="text-[11px] text-muted-foreground">Rol</p>
                                <p className="truncate text-xs font-medium">{ROLE_LABELS[user.role] ?? user.role}</p>
                            </div>
                        </div>
                        {user.branch && (
                            <div className="flex items-start gap-2">
                                <Building2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
                                <div className="min-w-0">
                                    <p className="text-[11px] text-muted-foreground">Sucursal</p>
                                    <p className="truncate text-xs font-medium">{user.branch.name}</p>
                                </div>
                            </div>
                        )}
                        <div className="flex items-start gap-2">
                            <CalendarPlus className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
                            <div className="min-w-0">
                                <p className="text-[11px] text-muted-foreground">Fecha de registro</p>
                                <p className="truncate text-xs font-medium">{formatDateTime(user.created_at)}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <RefreshCw className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
                            <div className="min-w-0">
                                <p className="text-[11px] text-muted-foreground">Última actualización</p>
                                <p className="truncate text-xs font-medium">{formatDateTime(user.updated_at)}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <LogIn className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
                            <div className="min-w-0">
                                <p className="text-[11px] text-muted-foreground">Último acceso</p>
                                <p className="truncate text-xs font-medium">
                                    {user.last_login_at ? formatDateTime(user.last_login_at) : '—'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Delete Dialog */}
                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>¿Eliminar este usuario?</DialogTitle>
                            <DialogDescription>
                                Esta acción no eliminará permanentemente al usuario, se realizará un "soft delete". El usuario será archivado y no
                                podrá acceder al sistema.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Razón de eliminación (opcional)</label>
                                <textarea
                                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    value={form.data.reason}
                                    onChange={(e) => form.setData('reason', e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <button
                                onClick={() => setIsDeleteDialogOpen(false)}
                                disabled={form.processing}
                                className="rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={form.processing}
                                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
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
