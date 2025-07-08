import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem, type User } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';

interface EditBranchProps {
    branch: Branch;
    managers: User[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Sucursales',
        href: '/branches',
    },
    {
        title: 'Editar Sucursal',
        href: '#',
    },
];

export default function EditBranch({ branch, managers }: EditBranchProps) {
    const { data, setData, put, processing, errors } = useForm({
        name: branch.name || '',
        address: branch.address || '',
        phone: branch.phone || '',
        email: branch.email || '',
        status: branch.status,
        manager_id: branch.manager_id ? branch.manager_id.toString() : 'none',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Create form data to send
        const formData = { ...data };

        // Process manager_id before submission
        if (formData.manager_id === 'none') {
            formData.manager_id = '';
        }

        // Submit form with processed data
        put(route('branches.update', branch.id), {
            ...formData,
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar Sucursal - ${branch.name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center gap-4">
                    <Link href="/branches">
                        <Button variant="ghost" size="icon">
                            <ChevronLeft className="size-5" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">Editar Sucursal: {branch.name}</h1>
                </div>

                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Información de la Sucursal</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className={errors.name ? 'text-destructive' : ''}>
                                        Nombre de la sucursal *
                                    </Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className={errors.name ? 'border-destructive' : ''}
                                    />
                                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone" className={errors.phone ? 'text-destructive' : ''}>
                                        Teléfono *
                                    </Label>
                                    <Input
                                        id="phone"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        className={errors.phone ? 'border-destructive' : ''}
                                    />
                                    {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address" className={errors.address ? 'text-destructive' : ''}>
                                    Dirección *
                                </Label>
                                <Input
                                    id="address"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    className={errors.address ? 'border-destructive' : ''}
                                />
                                {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className={errors.email ? 'text-destructive' : ''}>
                                    Correo electrónico
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className={errors.email ? 'border-destructive' : ''}
                                />
                                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="manager_id" className={errors.manager_id ? 'text-destructive' : ''}>
                                        Gerente / Responsable
                                    </Label>
                                    <Select value={data.manager_id} onValueChange={(value) => setData('manager_id', value)}>
                                        <SelectTrigger className={errors.manager_id ? 'border-destructive' : ''}>
                                            <SelectValue placeholder="Seleccionar encargado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Ninguno</SelectItem>
                                            {managers.length > 0 ? (
                                                managers.map((manager) => (
                                                    <SelectItem key={manager.id} value={manager.id.toString()}>
                                                        {manager.name}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="none" disabled>
                                                    No hay usuarios con rol de encargado disponibles
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Solo usuarios con rol de "Encargado" pueden ser asignados como responsables de una sucursal
                                    </p>
                                    {errors.manager_id && <p className="text-sm text-destructive">{errors.manager_id}</p>}
                                </div>

                                <div className="pt-6">
                                    <Label className="mb-3 block">Estado</Label>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="status"
                                            checked={data.status}
                                            onCheckedChange={(checked: boolean) => setData('status', checked)}
                                            disabled={processing}
                                        />
                                        <Label htmlFor="status" className="font-normal">
                                            {data.status ? 'Activa' : 'Inactiva'}
                                        </Label>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Link href="/branches">
                                <Button variant="outline" type="button">
                                    Cancelar
                                </Button>
                            </Link>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Guardando...' : 'Guardar cambios'}
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </div>
        </AppLayout>
    );
}
