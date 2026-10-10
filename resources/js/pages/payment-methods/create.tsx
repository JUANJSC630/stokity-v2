import { PaymentMethodForm } from '@/components/payment-methods/payment-method-form';
import { useScrollToError } from '@/hooks/use-scroll-to-error';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Métodos de Pago', href: '/payment-methods' },
    { title: 'Crear Método de Pago', href: '/payment-methods/create' },
];

export default function PaymentMethodsCreate() {
    const form = useForm({
        name: '',
        code: '',
        description: '',
        is_active: true as boolean,
        sort_order: 0,
    });

    useScrollToError(form.errors);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/payment-methods');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Método de Pago" />

            <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex items-start gap-3">
                    <Link
                        href="/payment-methods"
                        aria-label="Volver"
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Crear Método de Pago</h1>
                        <p className="text-sm text-muted-foreground">Configura un nuevo método de pago para el sistema</p>
                    </div>
                </div>

                <PaymentMethodForm
                    data={form.data}
                    errors={form.errors}
                    setData={form.setData}
                    processing={form.processing}
                    submitLabel={form.processing ? 'Creando...' : 'Crear Método de Pago'}
                    cancelHref="/payment-methods"
                    onSubmit={handleSubmit}
                />
            </div>
        </AppLayout>
    );
}
