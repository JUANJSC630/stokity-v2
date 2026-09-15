import WholesaleOrderForm, { type WholesaleFormValues } from '@/components/wholesale/WholesaleOrderForm';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem, type Client } from '@/types';
import { Head } from '@inertiajs/react';

interface Props {
    clients: Client[];
    branches: Branch[];
    branchId: number | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Mayorista', href: '/wholesale' },
    { title: 'Nuevo pedido', href: '/wholesale/create' },
];

export default function WholesaleCreate({ clients, branches, branchId }: Props) {
    const defaultBranchId = branchId ? String(branchId) : branches[0] ? String(branches[0].id) : '';

    const initialValues: WholesaleFormValues = {
        branch_id: defaultBranchId,
        client_id: clients[0] ? String(clients[0].id) : '',
        payment_method: '',
        date: new Date().toLocaleString('sv-SE', { timeZone: 'America/Bogota' }).slice(0, 10),
        notes: '',
        estimated_cost: 0,
        items: [{ description: '', quantity: 1, unit_price: 0 }],
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo pedido mayorista" />
            <div className="mx-auto w-full max-w-3xl space-y-6 p-4 lg:p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Nuevo pedido mayorista</h1>
                    <p className="text-sm text-muted-foreground">Registra un pedido custom, fuera del catálogo e inventario normal</p>
                </div>

                <WholesaleOrderForm
                    clients={clients}
                    branches={branches}
                    initialValues={initialValues}
                    submitUrl={route('wholesale.store')}
                    submitMethod="post"
                    submitLabel="Guardar pedido"
                />
            </div>
        </AppLayout>
    );
}
