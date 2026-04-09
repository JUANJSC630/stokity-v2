import { Head, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

import AppearanceTabs from '@/components/appearance-tabs';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { type BreadcrumbItem, type SharedData } from '@/types';

import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const form = useForm({
        image: null as File | null,
    });

    const colorsForm = useForm({
        brand_color: business.brand_color ?? '#C850C0',
        brand_color_secondary: business.brand_color_secondary ?? '#FFCC70',
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
                <div className="space-y-6">
                    <HeadingSmall title="Configuración de apariencia" description="Actualiza la apariencia de tu cuenta" />
                    <AppearanceTabs />

                    {/* ── Brand colors ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Colores del sistema</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="mb-4 text-sm text-muted-foreground">
                                Personaliza los colores del sidebar, login y botones principales.
                            </p>
                            <form onSubmit={handleColorSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium">Color principal</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={colorsForm.data.brand_color}
                                                onChange={(e) => colorsForm.setData('brand_color', e.target.value)}
                                                className="h-10 w-14 cursor-pointer rounded border border-neutral-200 p-0.5 dark:border-neutral-700"
                                            />
                                            <span className="font-mono text-sm text-muted-foreground">
                                                {colorsForm.data.brand_color}
                                            </span>
                                        </div>
                                        <InputError message={colorsForm.errors.brand_color} />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium">Color de acento</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={colorsForm.data.brand_color_secondary}
                                                onChange={(e) => colorsForm.setData('brand_color_secondary', e.target.value)}
                                                className="h-10 w-14 cursor-pointer rounded border border-neutral-200 p-0.5 dark:border-neutral-700"
                                            />
                                            <span className="font-mono text-sm text-muted-foreground">
                                                {colorsForm.data.brand_color_secondary}
                                            </span>
                                        </div>
                                        <InputError message={colorsForm.errors.brand_color_secondary} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground">Vista previa:</span>
                                    <div
                                        className="h-5 w-28 rounded-full"
                                        style={{
                                            background: colorsForm.data.brand_color,
                                        }}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={colorsForm.processing}
                                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 dark:text-black"
                                >
                                    {colorsForm.processing ? 'Guardando...' : 'Guardar colores'}
                                </button>
                            </form>
                        </CardContent>
                    </Card>

                    <div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Imagen por defecto</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="group relative aspect-square w-full max-w-[160px] overflow-hidden rounded-md border-2 border-sidebar-border bg-muted transition-all duration-200 hover:border-primary">
                                            {imagePreview ? (
                                                <img src={imagePreview} alt="Vista previa" className="h-full w-full object-cover" />
                                            ) : business.default_product_image_url ? (
                                                <img
                                                    src={business.default_product_image_url}
                                                    alt="Imagen por defecto actual"
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-muted-foreground">
                                                    <UserCircle className="size-12" strokeWidth={1.5} />
                                                </div>
                                            )}
                                        </div>
                                        <label
                                            htmlFor="image"
                                            className="flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary/90 dark:text-black"
                                        >
                                            <Upload className="size-4" />
                                            Subir imagen
                                            <input
                                                id="image"
                                                type="file"
                                                className="sr-only"
                                                accept="image/jpeg,image/png,image/gif,image/webp"
                                                onChange={handleImageChange}
                                            />
                                        </label>
                                        {form.errors.image && <p className="mt-1 text-xs text-red-500">{form.errors.image}</p>}
                                        <p className="text-center text-xs text-muted-foreground">
                                            Formatos permitidos: JPG, PNG, GIF, WebP. Tamaño máximo: 2MB
                                        </p>
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full rounded-md bg-primary px-4 py-2 font-semibold text-white hover:bg-primary/90 disabled:opacity-60 dark:text-black"
                                        disabled={isUploading || !form.data.image}
                                    >
                                        {isUploading ? 'Cambiando...' : 'Cambiar imagen por defecto'}
                                    </button>
                                    {/* Los toasts ahora se muestran con react-hot-toast */}
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
