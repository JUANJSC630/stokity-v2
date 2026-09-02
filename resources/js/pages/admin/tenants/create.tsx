import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Negocios', href: '/admin/tenants' },
    { title: 'Nuevo', href: '/admin/tenants/create' },
];

export default function TenantsCreate() {
    const { data, setData, post, processing, errors } = useForm({
        business_name: '',
        branch_name: '',
        admin_name: '',
        admin_email: '',
        admin_password: '',
        admin_password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/admin/tenants');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo negocio" />
            <div className="max-w-2xl p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Crear negocio</CardTitle>
                        <CardDescription>
                            Se crea el negocio con su administrador, una sucursal inicial, métodos de pago y el cliente «Consumidor Final».
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="flex flex-col gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="business_name">Nombre del negocio</Label>
                                <Input id="business_name" value={data.business_name} onChange={(e) => setData('business_name', e.target.value)} autoFocus />
                                {errors.business_name && <p className="text-sm text-red-600">{errors.business_name}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="branch_name">Sucursal inicial (opcional)</Label>
                                <Input id="branch_name" placeholder="Principal" value={data.branch_name} onChange={(e) => setData('branch_name', e.target.value)} />
                                {errors.branch_name && <p className="text-sm text-red-600">{errors.branch_name}</p>}
                            </div>

                            <hr className="my-2" />
                            <p className="text-sm font-medium text-muted-foreground">Administrador del negocio</p>

                            <div className="grid gap-2">
                                <Label htmlFor="admin_name">Nombre</Label>
                                <Input id="admin_name" value={data.admin_name} onChange={(e) => setData('admin_name', e.target.value)} />
                                {errors.admin_name && <p className="text-sm text-red-600">{errors.admin_name}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="admin_email">Email</Label>
                                <Input id="admin_email" type="email" value={data.admin_email} onChange={(e) => setData('admin_email', e.target.value)} />
                                {errors.admin_email && <p className="text-sm text-red-600">{errors.admin_email}</p>}
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="admin_password">Contraseña</Label>
                                    <Input id="admin_password" type="password" value={data.admin_password} onChange={(e) => setData('admin_password', e.target.value)} />
                                    {errors.admin_password && <p className="text-sm text-red-600">{errors.admin_password}</p>}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="admin_password_confirmation">Confirmar contraseña</Label>
                                    <Input
                                        id="admin_password_confirmation"
                                        type="password"
                                        value={data.admin_password_confirmation}
                                        onChange={(e) => setData('admin_password_confirmation', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="submit" disabled={processing}>
                                    {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                    Crear negocio
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
