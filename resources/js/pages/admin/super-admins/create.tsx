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
            <div className="flex flex-col gap-5 p-6">
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/super-admins"
                        aria-label="Volver a super admins"
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="text-xl leading-tight font-bold">Nuevo super admin</h1>
                        <p className="text-xs text-muted-foreground">Tendrá acceso total a la plataforma — todos los negocios.</p>
                    </div>
                </div>

                <form onSubmit={submit} className="max-w-md space-y-4 rounded-2xl border border-border/60 bg-card px-6 py-5">
                    <div className="space-y-1.5">
                        <label htmlFor="name" className="text-xs font-medium">
                            Nombre
                        </label>
                        <input
                            id="name"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
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
                            value={form.data.email}
                            onChange={(e) => form.setData('email', e.target.value)}
                            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
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
                            value={form.data.password}
                            onChange={(e) => form.setData('password', e.target.value)}
                            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
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
                            value={form.data.password_confirmation}
                            onChange={(e) => form.setData('password_confirmation', e.target.value)}
                            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
                        />
                    </div>
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
                        >
                            <Save className="h-3.5 w-3.5" />
                            {form.processing ? 'Creando...' : 'Crear super admin'}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
