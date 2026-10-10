import { Head, useForm } from '@inertiajs/react';
import { ArrowRight, Eye, EyeOff, LoaderCircle, Lock } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import InputError from '@/components/input-error';
import AuthLayout from '@/layouts/auth-layout';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm<Required<{ password: string }>>({
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthLayout description="Esta es un área segura. Confirma tu contraseña antes de continuar.">
            <Head title="Confirmar contraseña" />

            <form className="flex flex-col gap-4" onSubmit={submit}>
                <div className="welcome-animate welcome-d5 flex flex-col gap-2">
                    <label htmlFor="password" className="text-sm font-medium" style={{ color: 'oklch(0.28 0.02 30)' }}>
                        Contraseña
                    </label>
                    <div className="auth-input-wrapper">
                        <Lock className="auth-input-icon" />
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            className="auth-input has-toggle"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            autoFocus
                            required
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

                <div className="welcome-animate welcome-d6 mt-1">
                    <button type="submit" className="btn-auth group" disabled={processing}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Confirmar contraseña
                        {!processing && <ArrowRight className="btn-arrow h-4 w-4" />}
                    </button>
                </div>
            </form>
        </AuthLayout>
    );
}
