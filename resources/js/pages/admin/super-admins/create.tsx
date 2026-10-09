import { BACK_BUTTON, INPUT, PRIMARY_BUTTON } from '@/components/admin/styles';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronLeft, Save } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Super Admins', href: '/admin/super-admins' },
    { title: 'Nuevo', href: '/admin/super-admins/create' },
];

export default function SuperAdminCreate() {
    const form = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/super-admins');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo Super Admin" />
            <div className="flex flex-col gap-5 p-4 sm:p-6">
                <div className="flex items-start gap-3">
                    <Link href="/admin/super-admins" aria-label="Volver a super admins" className={BACK_BUTTON}>
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-xl leading-tight font-bold">Nuevo super admin</h1>
                        <p className="text-xs text-muted-foreground">Tendrá acceso total a la plataforma — todos los negocios.</p>
                    </div>
                </div>

                <form onSubmit={submit} className="w-full space-y-4 rounded-2xl border border-border/60 bg-card px-4 py-5 sm:max-w-md sm:px-6">
                    <div className="space-y-1.5">
                        <label htmlFor="name" className="text-xs font-medium">
                            Nombre
                        </label>
                        <input
                            id="name"
                            autoComplete="off"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            className={INPUT}
                        />
                        {form.errors.name && <p className="text-xs text-red-500">{form.errors.name}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="email" className="text-xs font-medium">
                            Correo
                        </label>
                        <input
                            id="email"
                            type="email"
                            inputMode="email"
                            autoComplete="off"
                            autoCapitalize="none"
                            value={form.data.email}
                            onChange={(e) => form.setData('email', e.target.value)}
                            className={INPUT}
                        />
                        {form.errors.email && <p className="text-xs text-red-500">{form.errors.email}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="password" className="text-xs font-medium">
                            Contraseña
                        </label>
                        <input
                            id="password"
                            type="password"
                            autoComplete="new-password"
                            value={form.data.password}
                            onChange={(e) => form.setData('password', e.target.value)}
                            className={INPUT}
                        />
                        {form.errors.password && <p className="text-xs text-red-500">{form.errors.password}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="password_confirmation" className="text-xs font-medium">
                            Confirmar contraseña
                        </label>
                        <input
                            id="password_confirmation"
                            type="password"
                            autoComplete="new-password"
                            value={form.data.password_confirmation}
                            onChange={(e) => form.setData('password_confirmation', e.target.value)}
                            className={INPUT}
                        />
                    </div>
                    <div className="flex pt-2 sm:justify-end">
                        <button
                            type="submit"
                            disabled={form.processing}
                            className={`${PRIMARY_BUTTON} flex w-full items-center justify-center gap-1.5 sm:w-auto`}
                        >
                            <Save className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            {form.processing ? 'Creando...' : 'Crear super admin'}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
