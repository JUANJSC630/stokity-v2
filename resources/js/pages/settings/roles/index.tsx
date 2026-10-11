import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Edit2, Plus, Trash2, Users } from 'lucide-react';
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

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Roles', href: '/settings/roles' }];

const DATA_SCOPE_LABELS: Record<RoleRow['data_scope'], string> = {
    all: 'Todas las sucursales',
    branch: 'Su sucursal',
    own: 'Solo lo suyo',
};

const iconButton =
    'flex size-11 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:size-9 sm:border-transparent';

export default function RolesIndex({ roles }: { roles: RoleRow[] }) {
    const [roleToDelete, setRoleToDelete] = useState<RoleRow | null>(null);
    const isWide = useMediaQuery('(min-width: 768px)');
    const onBrand = useOnBrandColor();

    const handleDelete = () => {
        if (!roleToDelete) return;
        router.delete(route('settings.roles.destroy', roleToDelete.id), {
            onSuccess: () => setRoleToDelete(null),
            onError: (errors) => {
                toast.error(errors.role ?? 'No se pudo eliminar el rol.');
                setRoleToDelete(null);
            },
        });
    };

    const actions = (role: RoleRow) => (
        <div className="flex justify-end gap-1">
            <Link href={route('settings.roles.edit', role.id)} aria-label="Editar" title="Editar" className={iconButton}>
                <Edit2 className="size-4" />
            </Link>
            {!role.is_system && (
                <button
                    type="button"
                    aria-label="Eliminar"
                    title="Eliminar"
                    className={cn(iconButton, 'text-red-500 hover:text-red-600')}
                    onClick={() => setRoleToDelete(role)}
                >
                    <Trash2 className="size-4" />
                </button>
            )}
        </div>
    );

    const nameCell = (role: RoleRow) => (
        <>
            <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{role.name}</span>
                {role.is_system && (
                    <Badge variant="secondary" className="text-[10px]">
                        del sistema
                    </Badge>
                )}
            </div>
            {role.description && <p className="mt-0.5 text-xs text-muted-foreground">{role.description}</p>}
        </>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Roles y permisos" />
            <SettingsLayout wide>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-base font-semibold">Roles y permisos</h3>
                        <p className="text-sm text-muted-foreground">Crea roles personalizados y decide qué puede hacer cada uno</p>
                    </div>
                    <Link
                        href={route('settings.roles.create')}
                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 sm:h-10"
                        style={{ color: onBrand.hex }}
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        Nuevo rol
                    </Link>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                    {isWide ? (
                        <table className="w-full text-sm">
                            <caption className="sr-only">Roles</caption>
                            <thead className="border-b border-border/60 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-5 py-3 font-medium">Rol</th>
                                    <th className="px-3 py-3 font-medium">Alcance</th>
                                    <th className="px-3 py-3 font-medium">Permisos</th>
                                    <th className="px-3 py-3 font-medium">Usuarios</th>
                                    <th className="px-5 py-3 font-medium">
                                        <span className="sr-only">Acciones</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {roles.map((role) => (
                                    <tr key={role.id}>
                                        <td className="px-5 py-3">{nameCell(role)}</td>
                                        <td className="px-3 py-3 text-muted-foreground">{DATA_SCOPE_LABELS[role.data_scope]}</td>
                                        <td className="px-3 py-3 text-muted-foreground">{role.permissions_count}</td>
                                        <td className="px-3 py-3 text-muted-foreground">
                                            <span className="inline-flex items-center gap-1">
                                                <Users className="size-3.5" aria-hidden="true" />
                                                {role.users_count}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">{actions(role)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <ul className="divide-y divide-border/60">
                            {roles.map((role) => (
                                <li key={role.id} className="flex flex-col gap-3 p-4">
                                    <div>{nameCell(role)}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {DATA_SCOPE_LABELS[role.data_scope]} · {role.permissions_count} permisos ·{' '}
                                        <span className="inline-flex items-center gap-1">
                                            <Users className="size-3" aria-hidden="true" />
                                            {role.users_count}
                                        </span>
                                    </p>
                                    {actions(role)}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </SettingsLayout>

            <Dialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eliminar rol</DialogTitle>
                        <DialogDescription>
                            ¿Eliminar el rol <strong>{roleToDelete?.name}</strong>? Esta acción no se puede deshacer.
                            {roleToDelete && roleToDelete.users_count > 0 && (
                                <span className="mt-2 block text-red-500">
                                    Tiene {roleToDelete.users_count} usuario(s) asignado(s) — reasígnalos antes de eliminarlo.
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRoleToDelete(null)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={!!roleToDelete && roleToDelete.users_count > 0}>
                            Eliminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
