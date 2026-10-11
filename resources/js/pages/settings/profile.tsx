import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import { prepareImageForUpload } from '@/lib/image-upload';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Camera } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

import InputError from '@/components/input-error';
import { INPUT_CLASS } from '@/components/sales/form-fields';
import { BrandSubmit, SaveBar, SettingsSection } from '@/components/settings/settings-section';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Configuración de perfil',
        href: '/settings/profile',
    },
];

// Definición de tipos removida ya que ahora usamos useForm con tipo inferido

export default function Profile({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
    const { auth } = usePage<SharedData>().props;
    const onBrand = useOnBrandColor();

    // Usar useForm de Inertia con datos iniciales, siguiendo el patrón de edición de usuarios
    const form = useForm({
        name: auth.user.name,
        email: auth.user.email,
        photo: null as File | null,
        _method: 'PATCH', // Método spoofing para PATCH
    });

    // Avatar state
    const [imagePreview, setImagePreview] = useState<string | null>(auth.user.photo_url || null);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = e.target.files?.[0] || null;
        if (picked) {
            const file = await prepareImageForUpload(picked);
            // Limpiar error previo
            form.clearErrors('photo');

            // Validar tamaño antes de continuar
            if (file.size > 4 * 1024 * 1024) {
                // 2MB en bytes
                form.setError('photo', 'El archivo no debe pesar más de 2MB');
            }

            form.setData('photo', file);

            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    // Función para formatear el tamaño del archivo
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        // Validación previa de tamaño de imagen
        if (form.data.photo && form.data.photo.size > 4 * 1024 * 1024) {
            // 2MB en bytes
            // Mostrar error de tamaño manualmente
            form.setError('photo', 'El archivo no debe pesar más de 2MB');
            return;
        }

        // Usar el método post de Inertia con forceFormData para subir archivos
        form.post(route('profile.update'), {
            forceFormData: true, // Forzar el uso de FormData para manejar archivos correctamente
            preserveScroll: true,
            onSuccess: () => {
                // Limpiar la referencia de la foto tras éxito
                form.setData('photo', null);
            },
            onError: (errors) => {
                console.error('Errores al actualizar perfil:', errors);
                // No es necesario hacer nada más aquí, Inertia ya actualiza los errores automáticamente
            },
        });
    };

    useEffect(() => {
        if (form.recentlySuccessful) {
            // Solo limpiar si había una foto seleccionada
            if (form.data.photo) {
                form.setData('photo', null);
            }
            // Actualizar la previsualización solo si la foto cambió
            const currentTime = new Date().getTime();
            const userPhotoUrl = auth.user.photo_url || '';
            const photoUrl = userPhotoUrl.includes('?') ? userPhotoUrl.split('?')[0] + '?t=' + currentTime : userPhotoUrl + '?t=' + currentTime;
            setImagePreview(photoUrl);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.recentlySuccessful]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Configuración de perfil" />
            <SettingsLayout>
                <SettingsSection title="Información de perfil" description="Actualiza tu nombre, correo y foto de perfil">
                    <div className="flex flex-col items-center gap-3 pb-6">
                        <div className="relative">
                            <img
                                src={imagePreview || '/stokity-icon.png'}
                                alt={form.data.name}
                                className={`size-28 rounded-full border-2 object-cover ${form.errors.photo ? 'border-red-500' : 'border-border/60'} bg-muted`}
                            />
                            <label
                                htmlFor="photo"
                                className="absolute right-0 bottom-0 flex size-11 cursor-pointer items-center justify-center rounded-full border-2 border-background bg-[var(--brand-primary)] shadow-lg transition-opacity hover:opacity-90"
                                style={{ color: onBrand.hex }}
                            >
                                <Camera className="size-5" aria-hidden="true" />
                                <span className="sr-only">Cambiar foto</span>
                                <input id="photo" type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
                            </label>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-muted-foreground">JPG, PNG, GIF, WebP. Máx 4MB</span>
                            {form.data.photo && (
                                <span className={`text-xs font-medium ${form.errors.photo ? 'text-red-500' : 'text-green-600'}`}>
                                    {formatFileSize(form.data.photo.size)}
                                </span>
                            )}
                            {form.errors.photo && <span className="mt-1 text-xs font-medium text-red-500">{form.errors.photo}</span>}
                        </div>
                    </div>

                    <form onSubmit={submit} className="flex flex-col gap-5">
                        <div className="space-y-1.5">
                            <label htmlFor="name" className="text-xs font-medium">
                                Nombre
                            </label>
                            <input
                                id="name"
                                className={INPUT_CLASS}
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                required
                                autoComplete="name"
                                placeholder="Nombre completo"
                            />
                            <InputError message={form.errors.name} />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="email" className="text-xs font-medium">
                                Correo electrónico
                            </label>
                            <input
                                id="email"
                                type="email"
                                inputMode="email"
                                className={INPUT_CLASS}
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                                required
                                autoComplete="username"
                                placeholder="Correo electrónico"
                            />
                            <InputError message={form.errors.email} />
                        </div>
                        {mustVerifyEmail && auth.user.email_verified_at === null && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                                <p className="text-sm text-muted-foreground">
                                    Tu correo electrónico no está verificado.{' '}
                                    <Link
                                        href={route('verification.send')}
                                        method="post"
                                        as="button"
                                        className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                    >
                                        Haz clic aquí para reenviar el correo de verificación.
                                    </Link>
                                </p>
                                {status === 'verification-link-sent' && (
                                    <div className="mt-2 text-sm font-medium text-green-600">
                                        Se ha enviado un nuevo enlace de verificación a tu correo electrónico.
                                    </div>
                                )}
                            </div>
                        )}
                        <SaveBar
                            saved={
                                <Transition
                                    show={form.recentlySuccessful}
                                    enter="transition ease-in-out"
                                    enterFrom="opacity-0"
                                    leave="transition ease-in-out"
                                    leaveTo="opacity-0"
                                >
                                    <p className="text-sm text-muted-foreground">Guardado</p>
                                </Transition>
                            }
                        >
                            <BrandSubmit disabled={form.processing}>Guardar</BrandSubmit>
                        </SaveBar>
                    </form>
                </SettingsSection>
            </SettingsLayout>
        </AppLayout>
    );
}
