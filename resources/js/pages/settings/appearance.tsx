import { Head, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

import AppearanceTabs from '@/components/appearance-tabs';
import { ImageUpload } from '@/components/image-upload';
import InputError from '@/components/input-error';
import { BrandSubmit, SettingsSection } from '@/components/settings/settings-section';
import { usePermissions } from '@/hooks/use-permissions';
import { type BreadcrumbItem, type SharedData } from '@/types';

import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

import { Package } from 'lucide-react';
import toast from 'react-hot-toast';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Configuración de apariencia',
        href: '/settings/appearance',
    },
];

export default function Appearance() {
    const { business } = usePage<SharedData>().props;
    const { can } = usePermissions();
    // Configuración del negocio: gated by settings.appearance.update. La preferencia de tema es de cada usuario.
    const isAdmin = can('settings.appearance.update');
    const [isUploading, setIsUploading] = useState(false);

    const form = useForm({
        image: null as File | null,
    });

    const colorsForm = useForm({
        brand_color: business.brand_color ?? '#3F3F46',
        brand_color_secondary: business.brand_color_secondary ?? '#A1A1AA',
    });

    const handleColorSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        colorsForm.post(route('appearance.brand-colors'), {
            preserveScroll: true,
            onSuccess: () => toast.success('Colores actualizados.'),
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);
        form.post(route('appearance.default-product-image'), {
            forceFormData: true,
            onSuccess: () => {
                toast.success('Imagen por defecto actualizada correctamente.');
                form.reset();
            },
            onError: () => {
                toast.error('Ocurrió un error al actualizar la imagen.');
            },
            onFinish: () => {
                setIsUploading(false);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Configuración de apariencia" />

            <SettingsLayout>
                <SettingsSection title="Configuración de apariencia" description="Actualiza la apariencia de tu cuenta">
                    <AppearanceTabs className="w-full sm:w-auto" />
                </SettingsSection>

                {isAdmin && (
                    <>
                        <SettingsSection title="Colores del sistema" description="Personaliza los colores del sidebar, login y botones principales.">
                            <form onSubmit={handleColorSubmit} className="flex flex-col gap-5">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="brand_color" className="text-xs font-medium">
                                            Color principal
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                id="brand_color"
                                                type="color"
                                                value={colorsForm.data.brand_color}
                                                onChange={(e) => colorsForm.setData('brand_color', e.target.value)}
                                                className="h-11 w-16 cursor-pointer rounded-xl border border-border/60 bg-card p-1"
                                            />
                                            <span className="font-mono text-sm text-muted-foreground">{colorsForm.data.brand_color}</span>
                                        </div>
                                        <InputError message={colorsForm.errors.brand_color} />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="brand_color_secondary" className="text-xs font-medium">
                                            Color de acento
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                id="brand_color_secondary"
                                                type="color"
                                                value={colorsForm.data.brand_color_secondary}
                                                onChange={(e) => colorsForm.setData('brand_color_secondary', e.target.value)}
                                                className="h-11 w-16 cursor-pointer rounded-xl border border-border/60 bg-card p-1"
                                            />
                                            <span className="font-mono text-sm text-muted-foreground">{colorsForm.data.brand_color_secondary}</span>
                                        </div>
                                        <InputError message={colorsForm.errors.brand_color_secondary} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground">Vista previa:</span>
                                    <div className="h-5 w-28 rounded-full" style={{ background: colorsForm.data.brand_color }} />
                                </div>
                                <div className="flex sm:justify-start">
                                    <BrandSubmit disabled={colorsForm.processing}>
                                        {colorsForm.processing ? 'Guardando...' : 'Guardar colores'}
                                    </BrandSubmit>
                                </div>
                            </form>
                        </SettingsSection>

                        <SettingsSection title="Imagen por defecto" description="Se muestra en los productos que no tienen foto.">
                            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                <ImageUpload
                                    id="image"
                                    label="Imagen"
                                    placeholderIcon={Package}
                                    file={form.data.image}
                                    currentUrl={business.default_product_image_url}
                                    error={form.errors.image}
                                    onChange={(file) => {
                                        form.clearErrors('image');
                                        form.setData('image', file);
                                    }}
                                    disabled={isUploading}
                                />
                                <BrandSubmit fullWidth disabled={isUploading || !form.data.image}>
                                    {isUploading ? 'Cambiando...' : 'Cambiar imagen por defecto'}
                                </BrandSubmit>
                            </form>
                        </SettingsSection>
                    </>
                )}
            </SettingsLayout>
        </AppLayout>
    );
}
