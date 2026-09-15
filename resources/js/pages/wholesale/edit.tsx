import WholesaleOrderForm, { type WholesaleFormValues } from '@/components/wholesale/WholesaleOrderForm';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem, type Client, type WholesaleSale } from '@/types';
import { Head } from '@inertiajs/react';

interface Props {
    wholesaleSale: WholesaleSale;
    clients: Client[];
    branches: Branch[];
}

export default function WholesaleEdit({ wholesaleSale, clients, branches }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inicio', href: '/dashboard' },
        { title: 'Mayorista', href: '/wholesale' },
        { title: wholesaleSale.code, href: `/wholesale/${wholesaleSale.id}` },
        { title: 'Editar', href: `/wholesale/${wholesaleSale.id}/edit` },
    ];

    const initialValues: WholesaleFormValues = {
        branch_id: String(wholesaleSale.branch_id),
        client_id: String(wholesaleSale.client_id),
        payment_method: wholesaleSale.payment_method,
        date: wholesaleSale.date.slice(0, 10),
        notes: wholesaleSale.notes ?? '',
        estimated_cost: wholesaleSale.estimated_cost ?? 0,
        items: wholesaleSale.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: Number(item.unit_price),
        })),
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar pedido ${wholesaleSale.code}`} />
            <div className="mx-auto w-full max-w-3xl space-y-6 p-4 lg:p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Editar pedido {wholesaleSale.code}</h1>
                    <p className="text-sm text-muted-foreground">Corrige las líneas, cliente o método de pago del pedido</p>
                </div>

                <WholesaleOrderForm
                    clients={clients}
                    branches={branches}
                    initialValues={initialValues}
                    submitUrl={route('wholesale.update', wholesaleSale.id)}
                    submitMethod="put"
                    submitLabel="Guardar cambios"
                />
            </div>
        </AppLayout>
    );
}
