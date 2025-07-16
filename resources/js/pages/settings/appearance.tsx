import { Head, router, useForm } from '@inertiajs/react';
import React, { useState } from 'react';

import AppearanceTabs from '@/components/appearance-tabs';
import HeadingSmall from '@/components/heading-small';
import { type BreadcrumbItem } from '@/types';

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
    // Detectar si existe la imagen por defecto
    const defaultImageUrl = window.location.origin + '/uploads/default-product.png';
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [defaultImageExists, setDefaultImageExists] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState(false);
    // Eliminamos los estados de toast personalizados

    const form = useForm({
        image: null as File | null,
    });

    // Verificar si la imagen por defecto existe en el servidor
    React.useEffect(() => {
        fetch(defaultImageUrl, { method: 'HEAD' })
            .then((res) => setDefaultImageExists(res.ok))
            .catch(() => {
                setDefaultImageExists(false);
                toast.error('No existe una imagen por defecto actual.');
            });
    }, [defaultImageUrl]);

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
                router.visit(route('appearance'), { replace: true });
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

                    <div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Imagen por defecto de productos</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="group relative aspect-square w-full max-w-[160px] overflow-hidden rounded-md border-2 border-sidebar-border bg-muted transition-all duration-200 hover:border-primary">
                                            {imagePreview ? (
                                                <img src={imagePreview} alt="Vista previa" className="h-full w-full object-cover" />
                                            ) : defaultImageExists ? (
                                                <img src={defaultImageUrl} alt="Imagen por defecto actual" className="h-full w-full object-cover" />
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
                                            <input id="image" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                                        </label>
                                        {form.errors.image && <p className="mt-1 text-xs text-red-500">{form.errors.image}</p>}
                                        <p className="text-center text-xs text-muted-foreground">
                                            Formatos permitidos: JPG, PNG, GIF. Tamaño máximo: 2MB
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
