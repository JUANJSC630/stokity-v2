import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronLeft, Save, Upload, UserCircle } from 'lucide-react';

import { Switch } from '@/components/ui/switch';
import { useEffect, useState } from 'react';

type Branch = {
    id: number;
    name: string;
};

interface Props {
    branches: Branch[];
    roles: string[];
}

export default function CreateUser({ branches, roles }: Props) {
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

    const form = useForm<{
        name: string;
        email: string;
        role: string;
        branch_id: string;
        password: string;
        password_confirmation: string;
        status: boolean;
        photo: File | null;
    }>({
        name: '',
        email: '',
        role: 'vendedor',
        branch_id: '',
        password: '',
        password_confirmation: '',
        status: true,
        photo: null,
    });

    // Handle the branch field visibility based on role
    const [showBranchField, setShowBranchField] = useState(true);

    // Manejar la lógica de cambio de rol
    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newRole = e.target.value;
        form.setData('role', newRole);

        // Si el rol es administrador, ocultar campo de sucursal y limpiar su valor
        if (newRole === 'administrador') {
            setShowBranchField(false);
            form.setData('branch_id', '');
        } else {
            setShowBranchField(true);
        }
    };

    // Configuración inicial del estado del campo de sucursal basado en el rol
    const initialRole = form.data.role;
    useEffect(() => {
        setShowBranchField(initialRole !== 'administrador');
    }, [initialRole]);

    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            form.setData('photo', file);

            // Create a preview URL
            const reader = new FileReader();
            reader.onload = (e) => {
                setPhotoPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            form.setData('photo', file);

            // Create a preview URL
            const reader = new FileReader();
            reader.onload = (e) => {
                setPhotoPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/users', {
            forceFormData: true, // Forzar el uso de FormData para manejar archivos correctamente
            onSuccess: () => {
                console.log('Usuario creado exitosamente');
            },
            onError: (errors) => {
                console.error('Errores al crear usuario:', errors);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Usuario" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/users">
                            <Button variant="outline" size="sm" className="flex gap-1">
                                <ChevronLeft className="size-4" />
                                <span>Volver</span>
                            </Button>
                        </Link>
                        <h1 className="text-2xl font-bold">Crear Nuevo Usuario</h1>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {/* Información Personal */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Información Personal</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Foto */}
                                    <div>
                                        <Label htmlFor="photo" className="mb-2 block">
                                            Foto
                                        </Label>
                                        <div className="flex flex-col items-center gap-4">
                                            <div
                                                className={`group relative h-36 w-36 overflow-hidden rounded-full border-2 ${isDragging ? 'border-dashed border-primary' : 'border-sidebar-border'} bg-muted transition-all duration-200 hover:border-primary`}
                                                onDragOver={handleDragOver}
                                                onDragLeave={handleDragLeave}
                                                onDrop={handleDrop}
                                            >
                                                {photoPreview ? (
                                                    <>
                                                        <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                                                    </>
                                                ) : (
                                                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-muted-foreground">
                                                        <UserCircle className="size-12" strokeWidth={1.5} />
                                                        <p className="text-center text-xs">Sin foto de perfil</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <label
                                                    htmlFor="photo"
                                                    className="flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary/90"
                                                >
                                                    <Upload className="size-4" />
                                                    Subir foto
                                                    <input id="photo" type="file" className="sr-only" accept="image/*" onChange={handlePhotoChange} />
                                                </label>
                                            </div>

                                            {form.errors.photo && <p className="mt-1 text-xs text-red-500">{form.errors.photo}</p>}

                                            <p className="text-center text-xs text-muted-foreground">
                                                Formatos permitidos: JPG, PNG, GIF. Tamaño máximo: 2MB
                                            </p>
                                        </div>
                                    </div>

                                    {/* Nombre */}
                                    <div>
                                        <Label htmlFor="name">Nombre</Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            value={form.data.name}
                                            onChange={(e) => form.setData('name', e.target.value)}
                                            className={form.errors.name ? 'border-red-500' : ''}
                                            disabled={form.processing}
                                        />
                                        {form.errors.name && <p className="mt-1 text-xs text-red-500">{form.errors.name}</p>}
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={form.data.email}
                                            onChange={(e) => form.setData('email', e.target.value)}
                                            className={form.errors.email ? 'border-red-500' : ''}
                                            disabled={form.processing}
                                        />
                                        {form.errors.email && <p className="mt-1 text-xs text-red-500">{form.errors.email}</p>}
                                    </div>

                                    {/* Estado */}
                                    <div>
                                        <Label className="mb-3 block">Estado</Label>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="status"
                                                checked={form.data.status}
                                                onCheckedChange={(checked: boolean) => form.setData('status', checked)}
                                                disabled={form.processing}
                                            />
                                            <Label htmlFor="status" className="font-normal">
                                                {form.data.status ? 'Activo' : 'Inactivo'}
                                            </Label>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Información de la Cuenta */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Información de la Cuenta</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Rol */}
                                <div>
                                    <Label htmlFor="role">Rol</Label>
                                    <div className={form.errors.role ? 'border-red-500' : ''}>
                                        <select
                                            id="role"
                                            value={form.data.role}
                                            onChange={handleRoleChange}
                                            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
                                            disabled={form.processing}
                                        >
                                            {roles.map((role) => (
                                                <option key={role} value={role}>
                                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {form.errors.role && <p className="mt-1 text-xs text-red-500">{form.errors.role}</p>}
                                </div>

                                {/* Sucursal - Solo visible si el rol no es "administrador" */}
                                {showBranchField && (
                                    <div>
                                        <Label htmlFor="branch_id">Sucursal</Label>
                                        <div className={form.errors.branch_id ? 'border-red-500' : ''}>
                                            <select
                                                id="branch_id"
                                                value={form.data.branch_id}
                                                onChange={(e) => form.setData('branch_id', e.target.value)}
                                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
                                                disabled={form.processing}
                                            >
                                                <option value="">Seleccionar sucursal</option>
                                                {branches.map((branch) => (
                                                    <option key={branch.id} value={String(branch.id)}>
                                                        {branch.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {form.errors.branch_id && <p className="mt-1 text-xs text-red-500">{form.errors.branch_id}</p>}
                                    </div>
                                )}

                                {/* Contraseña */}
                                <div>
                                    <Label htmlFor="password">Contraseña</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={form.data.password}
                                        onChange={(e) => form.setData('password', e.target.value)}
                                        className={form.errors.password ? 'border-red-500' : ''}
                                        disabled={form.processing}
                                    />
                                    {form.errors.password && <p className="mt-1 text-xs text-red-500">{form.errors.password}</p>}
                                </div>

                                {/* Confirmar Contraseña */}
                                <div>
                                    <Label htmlFor="password_confirmation">Confirmar Contraseña</Label>
                                    <Input
                                        id="password_confirmation"
                                        type="password"
                                        value={form.data.password_confirmation}
                                        onChange={(e) => form.setData('password_confirmation', e.target.value)}
                                        disabled={form.processing}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <Button type="submit" className="flex gap-1" disabled={form.processing}>
                            <Save className="size-4" />
                            <span>{form.processing ? 'Creando...' : 'Crear Usuario'}</span>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
