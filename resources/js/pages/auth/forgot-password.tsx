import InputError from '@/components/input-error';
import AuthLayout from '@/layouts/auth-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, LoaderCircle, Mail } from 'lucide-react';
import { FormEventHandler } from 'react';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm<Required<{ email: string }>>({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <AuthLayout description="Ingresa tu correo para recibir el enlace de restablecimiento">
            <Head title="Recuperar contraseña" />

            {status && (
                <div className="mb-5 rounded-xl bg-green-50 p-3 text-center text-sm font-medium text-green-600">{status}</div>
            )}

            <form className="flex flex-col gap-4" onSubmit={submit}>
                {/* ── Email ──────────────────────────────────────────────── */}
                <div className="welcome-animate welcome-d5 flex flex-col gap-2">
                    <label htmlFor="email" className="text-sm font-medium" style={{ color: 'oklch(0.28 0.02 30)' }}>
                        Correo electrónico
                    </label>
                    <div className="auth-input-wrapper">
                        <Mail className="auth-input-icon" />
                        <input
                            id="email"
                            type="email"
                            name="email"
                            className="auth-input"
                            placeholder="tu@correo.com"
                            required
                            autoFocus
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                    </div>
                    <InputError message={errors.email} />
                </div>

                {/* ── Submit ─────────────────────────────────────────────── */}
                <div className="welcome-animate welcome-d6 mt-1">
                    <button type="submit" className="btn-auth group" disabled={processing}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Enviar enlace de restablecimiento
                        {!processing && <ArrowRight className="btn-arrow h-4 w-4" />}
                    </button>
                </div>
            </form>

            {/* ── Back to login ──────────────────────────────────────────── */}
            <p className="welcome-animate welcome-d7 mt-6 text-center text-sm" style={{ color: 'oklch(0.52 0.02 30)' }}>
                ¿Ya tienes cuenta?{' '}
                <Link
                    href={route('login')}
                    className="font-medium transition-colors duration-200 hover:text-[var(--brand-primary)]"
                    style={{ color: 'var(--brand-primary)' }}
                >
                    Iniciar sesión
                </Link>
            </p>
        </AuthLayout>
    );
}
