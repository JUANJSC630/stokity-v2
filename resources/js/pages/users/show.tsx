import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronLeft, Edit, Trash } from 'lucide-react';
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

export default function ShowUser({ user }: Props) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const form = useForm({
        reason: '',
    });

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

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'administrador':
                return <Badge className="bg-blue-500 hover:bg-blue-600">Administrador</Badge>;
            case 'encargado':
                return <Badge className="bg-green-500 hover:bg-green-600">Encargado</Badge>;
            case 'vendedor':
                return <Badge className="bg-amber-500 hover:bg-amber-600">Vendedor</Badge>;
            default:
                return <Badge>{role}</Badge>;
        }
    };

    const getStatusBadge = (status: boolean) => {
        return status ? (
            <Badge className="bg-green-500 hover:bg-green-600">Activo</Badge>
        ) : (
            <Badge className="bg-red-500 hover:bg-red-600">Inactivo</Badge>
        );
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'No disponible';
        return new Date(dateString).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleDelete = () => {
        form.delete(`/users/${user.id}`, {
            onSuccess: () => setIsDeleteDialogOpen(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Usuario: ${user.name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/users">
                            <Button variant="outline" size="sm" className="flex gap-1">
                                <ChevronLeft className="size-4" />
                                <span>Volver</span>
                            </Button>
                        </Link>
                        <h1 className="text-2xl font-bold">Detalle del Usuario</h1>
                    </div>

                    <div className="flex gap-2">
                        <Link href={`/users/${user.id}/edit`}>
                            <Button variant="outline" className="flex gap-1">
                                <Edit className="size-4" />
                                <span>Editar</span>
                            </Button>
                        </Link>

                        <Button variant="destructive" className="flex gap-1" onClick={() => setIsDeleteDialogOpen(true)}>
                            <Trash className="size-4" />
                            <span>Eliminar</span>
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Información Personal */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Información Personal</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-6 flex flex-col items-center">
                                <Avatar className="mb-2 h-48 w-48">
                                    {user.photo_url ? (
                                        <img
                                            src={user.photo_url}
                                            alt={user.name}
                                            className="h-full w-full object-cover"
                                            onError={(e) => {
                                                console.error('Error al cargar imagen:', user.photo_url);
                                                (e.target as HTMLImageElement).src = '/stokity-icon.png';
                                            }}
                                        />
                                    ) : (
                                        <img src="/stokity-icon.png" alt={user.name} className="h-full w-full object-cover" />
                                    )}
                                </Avatar>
                                <h2 className="text-xl font-medium">{user.name}</h2>
                                <p className="text-muted-foreground">{user.email}</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground">Rol</h3>
                                    <div>{getRoleBadge(user.role)}</div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground">Estado</h3>
                                    <div>{getStatusBadge(user.status)}</div>
                                </div>

                                {user.branch && (
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground">Sucursal</h3>
                                        <p>{user.branch.name}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Información de la Cuenta */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Información de la Cuenta</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground">Fecha de Registro</h3>
                                <p>{formatDate(user.created_at)}</p>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground">Última Actualización</h3>
                                <p>{formatDate(user.updated_at)}</p>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground">Último Acceso</h3>
                                <p>{formatDate(user.last_login_at)}</p>
                            </div>
                        </CardContent>
                    </Card>
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
                            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={form.processing}>
                                Cancelar
                            </Button>
                            <Button variant="destructive" onClick={handleDelete} disabled={form.processing}>
                                {form.processing ? 'Eliminando...' : 'Eliminar Usuario'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
