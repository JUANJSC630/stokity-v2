import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronLeft, LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Negocios', href: '/admin/tenants' },
    { title: 'Nuevo', href: '/admin/tenants/create' },
];

export default function TenantsCreate() {
    const { data, setData, post, processing, errors } = useForm({
        business_name: '',
        branch_name: '',
        admin_name: '',
        admin_email: '',
        admin_password: '',
        admin_password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/admin/tenants');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo negocio" />
            <div className="flex flex-col gap-5 p-6">
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/tenants"
                        aria-label="Volver a negocios"
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="text-xl leading-tight font-bold">Crear negocio</h1>
                        <p className="text-xs text-muted-foreground">
                            Se crea con su administrador, una sucursal inicial, métodos de pago y el cliente «Consumidor Final».
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="max-w-2xl">
                    <div className="rounded-2xl border border-border/60 bg-card px-6 py-5">
                        <p className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Negocio</p>
                        <div className="grid gap-4">
                            <div className="space-y-1.5">
                                <label htmlFor="business_name" className="text-xs font-medium">
                                    Nombre del negocio
                                </label>
                                <input
                                    id="business_name"
                                    autoFocus
                                    value={data.business_name}
                                    onChange={(e) => setData('business_name', e.target.value)}
                                    className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
                                />
                                {errors.business_name && <p className="text-xs text-red-500">{errors.business_name}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="branch_name" className="text-xs font-medium">
                                    Sucursal inicial (opcional)
                                </label>
                                <input
                                    id="branch_name"
                                    placeholder="Principal"
                                    value={data.branch_name}
                                    onChange={(e) => setData('branch_name', e.target.value)}
                                    className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
                                />
                                {errors.branch_name && <p className="text-xs text-red-500">{errors.branch_name}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-border/60 bg-card px-6 py-5">
                        <p className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Administrador del negocio</p>
                        <div className="grid gap-4">
                            <div className="space-y-1.5">
                                <label htmlFor="admin_name" className="text-xs font-medium">
                                    Nombre
                                </label>
                                <input
                                    id="admin_name"
                                    value={data.admin_name}
                                    onChange={(e) => setData('admin_name', e.target.value)}
                                    className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
                                />
                                {errors.admin_name && <p className="text-xs text-red-500">{errors.admin_name}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="admin_email" className="text-xs font-medium">
                                    Email
                                </label>
                                <input
                                    id="admin_email"
                                    type="email"
                                    value={data.admin_email}
                                    onChange={(e) => setData('admin_email', e.target.value)}
                                    className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
                                />
                                {errors.admin_email && <p className="text-xs text-red-500">{errors.admin_email}</p>}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label htmlFor="admin_password" className="text-xs font-medium">
                                        Contraseña
                                    </label>
                                    <input
                                        id="admin_password"
                                        type="password"
                                        value={data.admin_password}
                                        onChange={(e) => setData('admin_password', e.target.value)}
                                        className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
                                    />
                                    {errors.admin_password && <p className="text-xs text-red-500">{errors.admin_password}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="admin_password_confirmation" className="text-xs font-medium">
                                        Confirmar contraseña
                                    </label>
                                    <input
                                        id="admin_password_confirmation"
                                        type="password"
                                        value={data.admin_password_confirmation}
                                        onChange={(e) => setData('admin_password_confirmation', e.target.value)}
                                        className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
                        >
                            {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            Crear negocio
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
