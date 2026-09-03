import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { PermissionMatrix, type PermissionsByModule } from '@/components/settings/permission-matrix';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
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

export default function EditRole({ role, permissionsByModule }: { role: RoleData; permissionsByModule: PermissionsByModule }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Roles', href: '/settings/roles' },
        { title: role.name, href: `/settings/roles/${role.id}/edit` },
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
        form.post(route('settings.roles.update', role.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar rol: ${role.name}`} />
            <SettingsLayout wide>
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <Link href={route('settings.roles.index')}>
                            <Button variant="outline" size="sm" className="flex gap-1">
                                <ChevronLeft className="size-4" />
                                Volver
                            </Button>
                        </Link>
                        <HeadingSmall title={`Editar rol: ${role.name}`} description="Ajusta el alcance de datos y qué puede hacer este rol" />
                        {role.is_system && <Badge variant="secondary">del sistema</Badge>}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <Label htmlFor="name">Nombre</Label>
                                <Input
                                    id="name"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    disabled={form.processing || role.is_system}
                                />
                                {role.is_system && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        El nombre de un rol del sistema no se puede cambiar.
                                    </p>
                                )}
                                <InputError message={form.errors.name} />
                            </div>

                            <div>
                                <Label htmlFor="data_scope">Alcance de datos</Label>
                                <select
                                    id="data_scope"
                                    value={form.data.data_scope}
                                    onChange={(e) => form.setData('data_scope', e.target.value as 'all' | 'branch')}
                                    disabled={form.processing}
                                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="branch">Solo su sucursal</option>
                                    <option value="all">Todas las sucursales</option>
                                </select>
                                <InputError message={form.errors.data_scope} />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="description">Descripción (opcional)</Label>
                            <Textarea
                                id="description"
                                value={form.data.description}
                                onChange={(e) => form.setData('description', e.target.value)}
                                disabled={form.processing}
                                rows={2}
                            />
                            <InputError message={form.errors.description} />
                        </div>

                        <div>
                            <Label className="mb-2 block">Permisos</Label>
                            <PermissionMatrix
                                permissionsByModule={permissionsByModule}
                                selected={selected}
                                onChange={setSelected}
                                disabled={form.processing}
                            />
                            <InputError message={form.errors.permissions} className="mt-2" />
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" className="flex gap-1" disabled={form.processing}>
                                <Save className="size-4" />
                                {form.processing ? 'Guardando...' : 'Guardar cambios'}
                            </Button>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
