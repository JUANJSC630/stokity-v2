import { Field } from '@/components/admin/field';
import { BACK_BUTTON, PRIMARY_BUTTON } from '@/components/admin/styles';
import { useDesktopAutofocus } from '@/hooks/use-desktop-autofocus';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronLeft, LoaderCircle } from 'lucide-react';
import { FormEventHandler, useRef } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Negocios', href: '/admin/tenants' },
    { title: 'Nuevo', href: '/admin/tenants/create' },
];

const CARD = 'rounded-2xl border border-border/60 bg-card px-4 py-5 sm:px-6';

export default function TenantsCreate() {
    const nameInput = useRef<HTMLInputElement>(null);
    useDesktopAutofocus(nameInput);

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
            <div className="flex flex-col gap-5 p-4 sm:p-6">
                <div className="flex items-start gap-3">
                    <Link href="/admin/tenants" aria-label="Volver a negocios" className={BACK_BUTTON}>
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-xl leading-tight font-bold">Crear negocio</h1>
                        <p className="text-xs text-muted-foreground">
                            Se crea con su administrador, una sucursal inicial, métodos de pago y el cliente «Consumidor Final».
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="flex w-full flex-col gap-4 md:max-w-2xl">
                    <div className={CARD}>
                        <p className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Negocio</p>
                        <div className="grid gap-4">
                            <Field
                                id="business_name"
                                label="Nombre del negocio"
                                ref={nameInput}
                                value={data.business_name}
                                onChange={(e) => setData('business_name', e.target.value)}
                                error={errors.business_name}
                                autoComplete="off"
                            />
                            <Field
                                id="branch_name"
                                label="Sucursal inicial (opcional)"
                                placeholder="Principal"
                                value={data.branch_name}
                                onChange={(e) => setData('branch_name', e.target.value)}
                                error={errors.branch_name}
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    <div className={CARD}>
                        <p className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Administrador del negocio</p>
                        <div className="grid gap-4">
                            <Field
                                id="admin_name"
                                label="Nombre"
                                value={data.admin_name}
                                onChange={(e) => setData('admin_name', e.target.value)}
                                error={errors.admin_name}
                                autoComplete="off"
                            />
                            <Field
                                id="admin_email"
                                label="Email"
                                type="email"
                                inputMode="email"
                                autoCapitalize="none"
                                autoComplete="off"
                                value={data.admin_email}
                                onChange={(e) => setData('admin_email', e.target.value)}
                                error={errors.admin_email}
                            />
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    id="admin_password"
                                    label="Contraseña"
                                    type="password"
                                    autoComplete="new-password"
                                    value={data.admin_password}
                                    onChange={(e) => setData('admin_password', e.target.value)}
                                    error={errors.admin_password}
                                />
                                <Field
                                    id="admin_password_confirmation"
                                    label="Confirmar contraseña"
                                    type="password"
                                    autoComplete="new-password"
                                    value={data.admin_password_confirmation}
                                    onChange={(e) => setData('admin_password_confirmation', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex sm:justify-end">
                        <button
                            type="submit"
                            disabled={processing}
                            className={`${PRIMARY_BUTTON} flex w-full items-center justify-center gap-1.5 sm:w-auto`}
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
