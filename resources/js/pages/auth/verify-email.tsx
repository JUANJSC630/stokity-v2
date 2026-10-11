import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import AuthLayout from '@/layouts/auth-layout';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <AuthLayout description="Verifica tu correo haciendo clic en el enlace que acabamos de enviarte.">
            <Head title="Verificar correo" />

            {status === 'verification-link-sent' && (
                <div className="mb-5 rounded-xl bg-green-50 p-3 text-center text-sm font-medium text-green-600">
                    Enviamos un nuevo enlace de verificación al correo con el que te registraste.
                </div>
            )}

            <form onSubmit={submit} className="flex flex-col gap-4">
                <div className="welcome-animate welcome-d5">
                    <button type="submit" className="btn-auth group" disabled={processing}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Reenviar correo de verificación
                        {!processing && <ArrowRight className="btn-arrow h-4 w-4" />}
                    </button>
                </div>

                <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    className="welcome-animate welcome-d6 mx-auto -my-3 inline-block py-3 text-sm font-medium transition-colors duration-200 hover:text-[var(--brand-primary)]"
                    style={{ color: 'var(--brand-primary)' }}
                >
                    Cerrar sesión
                </Link>
            </form>
        </AuthLayout>
    );
}
