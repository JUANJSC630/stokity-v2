import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { UserCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import { ImageUpload } from '@/components/image-upload';
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

    // Usar useForm de Inertia con datos iniciales, siguiendo el patrón de edición de usuarios
    const form = useForm({
        name: auth.user.name,
        email: auth.user.email,
        photo: null as File | null,
        _method: 'PATCH', // Método spoofing para PATCH
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.post(route('profile.update'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => form.setData('photo', null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Configuración de perfil" />
            <SettingsLayout>
                <SettingsSection title="Información de perfil" description="Actualiza tu nombre, correo y foto de perfil">
                    <ImageUpload
                        id="photo"
                        label="Foto de perfil"
                        shape="circle"
                        placeholderIcon={UserCircle}
                        file={form.data.photo}
                        currentUrl={auth.user.photo_url || null}
                        error={form.errors.photo}
                        onChange={(file) => {
                            form.clearErrors('photo');
                            form.setData('photo', file);
                        }}
                        className="pb-6"
                    />

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
