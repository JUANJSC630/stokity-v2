import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Edit2, Plus, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
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

export default function RolesIndex({ roles }: { roles: RoleRow[] }) {
    const { props } = usePage<{ flash: { success?: string } }>();

    useEffect(() => {
        if (props.flash?.success) toast.success(props.flash.success);
    }, [props.flash?.success]);

    const [roleToDelete, setRoleToDelete] = useState<RoleRow | null>(null);

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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Roles y permisos" />
            <SettingsLayout wide>
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <HeadingSmall title="Roles y permisos" description="Crea roles personalizados y decide qué puede hacer cada uno" />
                        <Button asChild size="sm" className="flex gap-1">
                            <Link href={route('settings.roles.create')}>
                                <Plus className="size-4" />
                                Nuevo rol
                            </Link>
                        </Button>
                    </div>

                    <div className="overflow-hidden rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-2 font-medium">Rol</th>
                                    <th className="px-4 py-2 font-medium">Alcance</th>
                                    <th className="px-4 py-2 font-medium">Permisos</th>
                                    <th className="px-4 py-2 font-medium">Usuarios</th>
                                    <th className="px-4 py-2 font-medium"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {roles.map((role) => (
                                    <tr key={role.id}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{role.name}</span>
                                                {role.is_system && (
                                                    <Badge variant="secondary" className="text-[10px]">
                                                        del sistema
                                                    </Badge>
                                                )}
                                            </div>
                                            {role.description && <p className="mt-0.5 text-xs text-muted-foreground">{role.description}</p>}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">{DATA_SCOPE_LABELS[role.data_scope]}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{role.permissions_count}</td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            <span className="inline-flex items-center gap-1">
                                                <Users className="size-3.5" />
                                                {role.users_count}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link href={route('settings.roles.edit', role.id)}>
                                                        <Edit2 className="size-4" />
                                                    </Link>
                                                </Button>
                                                {!role.is_system && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500"
                                                        onClick={() => setRoleToDelete(role)}
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
