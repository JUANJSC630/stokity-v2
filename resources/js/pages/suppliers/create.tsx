import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useScrollToError } from '@/hooks/use-scroll-to-error';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Save } from 'lucide-react';

interface PageProps {
    branches: Branch[];
    userBranchId: number | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Proveedores', href: '/suppliers' },
    { title: 'Crear Proveedor', href: '/suppliers/create' },
];

export default function Create({ branches, userBranchId }: PageProps) {
    const form = useForm<{
        branch_id: string;
        name: string;
        nit: string;
        contact_name: string;
        phone: string;
        email: string;
        address: string;
        notes: string;
        status: boolean;
    }>({
        branch_id: userBranchId ? String(userBranchId) : branches[0] ? String(branches[0].id) : '',
        name: '',
        nit: '',
        contact_name: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        status: true,
    });

    useScrollToError(form.errors);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('suppliers.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Proveedor" />
            <div className="flex h-full flex-1 flex-col gap-4 p-2 sm:p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Link href={route('suppliers.index')}>
                        <Button variant="ghost" size="sm" className="flex items-center gap-1">
                            <ArrowLeft className="h-4 w-4" />
                            Volver
                        </Button>
                    </Link>
                    <h1 className="text-xl font-semibold sm:text-2xl">Crear Nuevo Proveedor</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Información del Proveedor</CardTitle>
                        <CardDescription>Complete la información del proveedor. Los campos marcados con * son obligatorios.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {/* Nombre */}
                                <div className="space-y-2">
                                    <Label htmlFor="name">
                                        Nombre / Razón social <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        placeholder="Distribuidora XYZ S.A.S."
                                        required
                                    />
                                    {form.errors.name && <p className="text-sm text-red-500">{form.errors.name}</p>}
                                </div>

                                {/* NIT */}
                                <div className="space-y-2">
                                    <Label htmlFor="nit">NIT / RUT</Label>
                                    <Input
                                        id="nit"
                                        value={form.data.nit}
                                        onChange={(e) => form.setData('nit', e.target.value)}
                                        placeholder="900.123.456-7"
                                    />
                                    {form.errors.nit && <p className="text-sm text-red-500">{form.errors.nit}</p>}
                                </div>

                                {/* Contacto */}
                                <div className="space-y-2">
                                    <Label htmlFor="contact_name">Nombre de contacto</Label>
                                    <Input
                                        id="contact_name"
                                        value={form.data.contact_name}
                                        onChange={(e) => form.setData('contact_name', e.target.value)}
                                        placeholder="Juan Pérez"
                                    />
                                    {form.errors.contact_name && <p className="text-sm text-red-500">{form.errors.contact_name}</p>}
                                </div>

                                {/* Teléfono */}
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Teléfono</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={form.data.phone}
                                        onChange={(e) => form.setData('phone', e.target.value)}
                                        placeholder="310 123 4567"
                                    />
                                    {form.errors.phone && <p className="text-sm text-red-500">{form.errors.phone}</p>}
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <Label htmlFor="email">Correo electrónico</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={form.data.email}
                                        onChange={(e) => form.setData('email', e.target.value)}
                                        placeholder="ventas@distribuidora.com"
                                    />
                                    {form.errors.email && <p className="text-sm text-red-500">{form.errors.email}</p>}
                                </div>

                                {/* Dirección */}
                                <div className="space-y-2">
                                    <Label htmlFor="address">Dirección</Label>
                                    <Input
                                        id="address"
                                        value={form.data.address}
                                        onChange={(e) => form.setData('address', e.target.value)}
                                        placeholder="Cra 7 # 32-15, Bogotá"
                                    />
                                    {form.errors.address && <p className="text-sm text-red-500">{form.errors.address}</p>}
                                </div>

                                {/* Sucursal */}
                                {branches.length > 1 && (
                                    <div className="space-y-2">
                                        <Label htmlFor="branch_id">
                                            Sucursal <span className="text-red-500">*</span>
                                        </Label>
                                        <Select value={form.data.branch_id} onValueChange={(v) => form.setData('branch_id', v)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona una sucursal" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {branches.map((b) => (
                                                    <SelectItem key={b.id} value={String(b.id)}>
                                                        {b.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {form.errors.branch_id && <p className="text-sm text-red-500">{form.errors.branch_id}</p>}
                                    </div>
                                )}

                                {/* Estado */}
                                <div className="flex items-center gap-3 pt-2 sm:col-span-2">
                                    <Switch id="status" checked={form.data.status} onCheckedChange={(v) => form.setData('status', v)} />
                                    <Label htmlFor="status">Proveedor activo</Label>
                                </div>

                                {/* Notas */}
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="notes">Notas</Label>
                                    <Textarea
                                        id="notes"
                                        value={form.data.notes}
                                        onChange={(e) => form.setData('notes', e.target.value)}
                                        placeholder="Términos de pago, observaciones, etc."
                                        rows={3}
                                    />
                                    {form.errors.notes && <p className="text-sm text-red-500">{form.errors.notes}</p>}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Link href={route('suppliers.index')}>
                                    <Button variant="outline" type="button">
                                        Cancelar
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={form.processing} className="gap-1">
                                    <Save className="size-4" />
                                    Guardar Proveedor
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
