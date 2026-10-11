import { BrandSubmit, SettingsSection } from '@/components/settings/settings-section';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Módulos', href: '/settings/modules' }];

const MODULES: { key: string; label: string; description: string }[] = [
    { key: 'credits', label: 'Créditos', description: 'Ventas a crédito, cuotas y pagos diferidos' },
    { key: 'suppliers', label: 'Proveedores', description: 'Catálogo de proveedores y vínculo con productos' },
    { key: 'finances', label: 'Finanzas', description: 'Panel financiero, gastos y categorías de gasto' },
    { key: 'wholesale', label: 'Mayorista', description: 'Pedidos mayoristas personalizados, fuera del catálogo e inventario normal' },
];

export default function ModuleSettings({ moduleConfig }: { moduleConfig: Record<string, boolean> }) {
    const form = useForm({ modules: moduleConfig });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('settings.modules.update'), { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Módulos" />
            <SettingsLayout>
                <SettingsSection
                    title="Módulos del negocio"
                    description="Apaga por completo las secciones que este negocio no usa — se ocultan del menú y dejan de ser accesibles, sin borrar nada de lo que ya exista"
                >
                    <form onSubmit={submit} className="flex flex-col gap-5">
                        <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
                            {MODULES.map((m) => (
                                <li key={m.key} className="flex min-h-16 items-center justify-between gap-4 p-4">
                                    <div className="min-w-0">
                                        <label htmlFor={`module-${m.key}`} className="text-sm font-medium">
                                            {m.label}
                                        </label>
                                        <p className="text-sm text-muted-foreground">{m.description}</p>
                                    </div>
                                    <Switch
                                        id={`module-${m.key}`}
                                        checked={form.data.modules[m.key] ?? true}
                                        onCheckedChange={(checked) => form.setData('modules', { ...form.data.modules, [m.key]: checked })}
                                        disabled={form.processing}
                                    />
                                </li>
                            ))}
                        </ul>

                        <div className="flex sm:justify-end">
                            <BrandSubmit disabled={form.processing}>{form.processing ? 'Guardando...' : 'Guardar cambios'}</BrandSubmit>
                        </div>
                    </form>
                </SettingsSection>
            </SettingsLayout>
        </AppLayout>
    );
}
