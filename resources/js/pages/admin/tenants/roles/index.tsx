import { BACK_BUTTON, DANGER_BUTTON, OUTLINE_ACTION, PILL, SECONDARY_BUTTON } from '@/components/admin/styles';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, KeyRound, Pencil, Plus, ShieldCheck, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface RoleRow {
    id: number;
    name: string;
    description: string | null;
    data_scope: 'all' | 'branch' | 'own';
    is_system: boolean;
    is_default: boolean;
    permissions_count: number;
    users_count: number;
}

const DATA_SCOPE_LABELS: Record<RoleRow['data_scope'], string> = {
    all: 'Todas las sucursales',
    branch: 'Su sucursal',
    own: 'Solo lo suyo',
};

const DELETE_ICON_BUTTON =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-card text-red-600 transition-colors hover:bg-red-50 sm:h-9 sm:w-9 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30';

export default function AdminTenantRolesIndex({ tenant, roles }: { tenant: { id: number; name: string }; roles: RoleRow[] }) {
    const [roleToDelete, setRoleToDelete] = useState<RoleRow | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Negocios', href: '/admin/tenants' },
        { title: tenant.name, href: `/admin/tenants/${tenant.id}` },
        { title: 'Roles y permisos', href: `/admin/tenants/${tenant.id}/roles` },
    ];

    const handleDelete = () => {
        if (!roleToDelete) return;
        router.delete(`/admin/tenants/${tenant.id}/roles/${roleToDelete.id}`, {
            onSuccess: () => setRoleToDelete(null),
            onError: (errors) => {
                toast.error(errors.role ?? 'No se pudo eliminar el rol.');
                setRoleToDelete(null);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Roles de ${tenant.name}`} />
            <div className="flex flex-col gap-5 p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <Link href={`/admin/tenants/${tenant.id}`} aria-label="Volver al negocio" className={BACK_BUTTON}>
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                        <div className="min-w-0">
                            <h1 className="text-xl leading-tight font-bold break-words">Roles de {tenant.name}</h1>
                            <p className="text-xs text-muted-foreground">Edita los roles y permisos de este negocio.</p>
                        </div>
                    </div>
                    <Link
                        href={`/admin/tenants/${tenant.id}/roles/create`}
                        className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:h-9 sm:px-3 sm:text-xs"
                    >
                        <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        Nuevo rol
                    </Link>
                </div>

                {roles.length === 0 ? (
                    <p className="rounded-2xl border border-border/60 bg-card px-6 py-10 text-center text-sm text-muted-foreground">
                        Sin roles todavía.
                    </p>
                ) : (
                    <>
                        <ul
                            aria-label={`${roles.length} rol(es)`}
                            className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/60 bg-card md:hidden"
                        >
                            {roles.map((role) => (
                                <li key={role.id} className="flex flex-col gap-3 p-4">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <p className="min-w-0 text-[15px] leading-tight font-semibold break-words">{role.name}</p>
                                            {role.is_system && <span className={PILL}>del sistema</span>}
                                        </div>
                                        {role.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{role.description}</p>}
                                        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                                {DATA_SCOPE_LABELS[role.data_scope]}
                                            </span>
                                            <span className="flex items-center gap-1 tabular-nums">
                                                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                                                {role.permissions_count} permisos
                                            </span>
                                            <span className="flex items-center gap-1 tabular-nums">
                                                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                                                {role.users_count} usuario(s)
                                            </span>
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Link
                                            href={`/admin/tenants/${tenant.id}/roles/${role.id}/edit`}
                                            aria-label={`Editar rol ${role.name}`}
                                            className={`${OUTLINE_ACTION} flex-1`}
                                        >
                                            <Pencil className="h-4 w-4" />
                                            Editar
                                        </Link>
                                        {!role.is_system && (
                                            <button
                                                aria-label={`Eliminar rol ${role.name}`}
                                                onClick={() => setRoleToDelete(role)}
                                                className={DELETE_ICON_BUTTON}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <div className="hidden overflow-hidden rounded-2xl border border-border/60 bg-card md:block">
                            <div className="flex items-center gap-2 border-b border-border/60 px-6 py-4">
                                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{roles.length} rol(es)</p>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border/60 text-left text-[11px] text-muted-foreground uppercase">
                                        <th className="px-6 py-2.5 font-medium">Rol</th>
                                        <th className="px-3 py-2.5 font-medium">Alcance</th>
                                        <th className="px-3 py-2.5 font-medium">Permisos</th>
                                        <th className="px-3 py-2.5 font-medium">Usuarios</th>
                                        <th className="px-6 py-2.5 text-right font-medium">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {roles.map((role) => (
                                        <tr key={role.id} className="transition-colors hover:bg-muted/30">
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{role.name}</span>
                                                    {role.is_system && <span className={PILL}>del sistema</span>}
                                                </div>
                                                {role.description && <p className="mt-0.5 text-xs text-muted-foreground">{role.description}</p>}
                                            </td>
                                            <td className="px-3 py-3 text-muted-foreground">{DATA_SCOPE_LABELS[role.data_scope]}</td>
                                            <td className="px-3 py-3 text-muted-foreground tabular-nums">{role.permissions_count}</td>
                                            <td className="px-3 py-3 text-muted-foreground">
                                                <span className="inline-flex items-center gap-1 tabular-nums">
                                                    <Users className="h-3.5 w-3.5" />
                                                    {role.users_count}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        href={`/admin/tenants/${tenant.id}/roles/${role.id}/edit`}
                                                        aria-label={`Editar rol ${role.name}`}
                                                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Link>
                                                    {!role.is_system && (
                                                        <button
                                                            aria-label={`Eliminar rol ${role.name}`}
                                                            onClick={() => setRoleToDelete(role)}
                                                            className={DELETE_ICON_BUTTON}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            <Dialog open={roleToDelete !== null} onOpenChange={(open) => !open && setRoleToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eliminar rol</DialogTitle>
                        <DialogDescription>
                            ¿Eliminar el rol «{roleToDelete?.name}»? Esta acción no se puede deshacer.
                            {roleToDelete && roleToDelete.users_count > 0 && (
                                <span className="mt-2 block text-red-500">
                                    Tiene {roleToDelete.users_count} usuario(s) asignado(s) — reasígnalos antes de eliminarlo.
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <button onClick={() => setRoleToDelete(null)} className={SECONDARY_BUTTON}>
                            Cancelar
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={!!roleToDelete && roleToDelete.users_count > 0}
                            className={`${DANGER_BUTTON} disabled:pointer-events-none disabled:opacity-50`}
                        >
                            Eliminar
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
