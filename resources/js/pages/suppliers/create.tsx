import { SupplierForm } from '@/components/suppliers/supplier-form';
import { useScrollToError } from '@/hooks/use-scroll-to-error';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

interface PageProps {
    branches: Branch[];
    userBranchId: number | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio', href: '/dashboard' },
    { title: 'Proveedores', href: '/suppliers' },
    { title: 'Crear Proveedor', href: '/suppliers/create' },
];

export default function Create({ branches, userBranchId }: PageProps) {
    const form = useForm<{
        branch_id: string;
        name: string;
        nit: string;
        contact_name: string;
        phone: string;
        email: string;
        address: string;
        notes: string;
        status: boolean;
    }>({
        branch_id: userBranchId ? String(userBranchId) : branches[0] ? String(branches[0].id) : '',
        name: '',
        nit: '',
        contact_name: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        status: true,
    });

    useScrollToError(form.errors);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('suppliers.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Proveedor" />
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex items-start gap-3">
                    <Link
                        href={route('suppliers.index')}
                        aria-label="Volver"
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Crear Nuevo Proveedor</h1>
                        <p className="text-sm text-muted-foreground">Registra a quién le compras para vincularlo a tus productos y movimientos.</p>
                    </div>
                </div>

                <SupplierForm
                    data={form.data}
                    errors={form.errors}
                    setData={form.setData}
                    processing={form.processing}
                    branches={branches}
                    submitLabel="Guardar Proveedor"
                    cancelHref={route('suppliers.index')}
                    onSubmit={handleSubmit}
                />
            </div>
        </AppLayout>
    );
}
