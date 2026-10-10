import { PaymentMethodForm } from '@/components/payment-methods/payment-method-form';
import { useScrollToError } from '@/hooks/use-scroll-to-error';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

interface PaymentMethod {
    id: number;
    name: string;
    code: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

interface Props {
    paymentMethod: PaymentMethod;
}

export default function PaymentMethodsEdit({ paymentMethod }: Props) {
    const form = useForm({
        name: paymentMethod.name,
        code: paymentMethod.code,
        description: paymentMethod.description || '',
        is_active: paymentMethod.is_active,
        sort_order: paymentMethod.sort_order,
    });

    const breadcrumbs = [
        { title: 'Inicio', href: '/dashboard' },
        { title: 'Métodos de Pago', href: '/payment-methods' },
        { title: 'Editar Método de Pago', href: `/payment-methods/${paymentMethod.id}/edit` },
    ];

    useScrollToError(form.errors);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.put(`/payment-methods/${paymentMethod.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Método de Pago" />

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
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Editar Método de Pago</h1>
                        <p className="text-sm text-muted-foreground">Cambia cómo se llama, su código y si se ofrece al cobrar</p>
                    </div>
                </div>

                <PaymentMethodForm
                    data={form.data}
                    errors={form.errors}
                    setData={form.setData}
                    processing={form.processing}
                    submitLabel={form.processing ? 'Guardando...' : 'Guardar Cambios'}
                    cancelHref="/payment-methods"
                    onSubmit={handleSubmit}
                />
            </div>
        </AppLayout>
    );
}
