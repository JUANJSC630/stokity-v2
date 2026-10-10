import InputError from '@/components/input-error';
import { INPUT_CLASS } from '@/components/sales/form-fields';
import { BrandSubmit, SaveBar, SettingsSection } from '@/components/settings/settings-section';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Configuración de contraseña',
        href: '/settings/password',
    },
];

export default function Password() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Configuración de contraseña" />

            <SettingsLayout>
                <SettingsSection
                    title="Actualizar contraseña"
                    description="Asegúrate de que tu cuenta use una contraseña larga y aleatoria para mantenerla segura"
                >
                    <form onSubmit={updatePassword} className="flex flex-col gap-5">
                        <div className="space-y-1.5">
                            <label htmlFor="current_password" className="text-xs font-medium">
                                Contraseña actual
                            </label>
                            <input
                                id="current_password"
                                ref={currentPasswordInput}
                                value={data.current_password}
                                onChange={(e) => setData('current_password', e.target.value)}
                                type="password"
                                className={INPUT_CLASS}
                                autoComplete="current-password"
                                placeholder="Contraseña actual"
                            />
                            <InputError message={errors.current_password} />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="password" className="text-xs font-medium">
                                Nueva contraseña
                            </label>
                            <input
                                id="password"
                                ref={passwordInput}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                type="password"
                                className={INPUT_CLASS}
                                autoComplete="new-password"
                                placeholder="Nueva contraseña"
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="password_confirmation" className="text-xs font-medium">
                                Confirmar contraseña
                            </label>
                            <input
                                id="password_confirmation"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                type="password"
                                className={INPUT_CLASS}
                                autoComplete="new-password"
                                placeholder="Confirmar contraseña"
                            />
                            <InputError message={errors.password_confirmation} />
                        </div>

                        <SaveBar
                            saved={
                                <Transition
                                    show={recentlySuccessful}
                                    enter="transition ease-in-out"
                                    enterFrom="opacity-0"
                                    leave="transition ease-in-out"
                                    leaveTo="opacity-0"
                                >
                                    <p className="text-sm text-muted-foreground">Guardado</p>
                                </Transition>
                            }
                        >
                            <BrandSubmit disabled={processing}>Guardar contraseña</BrandSubmit>
                        </SaveBar>
                    </form>
                </SettingsSection>
            </SettingsLayout>
        </AppLayout>
    );
}
