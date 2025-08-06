import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

export default function PaymentMethodsCreate() {
    const form = useForm({
        name: '',
        code: '',
        description: '',
        is_active: true,
        sort_order: 0,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inicio', href: '/dashboard' },
        { title: 'Métodos de Pago', href: '/payment-methods' },
        { title: 'Crear Método de Pago', href: '/payment-methods/create' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/payment-methods');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Método de Pago" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => router.get('/payment-methods')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-3xl font-bold">Crear Método de Pago</h1>
                    </div>
                </div>

                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle>Nuevo Método de Pago</CardTitle>
                        <CardDescription>Configura un nuevo método de pago para el sistema</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    Nombre <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    placeholder="Ej: Efectivo, Tarjeta de Crédito, Transferencia"
                                    required
                                />
                                {form.errors.name && <p className="text-sm text-red-500">{form.errors.name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="code">
                                    Código <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="code"
                                    type="text"
                                    value={form.data.code}
                                    onChange={(e) => form.setData('code', e.target.value)}
                                    placeholder="Ej: cash, credit_card, transfer"
                                    required
                                />
                                <p className="text-sm text-muted-foreground">
                                    Código único para identificar el método de pago (solo letras, números y guiones bajos)
                                </p>
                                {form.errors.code && <p className="text-sm text-red-500">{form.errors.code}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Descripción</Label>
                                <Textarea
                                    id="description"
                                    value={form.data.description}
                                    onChange={(e) => form.setData('description', e.target.value)}
                                    placeholder="Descripción opcional del método de pago"
                                    rows={3}
                                />
                                {form.errors.description && <p className="text-sm text-red-500">{form.errors.description}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sort_order">Orden de Aparición</Label>
                                <Input
                                    id="sort_order"
                                    type="number"
                                    min="0"
                                    value={form.data.sort_order}
                                    onChange={(e) => form.setData('sort_order', parseInt(e.target.value) || 0)}
                                />
                                <p className="text-sm text-muted-foreground">
                                    Número que determina el orden de aparición en los listados (0 = primero)
                                </p>
                                {form.errors.sort_order && <p className="text-sm text-red-500">{form.errors.sort_order}</p>}
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="is_active"
                                    checked={form.data.is_active}
                                    onCheckedChange={(checked) => form.setData('is_active', checked as boolean)}
                                />
                                <Label htmlFor="is_active">Método de pago activo</Label>
                            </div>
                            {form.errors.is_active && <p className="text-sm text-red-500">{form.errors.is_active}</p>}

                            <div className="flex gap-4">
                                <Button type="submit" disabled={form.processing} className="flex-1">
                                    {form.processing ? 'Creando...' : 'Crear Método de Pago'}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => router.get('/payment-methods')} disabled={form.processing}>
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
