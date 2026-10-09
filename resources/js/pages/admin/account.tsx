import { Field } from '@/components/admin/field';
import { PRIMARY_BUTTON } from '@/components/admin/styles';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler, useRef } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Mi cuenta', href: '/admin/account' }];

export default function AdminAccount() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put('/admin/account/password', {
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
            <Head title="Mi cuenta" />
            <div className="flex flex-col gap-5 p-4 sm:p-6">
                <div>
                    <h1 className="text-xl leading-tight font-bold">Mi cuenta</h1>
                    <p className="text-xs text-muted-foreground">
                        Usa una contraseña larga y aleatoria para mantener tu cuenta de plataforma segura.
                    </p>
                </div>

                <div className="w-full rounded-2xl border border-border/60 bg-card px-4 py-5 sm:px-6 md:max-w-xl">
                    <p className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Actualizar contraseña</p>
                    <form onSubmit={updatePassword} className="flex flex-col gap-4">
                        <Field
                            id="current_password"
                            label="Contraseña actual"
                            ref={currentPasswordInput}
                            type="password"
                            autoComplete="current-password"
                            value={data.current_password}
                            onChange={(e) => setData('current_password', e.target.value)}
                            error={errors.current_password}
                        />
                        <Field
                            id="password"
                            label="Nueva contraseña"
                            ref={passwordInput}
                            type="password"
                            autoComplete="new-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            error={errors.password}
                        />
                        <Field
                            id="password_confirmation"
                            label="Confirmar contraseña"
                            type="password"
                            autoComplete="new-password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            error={errors.password_confirmation}
                        />

                        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
                            <button
                                type="submit"
                                disabled={processing}
                                className={`${PRIMARY_BUTTON} flex w-full items-center justify-center gap-1.5 sm:w-auto`}
                            >
                                {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                Guardar contraseña
                            </button>
                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p role="status" className="text-center text-xs text-muted-foreground sm:text-left">
                                    Guardado
                                </p>
                            </Transition>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
