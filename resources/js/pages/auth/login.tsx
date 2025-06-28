import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
};

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm<Required<LoginForm>>({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthLayout title="Stokity" description="¡Ingresa al sistema para gestionar tu negocio!">
            <Head title="Iniciar sesión">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=poppins:400,500,600,700" rel="stylesheet" />
            </Head>

            {status && <div className="mb-4 rounded bg-red-100 dark:bg-red-900/30 p-3 text-center text-sm font-medium text-red-600 dark:text-red-400">{status}</div>}

            <form className="flex flex-col gap-4" onSubmit={submit}>
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <div className="flex items-center">
                            <Label htmlFor="email" className="dark:text-gray-200">Correo electrónico</Label>
                        </div>
                        <Input
                            id="email"
                            type="email"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <div className="flex items-center">
                            <Label htmlFor="password" className="dark:text-gray-200">Contraseña</Label>
                        </div>
                        <Input
                            id="password"
                            type="password"
                            required
                            tabIndex={2}
                            autoComplete="current-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="flex items-center space-x-3">
                        <Checkbox
                            id="remember"
                            name="remember"
                            checked={data.remember}
                            onClick={() => setData('remember', !data.remember)}
                            tabIndex={3}
                        />
                        <Label htmlFor="remember" className="dark:text-gray-200">Recordarme</Label>
                    </div>

                    <Button
                        type="submit"
                        className="mt-3 flex h-12 w-full items-center justify-center text-base rounded-xl font-medium text-white shadow-md transition-all duration-200"
                        tabIndex={4}
                        disabled={processing}
                        style={{
                            background: 'linear-gradient(90deg, #C850C0 0%, #FFCC70 100%)',
                            border: 'none',
                            boxShadow: '0 6px 18px 0 rgba(200, 80, 192, 0.2)',
                        }}
                    >
                        {processing ? <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> : null}
                        Iniciar sesión 🚀
                    </Button>
                </div>
            </form>
            {status && <div className="mb-4 text-center text-sm font-medium text-green-600 dark:text-green-400">{status}</div>}
        </AuthLayout>
    );
}
