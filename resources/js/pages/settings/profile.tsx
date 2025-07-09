import { useEffect, useState } from 'react';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { Camera } from 'lucide-react';

import DeleteUser from '@/components/delete-user';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profile settings',
        href: '/settings/profile',
    },
];

// Definición de tipos removida ya que ahora usamos useForm con tipo inferido

export default function Profile({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
    const { auth } = usePage<SharedData>().props;

    // Usar useForm de Inertia con datos iniciales, siguiendo el patrón de edición de usuarios
    const form = useForm({
        name: auth.user.name,
        email: auth.user.email,
        photo: null as File | null,
        _method: 'PATCH', // Método spoofing para PATCH
    });

    // Avatar state
    const [imagePreview, setImagePreview] = useState<string | null>(auth.user.photo_url || null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            // Limpiar error previo
            form.clearErrors('photo');
            
            // Validar tamaño antes de continuar
            if (file.size > 2 * 1024 * 1024) { // 2MB en bytes
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
        if (form.data.photo && form.data.photo.size > 2 * 1024 * 1024) { // 2MB en bytes
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
            const photoUrl = userPhotoUrl.includes('?')
                ? userPhotoUrl.split('?')[0] + '?t=' + currentTime
                : userPhotoUrl + '?t=' + currentTime;
            setImagePreview(photoUrl);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.recentlySuccessful]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />
            <SettingsLayout>
                <div className="space-y-8 max-w-lg mx-auto">
                    <HeadingSmall title="Profile information" description="Update your name, email and profile photo" />

                    {/* Avatar y cambio de imagen */}
                    <div className="flex flex-col items-center gap-3 pb-2">
                        <div className="relative">
                            <img
                                src={imagePreview || '/stokity-icon.png'}
                                alt={form.data.name}
                                className={`h-28 w-28 rounded-full object-cover border-2 ${form.errors.photo ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'} bg-muted shadow`}
                            />
                            <label htmlFor="photo" className="absolute bottom-1 right-1 flex items-center justify-center cursor-pointer rounded-full bg-primary p-2 text-white dark:text-black shadow-lg border-2 border-white dark:border-neutral-900 hover:bg-primary/90 transition-colors" style={{ width: 38, height: 38 }}>
                                <Camera className="h-5 w-5" />
                                <input id="photo" type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
                            </label>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-muted-foreground">JPG, PNG, GIF. Máx 2MB</span>
                            {form.data.photo && (
                                <span className={`text-xs font-medium ${form.errors.photo ? 'text-red-500' : 'text-green-600'}`}>
                                    {formatFileSize(form.data.photo.size)}
                                </span>
                            )}
                            {form.errors.photo && (
                                <span className="mt-1 text-xs font-medium text-red-500">{form.errors.photo}</span>
                            )}
                        </div>
                    </div>

                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                className="mt-1 block w-full"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                required
                                autoComplete="name"
                                placeholder="Full name"
                            />
                            <InputError className="mt-2" message={form.errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                className="mt-1 block w-full"
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                                required
                                autoComplete="username"
                                placeholder="Email address"
                            />
                            <InputError className="mt-2" message={form.errors.email} />
                        </div>
                        {mustVerifyEmail && auth.user.email_verified_at === null && (
                            <div>
                                <p className="-mt-4 text-sm text-muted-foreground">
                                    Your email address is unverified.{' '}
                                    <Link
                                        href={route('verification.send')}
                                        method="post"
                                        as="button"
                                        className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                    >
                                        Click here to resend the verification email.
                                    </Link>
                                </p>
                                {status === 'verification-link-sent' && (
                                    <div className="mt-2 text-sm font-medium text-green-600">
                                        A new verification link has been sent to your email address.
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex items-center gap-4">
                            <Button disabled={form.processing}>Save</Button>
                            <Transition
                                show={form.recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-sm text-neutral-600">Saved</p>
                            </Transition>
                        </div>
                    </form>
                </div>
                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}
