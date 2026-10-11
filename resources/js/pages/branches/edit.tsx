import { BranchForm } from '@/components/branches/branch-form';
import { useScrollToError } from '@/hooks/use-scroll-to-error';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem, type User } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

interface EditBranchProps {
    branch: Branch;
    managers: User[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Sucursales',
        href: '/branches',
    },
    {
        title: 'Editar Sucursal',
        href: '#',
    },
];

export default function EditBranch({ branch, managers = [] }: EditBranchProps) {
    const { data, setData, put, processing, errors } = useForm({
        name: branch.name || '',
        address: branch.address || '',
        phone: branch.phone || '',
        email: branch.email || '',
        business_name: branch.business_name || '',
        status: branch.status,
        manager_id: branch.manager_id ? branch.manager_id.toString() : 'none',
    });

    useScrollToError(errors);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('branches.update', branch.id), { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar Sucursal - ${branch.name}`} />
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
                        <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">Editar Sucursal: {branch.name}</h1>
                        <p className="text-sm text-muted-foreground">Cambia sus datos de contacto, quién la dirige o si sigue activa.</p>
                    </div>
                </div>

                <BranchForm
                    mode="edit"
                    data={data}
                    errors={errors}
                    setData={setData}
                    processing={processing}
                    managers={managers}
                    submitLabel={processing ? 'Guardando...' : 'Guardar cambios'}
                    cancelHref="/branches"
                    onSubmit={handleSubmit}
                />
            </div>
        </AppLayout>
    );
}
