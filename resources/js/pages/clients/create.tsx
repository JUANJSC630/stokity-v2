import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Save } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Clientes',
        href: '/clients',
    },
    {
        title: 'Crear Cliente',
        href: '/clients/create',
    },
];

export default function Create() {
    const form = useForm<{
        name: string;
        document: string;
        phone: string;
        address: string;
        email: string;
        birthdate: string;
    }>({
        name: '',
        document: '',
        phone: '',
        address: '',
        email: '',
        birthdate: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('clients.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Cliente" />
            <div className="flex h-full flex-1 flex-col gap-4 p-2 sm:p-4">
                {/* Header with back button */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
                    <Link href={route('clients.index')}>
                        <Button variant="ghost" size="sm" className="mr-0 flex items-center gap-1 sm:mr-4">
                            <ArrowLeft className="h-4 w-4" />
                            Volver
                        </Button>
                    </Link>
                    <h1 className="text-xl font-semibold sm:text-2xl">Crear Nuevo Cliente</h1>
                </div>

                <Card className="border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                    <CardHeader>
                        <CardTitle>Información del Cliente</CardTitle>
                        <CardDescription>
                            Complete la información necesaria para crear un nuevo cliente. Todos los campos marcados con * son obligatorios.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">
                                        Nombre <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        className="bg-white text-black dark:bg-neutral-800 dark:text-neutral-100"
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        required
                                    />
                                    {form.errors.name && <p className="text-sm text-red-500">{form.errors.name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="document">
                                        Documento <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="document"
                                        type="text"
                                        className="bg-white text-black dark:bg-neutral-800 dark:text-neutral-100"
                                        value={form.data.document}
                                        onChange={(e) => form.setData('document', e.target.value)}
                                        placeholder="Cédula de Ciudadanía"
                                        required
                                    />
                                    {form.errors.document && <p className="text-sm text-red-500">{form.errors.document}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Teléfono</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        className="bg-white text-black dark:bg-neutral-800 dark:text-neutral-100"
                                        value={form.data.phone}
                                        onChange={(e) => form.setData('phone', e.target.value)}
                                    />
                                    {form.errors.phone && <p className="text-sm text-red-500">{form.errors.phone}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Correo Electrónico</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        className="bg-white text-black dark:bg-neutral-800 dark:text-neutral-100"
                                        value={form.data.email}
                                        onChange={(e) => form.setData('email', e.target.value)}
                                    />
                                    {form.errors.email && <p className="text-sm text-red-500">{form.errors.email}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Dirección</Label>
                                    <Input
                                        id="address"
                                        type="text"
                                        className="max-w-full truncate bg-white text-black dark:bg-neutral-800 dark:text-neutral-100"
                                        value={form.data.address}
                                        onChange={(e) => form.setData('address', e.target.value)}
                                    />
                                    {form.errors.address && <p className="text-sm text-red-500">{form.errors.address}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="birthdate">Fecha de Nacimiento</Label>
                                    <Input
                                        id="birthdate"
                                        type="date"
                                        className="bg-white text-black dark:bg-neutral-800 dark:text-neutral-100"
                                        value={form.data.birthdate}
                                        onChange={(e) => form.setData('birthdate', e.target.value)}
                                    />
                                    {form.errors.birthdate && <p className="text-sm text-red-500">{form.errors.birthdate}</p>}
                                </div>
                            </div>
                            <div className="flex justify-end space-x-2">
                                <Link href={route('clients.index')}>
                                    <Button variant="outline" type="button">
                                        Cancelar
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={form.processing} className="gap-1">
                                    <Save className="size-4" />
                                    <span>Guardar Cliente</span>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
