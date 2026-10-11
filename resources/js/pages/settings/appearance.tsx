import { Head, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

import AppearanceTabs from '@/components/appearance-tabs';
import InputError from '@/components/input-error';
import { BrandSubmit, SettingsSection } from '@/components/settings/settings-section';
import { usePermissions } from '@/hooks/use-permissions';
import { type BreadcrumbItem, type SharedData } from '@/types';

import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

import { Upload, UserCircle } from 'lucide-react';
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
    const [imagePreview, setImagePreview] = useState<string | null>(null);
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

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        form.setData('image', file);
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);
        form.post(route('appearance.default-product-image'), {
            forceFormData: true,
            onSuccess: () => {
                toast.success('Imagen por defecto actualizada correctamente.');
                form.reset();
                setImagePreview(null);
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
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative aspect-square w-full max-w-[160px] overflow-hidden rounded-2xl border-2 border-border/60 bg-muted">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Vista previa" className="size-full object-cover" />
                                        ) : business.default_product_image_url ? (
                                            <img
                                                src={business.default_product_image_url}
                                                alt="Imagen por defecto actual"
                                                className="size-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex size-full flex-col items-center justify-center gap-2 p-4 text-muted-foreground">
                                                <UserCircle className="size-12" strokeWidth={1.5} aria-hidden="true" />
                                            </div>
                                        )}
                                    </div>
                                    <label
                                        htmlFor="image"
                                        className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border/60 bg-card px-4 text-sm font-medium transition-colors hover:bg-muted sm:h-10"
                                    >
                                        <Upload className="size-4" aria-hidden="true" />
                                        Subir imagen
                                        <input
                                            id="image"
                                            type="file"
                                            className="sr-only"
                                            accept="image/jpeg,image/png,image/gif,image/webp"
                                            onChange={handleImageChange}
                                        />
                                    </label>
                                    {form.errors.image && <p className="text-xs text-red-500">{form.errors.image}</p>}
                                    <p className="text-center text-xs text-muted-foreground">
                                        Formatos permitidos: JPG, PNG, GIF, WebP. Tamaño máximo: 2MB
                                    </p>
                                </div>
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
