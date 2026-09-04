import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Módulos', href: '/settings/modules' }];

const MODULES: { key: string; label: string; description: string }[] = [
    { key: 'credits', label: 'Créditos', description: 'Ventas a crédito, cuotas y pagos diferidos' },
    { key: 'suppliers', label: 'Proveedores', description: 'Catálogo de proveedores y vínculo con productos' },
    { key: 'finances', label: 'Finanzas', description: 'Panel financiero, gastos y categorías de gasto' },
];

export default function ModuleSettings({ moduleConfig }: { moduleConfig: Record<string, boolean> }) {
    const form = useForm({ modules: moduleConfig });
    const { props } = usePage<{ flash: { success?: string } }>();

    useEffect(() => {
        if (props.flash?.success) toast.success(props.flash.success);
    }, [props.flash?.success]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('settings.modules.update'), { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Módulos" />
            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title="Módulos del negocio"
                        description="Apaga por completo las secciones que este negocio no usa — se ocultan del menú y dejan de ser accesibles, sin borrar nada de lo que ya exista"
                    />

                    <form onSubmit={submit} className="space-y-6">
                        <div className="divide-y rounded-md border">
                            {MODULES.map((m) => (
                                <div key={m.key} className="flex items-center justify-between gap-4 p-4">
                                    <div>
                                        <Label htmlFor={`module-${m.key}`} className="font-medium">
                                            {m.label}
                                        </Label>
                                        <p className="text-sm text-muted-foreground">{m.description}</p>
                                    </div>
                                    <Switch
                                        id={`module-${m.key}`}
                                        checked={form.data.modules[m.key] ?? true}
                                        onCheckedChange={(checked) => form.setData('modules', { ...form.data.modules, [m.key]: checked })}
                                        disabled={form.processing}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Guardando...' : 'Guardar cambios'}
                            </Button>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
