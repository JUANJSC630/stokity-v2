import { BranchForm } from '@/components/branches/branch-form';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type User } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

interface CreateBranchProps {
    managers: User[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Sucursales',
        href: '/branches',
    },
    {
        title: 'Nueva Sucursal',
        href: '/branches/create',
    },
];

export default function CreateBranch({ managers = [] }: CreateBranchProps) {
    const { data, setData, post, processing, errors } = useForm<{
        name: string;
        address: string;
        phone: string;
        email: string;
        status: boolean;
        manager_id: string;
    }>({
        name: '',
        address: '',
        phone: '',
        email: '',
        status: true,
        manager_id: 'none',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('branches.store'), { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nueva Sucursal" />
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex items-start gap-3">
                    <Link
                        href="/branches"
                        aria-label="Volver"
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Nueva Sucursal</h1>
                        <p className="text-sm text-muted-foreground">Registra un punto de venta nuevo con su contacto y quién lo dirige.</p>
                    </div>
                </div>

                <BranchForm
                    mode="create"
                    data={data}
                    errors={errors}
                    setData={setData}
                    processing={processing}
                    managers={managers}
                    submitLabel={processing ? 'Creando...' : 'Crear sucursal'}
                    cancelHref="/branches"
                    onSubmit={handleSubmit}
                />
            </div>
        </AppLayout>
    );
}
