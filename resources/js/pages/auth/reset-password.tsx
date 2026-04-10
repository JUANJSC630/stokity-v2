import InputError from '@/components/input-error';
import AuthLayout from '@/layouts/auth-layout';
import { Head, useForm } from '@inertiajs/react';
import { ArrowRight, Eye, EyeOff, LoaderCircle, Lock, Mail } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface ResetPasswordProps {
    token: string;
    email: string;
}

type ResetPasswordForm = {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
};

export default function ResetPassword({ token, email }: ResetPasswordProps) {
    const { data, setData, post, processing, errors, reset } = useForm<Required<ResetPasswordForm>>({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthLayout description="Ingresa tu nueva contraseña para recuperar el acceso">
            <Head title="Restablecer contraseña" />

            <form className="flex flex-col gap-4" onSubmit={submit}>
                {/* ── Email (readonly) ───────────────────────────────────── */}
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
                            autoComplete="email"
                            value={data.email}
                            readOnly
                            onChange={(e) => setData('email', e.target.value)}
                        />
                    </div>
                    <InputError message={errors.email} />
                </div>

                {/* ── Nueva contraseña ───────────────────────────────────── */}
                <div className="welcome-animate welcome-d6 flex flex-col gap-2">
                    <label htmlFor="password" className="text-sm font-medium" style={{ color: 'oklch(0.28 0.02 30)' }}>
                        Nueva contraseña
                    </label>
                    <div className="auth-input-wrapper">
                        <Lock className="auth-input-icon" />
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            className="auth-input has-toggle"
                            placeholder="••••••••"
                            required
                            autoFocus
                            autoComplete="new-password"
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

                {/* ── Confirmar contraseña ───────────────────────────────── */}
                <div className="welcome-animate welcome-d7 flex flex-col gap-2">
                    <label htmlFor="password_confirmation" className="text-sm font-medium" style={{ color: 'oklch(0.28 0.02 30)' }}>
                        Confirmar contraseña
                    </label>
                    <div className="auth-input-wrapper">
                        <Lock className="auth-input-icon" />
                        <input
                            id="password_confirmation"
                            type={showConfirm ? 'text' : 'password'}
                            name="password_confirmation"
                            className="auth-input has-toggle"
                            placeholder="••••••••"
                            required
                            autoComplete="new-password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                        />
                        <button
                            type="button"
                            className="auth-toggle-btn"
                            tabIndex={-1}
                            onClick={() => setShowConfirm(!showConfirm)}
                            aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    <InputError message={errors.password_confirmation} />
                </div>

                {/* ── Submit ─────────────────────────────────────────────── */}
                <div className="welcome-animate welcome-d8 mt-1">
                    <button type="submit" className="btn-auth group" disabled={processing}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Restablecer contraseña
                        {!processing && <ArrowRight className="btn-arrow h-4 w-4" />}
                    </button>
                </div>
            </form>
        </AuthLayout>
    );
}
