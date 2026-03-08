import InputError from '@/components/input-error';
import AuthLayout from '@/layouts/auth-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, Eye, EyeOff, LoaderCircle, Lock, Mail } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
};

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm<Required<LoginForm>>({
        email: '',
        password: '',
        remember: false,
    });

    const [showPassword, setShowPassword] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onError: () => reset('password'),
        });
    };

    return (
        <AuthLayout description="Ingresa al sistema para gestionar tu negocio" backHref={route('home')}>
            <Head title="Iniciar sesión" />

            {status && (
                <div className="mb-5 rounded-xl bg-red-50 p-3 text-center text-sm font-medium text-red-600">
                    {status}
                </div>
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
                            className="auth-input"
                            placeholder="tu@correo.com"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                    </div>
                    <InputError message={errors.email} />
                </div>

                {/* ── Password ───────────────────────────────────────────── */}
                <div className="welcome-animate welcome-d6 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <label htmlFor="password" className="text-sm font-medium" style={{ color: 'oklch(0.28 0.02 30)' }}>
                            Contraseña
                        </label>
                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="text-xs transition-colors duration-200 hover:text-[#C75B7A]"
                                style={{ color: 'oklch(0.52 0.02 30)' }}
                                tabIndex={5}
                            >
                                ¿Olvidaste tu contraseña?
                            </Link>
                        )}
                    </div>
                    <div className="auth-input-wrapper">
                        <Lock className="auth-input-icon" />
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            className="auth-input has-toggle"
                            placeholder="••••••••"
                            required
                            tabIndex={2}
                            autoComplete="current-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                        />
                        <button
                            type="button"
                            className="auth-toggle-btn"
                            tabIndex={-1}
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    <InputError message={errors.password} />
                </div>

                {/* ── Remember me ────────────────────────────────────────── */}
                <div className="welcome-animate welcome-d7 auth-checkbox-wrapper">
                    <input
                        id="remember"
                        type="checkbox"
                        className="auth-checkbox"
                        checked={data.remember}
                        onChange={(e) => setData('remember', e.target.checked)}
                        tabIndex={3}
                    />
                    <label
                        htmlFor="remember"
                        className="cursor-pointer select-none text-sm"
                        style={{ color: 'oklch(0.52 0.02 30)' }}
                    >
                        Recordarme
                    </label>
                </div>

                {/* ── Submit ─────────────────────────────────────────────── */}
                <div className="welcome-animate welcome-d7 mt-1">
                    <button type="submit" className="btn-auth group" tabIndex={4} disabled={processing}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Iniciar sesión
                        {!processing && <ArrowRight className="btn-arrow h-4 w-4" />}
                    </button>
                </div>
            </form>
        </AuthLayout>
    );
}
