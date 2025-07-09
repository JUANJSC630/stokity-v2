import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, Edit, Mail, MapPin, Phone, Trash2, User as UserIcon, Users } from 'lucide-react';
import { useState } from 'react';

interface Props {
    branch: Branch;
}

export default function BranchDetail({ branch }: Props) {
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Sucursales',
            href: '/branches',
        },
        {
            title: branch.name,
            href: `/branches/${branch.id}`,
        },
    ];

    const handleDelete = () => {
        router.delete(`/branches/${branch.id}`, {
            onSuccess: () => {
                // Redirección se maneja automáticamente
            },
        });
    };

    // No helper functions needed

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Sucursal - ${branch.name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left">
                        <Link href="/branches">
                            <Button variant="outline" size="icon" className="h-8 w-8">
                                <ArrowLeft className="size-4" />
                            </Button>
                        </Link>
                        <h1 className="text-2xl font-bold mt-2 sm:mt-0">{branch.name}</h1>
                        <Badge variant={branch.status ? 'default' : 'destructive'} className="mt-2 sm:mt-0 ml-0 sm:ml-2">
                            {branch.status ? 'Activa' : 'Inactiva'}
                        </Badge>
                    </div>
                    <div className="flex flex-row justify-center gap-2">
                        <Link href={`/branches/${branch.id}/edit`}>
                            <Button className="flex gap-1">
                                <Edit className="size-4" />
                                <span>Editar</span>
                            </Button>
                        </Link>
                        <Button variant="destructive" className="flex gap-1" onClick={() => setDeleteModalOpen(true)}>
                            <Trash2 className="size-4" />
                            <span>Eliminar</span>
                        </Button>
                    </div>
                </div>
                <Card className="mb-4">
                    <CardHeader>
                        <CardTitle className="text-lg">Información de la Sucursal</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <div className="flex items-start gap-3">
                            <MapPin className="mt-0.5 size-5 text-muted-foreground" />
                            <div>
                                <h3 className="text-sm font-medium">Dirección</h3>
                                <p className="text-sm text-muted-foreground">{branch.address}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Phone className="mt-0.5 size-5 text-muted-foreground" />
                            <div>
                                <h3 className="text-sm font-medium">Teléfono</h3>
                                <p className="text-sm text-muted-foreground">{branch.phone}</p>
                            </div>
                        </div>
                        {branch.email && (
                            <div className="flex items-start gap-3">
                                <Mail className="mt-0.5 size-5 text-muted-foreground" />
                                <div>
                                    <h3 className="text-sm font-medium">Email</h3>
                                    <p className="text-sm text-muted-foreground">{branch.email}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Encargado de la sucursal */}
                <Card className="mb-4 border-green-200 dark:border-green-800/30">
                    <CardHeader className="border-b">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <UserIcon className="size-5" />
                            Encargado de Sucursal
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {branch.manager ? (
                            <div className="flex items-start gap-4 rounded-lg border border-green-200 bg-card p-4 dark:border-green-800/30">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-muted">
                                    <UserIcon className="size-7" />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <Link href={`/users/${branch.manager.id}`} className="text-lg font-medium hover:underline">
                                            {branch.manager.name}
                                        </Link>
                                        <Badge className="self-start">Encargado</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{branch.manager.email}</p>
                                    <p className="mt-2 text-xs text-muted-foreground italic">
                                        El encargado es responsable de administrar esta sucursal y sus vendedores
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-green-200 bg-muted/20 py-8 text-center dark:border-green-800/30">
                                <UserIcon className="mx-auto size-14 opacity-50" />
                                <p className="mt-3 text-muted-foreground">No hay encargado asignado a esta sucursal</p>
                                <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                                    Se recomienda asignar un encargado para garantizar la correcta administración de la sucursal
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Empleados de la sucursal */}
                <Card className="border-amber-200 dark:border-amber-800/30">
                    <CardHeader className="flex flex-row items-center justify-between border-b">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Users className="size-5" />
                            Vendedores
                        </CardTitle>
                        <Badge variant="outline">{branch.employees?.filter((emp) => emp.role === 'vendedor').length || 0} vendedores</Badge>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {branch.employees && branch.employees.filter((emp) => emp.role === 'vendedor').length > 0 ? (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {branch.employees
                                    .filter((employee) => employee.role === 'vendedor')
                                    .map((employee) => (
                                        <div
                                            key={employee.id}
                                            className="flex items-start gap-3 rounded-lg border border-amber-200 bg-card p-4 dark:border-amber-800/30"
                                        >
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-muted">
                                                <UserIcon className="size-5" />
                                            </div>
                                            <div>
                                                <Link href={`/users/${employee.id}`} className="text-sm font-medium hover:underline">
                                                    {employee.name}
                                                </Link>
                                                <p className="text-sm text-muted-foreground">{employee.email}</p>
                                                <div className="mt-1">
                                                    <Badge>Vendedor</Badge>
                                                    <Badge
                                                        variant="outline"
                                                        className="ml-1 text-xs"
                                                        style={{
                                                            borderColor: employee.status ? 'rgb(74 222 128)' : 'rgb(239 68 68)',
                                                            color: employee.status ? 'rgb(74 222 128)' : 'rgb(239 68 68)',
                                                        }}
                                                    >
                                                        {employee.status ? 'Activo' : 'Inactivo'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-amber-200 bg-muted/20 py-8 text-center dark:border-amber-800/30">
                                <Users className="mx-auto size-14 opacity-50" />
                                <p className="mt-3 text-muted-foreground">No hay vendedores asignados a esta sucursal</p>
                                <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                                    Para asignar vendedores a esta sucursal, edite el perfil de los usuarios y seleccione esta sucursal
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="size-5 text-destructive" />
                            Confirmar eliminación
                        </DialogTitle>
                    </DialogHeader>
                    <DialogDescription>
                        <p>
                            ¿Está seguro de eliminar la sucursal <strong>{branch.name}</strong>? Esta acción puede ser revertida posteriormente.
                        </p>
                    </DialogDescription>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Eliminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
